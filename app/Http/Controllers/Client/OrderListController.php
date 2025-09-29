<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OrderListController extends Controller
{
    public function page()
    {
        return Inertia::render('client/orders/page');
    }

    public function index(Request $req)
    {
        $uid = Auth::id();
        abort_unless($uid, 401);

        $perPage = max(1, min((int)($req->integer('per_page') ?: 12), 100));
        $page    = max(1, (int)($req->integer('page') ?: 1));
        $q       = trim((string)$req->get('q', ''));
        $status  = $req->get('status', 'all');              // all|cart|pending|confirmed|preparing|shipped|completed|canceled
        $method  = $req->get('delivery_method', 'all');     // all|pickup|courier|post
        $from    = $req->get('from');                       // YYYY-MM-DD
        $to      = $req->get('to');                         // YYYY-MM-DD
        $sortBy  = $req->get('sort_by', 'created_at');      // created_at|grand_total|status
        $sortDir = strtolower($req->get('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $sortWhitelist = ['created_at', 'grand_total', 'status'];
        if (!in_array($sortBy, $sortWhitelist, true)) $sortBy = 'created_at';

        // Subquery: brief items as JSON (sku, name, qty, unit_price, line_total)
        $briefSql = DB::table('order_items as oi')
            ->selectRaw("
                oi.order_id,
                json_agg(
                  json_build_object(
                    'sku', p.sku,
                    'name', p.name,
                    'qty', oi.quantity,
                    'unit_price', oi.unit_price,
                    'line_total', oi.line_total
                  )
                  ORDER BY oi.id
                ) AS items_brief
            ")
            ->join('parts as p', 'p.id', '=', 'oi.part_id')
            ->groupBy('oi.order_id');

        $base = DB::table('orders as o')
            ->leftJoinSub($briefSql, 'x', 'x.order_id', '=', 'o.id')
            ->selectRaw("
                o.id, o.user_id, o.status, o.delivery_method,
                o.subtotal, o.discount_total, o.shipping_total, o.tax_total, o.grand_total,
                o.created_at, o.updated_at,
                COALESCE(x.items_brief, '[]'::json) as items_brief,
                (SELECT COALESCE(SUM(quantity),0) FROM order_items oi WHERE oi.order_id = o.id) as items_count
            ")
            ->where('o.user_id', $uid)
            ->where('o.status', '!=', 'cart');   // 👈 always exclude carts

        // Filters
        if ($status !== 'all') {
            $base->where('o.status', $status);
        }
        if ($method !== 'all') {
            $base->where('o.delivery_method', $method);
        }
        if ($from) {
            $base->whereDate('o.created_at', '>=', $from);
        }
        if ($to) {
            $base->whereDate('o.created_at', '<=', $to);
        }
        if ($q !== '') {
            // note: match id, part name or SKU inside this user's orders
            $term = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
            $base->where(function ($w) use ($term) {
                $w->whereRaw('CAST(o.id AS TEXT) ILIKE ?', [$term])
                    ->orWhereExists(function ($s) use ($term) {
                        $s->select(DB::raw(1))
                            ->from('order_items as oi2')
                            ->join('parts as p2', 'p2.id', '=', 'oi2.part_id')
                            ->whereColumn('oi2.order_id', 'o.id')
                            ->where(function ($x) use ($term) {
                                $x->where('p2.name', 'ILIKE', $term)
                                    ->orWhere('p2.sku', 'ILIKE', $term);
                            });
                    });
            });
        }

        // Sorting
        $base->orderBy("o.$sortBy", $sortDir);

        $total = (clone $base)->count();
        $rows  = $base->forPage($page, $perPage)->get();

        // Cast JSON for items_brief
        $data = $rows->map(function ($r) {
            $r->items_brief = is_string($r->items_brief) ? json_decode($r->items_brief, true) : ($r->items_brief ?? []);
            return [
                'id'              => (int)$r->id,
                'status'          => $r->status,
                'delivery_method' => $r->delivery_method,
                'items_count'     => (int)$r->items_count,
                'subtotal'        => (float)$r->subtotal,
                'discount_total'  => (float)$r->discount_total,
                'shipping_total'  => (float)$r->shipping_total,
                'tax_total'       => (float)$r->tax_total,
                'grand_total'     => (float)$r->grand_total,
                'created_at'      => $r->created_at,
                'updated_at'      => $r->updated_at,
                // brief items (client may truncate)
                'items_brief'     => array_map(function ($it) {
                    return [
                        'sku'        => $it['sku'] ?? null,
                        'name'       => $it['name'] ?? null,
                        'qty'        => (int)($it['qty'] ?? 0),
                        'unit_price' => (float)($it['unit_price'] ?? 0),
                        'line_total' => (float)($it['line_total'] ?? 0),
                    ];
                }, $r->items_brief ?? []),
            ];
        });

        return response()->json([
            'data'     => $data,
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
        ]);
    }
}
