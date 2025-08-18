<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OrderController extends Controller
{
    private function ensureOwnerById(int $orderId): void
    {
        $uid = Auth::id();
        abort_unless($uid, 401);

        // Light existence check with NO relationships
        $exists = Order::query()
            ->where('id', $orderId)
            ->where('user_id', $uid)
            ->exists();

        abort_unless($exists, 404);
    }

    // Inertia page: accept scalar param, not Order
    public function page(int $order)
    {
        $this->ensureOwnerById($order);
        // We only need the id for the SPA; do NOT hydrate the Order model here
        return Inertia::render('client/order/page', [
            'orderId' => (int) $order,
        ]);
    }

    // JSON API: accept scalar param, not Order
    public function show(int $order)
    {
        $this->ensureOwnerById($order);
        $row = DB::table('orders')->where('id', $order)->first();
        // 1) Order lines (compact)
        $lines = DB::table('order_items')
            ->select('id', 'part_id', 'quantity', 'unit_price', 'line_total')
            ->where('order_id', $row->id)
            ->orderBy('id')
            ->get();

        $items = [];
        $count = 0;

        if ($lines->isNotEmpty()) {
            $partIds = $lines->pluck('part_id')->unique()->values();

            // 2) Parts + manufacturer (only fields you need)
            $parts = DB::table('parts as p')
                ->leftJoin('manufacturers as m', 'm.id', '=', 'p.manufacturer_id')
                ->whereIn('p.id', $partIds)
                ->select('p.id', 'p.sku', 'p.name', 'p.images', 'm.id as manufacturer_id', 'm.name as manufacturer_name')
                ->get()
                ->keyBy('id');

            // 3) Fitments → models & brands
            $fit = DB::table('part_fitments as pf')
                ->join('vehicle_models as vm', 'vm.id', '=', 'pf.vehicle_model_id')
                ->leftJoin('vehicle_brands as vb', 'vb.id', '=', 'vm.vehicle_brand_id')
                ->whereIn('pf.part_id', $partIds)
                ->select('pf.part_id', 'vm.name as model', 'vb.name as brand')
                ->get();

            $modelsByPart = [];
            $brandsByPart = [];
            foreach ($fit as $r) {
                $pid = (int) $r->part_id;
                if (!isset($modelsByPart[$pid])) $modelsByPart[$pid] = [];
                if (!isset($brandsByPart[$pid])) $brandsByPart[$pid] = [];
                if ($r->model !== null) $modelsByPart[$pid][] = $r->model;
                if ($r->brand) $brandsByPart[$pid][$r->brand] = true;
            }

            // 4) Build items (no model hydration)
            foreach ($lines as $it) {
                $part = $parts->get($it->part_id);
                if (!$part) continue;

                // primary image from JSON (keep it light)
                $image = null;
                if (!empty($part->images)) {
                    $decoded = is_string($part->images) ? json_decode($part->images, true) : $part->images;
                    if (is_array($decoded) && !empty($decoded)) {
                        $first = $decoded[0];
                        $image = is_array($first) ? ($first['url'] ?? null) : $first;
                    }
                }

                $pid     = (int) $part->id;
                $models  = $modelsByPart[$pid] ?? [];
                $brands  = array_keys($brandsByPart[$pid] ?? []);
                $qty     = (int) $it->quantity;
                $count  += $qty;

                $items[] = [
                    'id'             => (int) $part->id,
                    'sku'            => $part->sku,
                    'name'           => $part->name,
                    'image'          => $image,
                    'manufacturer'   => $part->manufacturer_id ? ['id' => (int)$part->manufacturer_id, 'name' => $part->manufacturer_name] : null,
                    'fitment_models' => array_values($models),
                    'fitment_brands' => $brands,

                    'qty'        => $qty,
                    'unit_price' => (float) $it->unit_price,
                    'line_total' => (float) $it->line_total,
                ];
            }
        }

        $statusSteps  = ['cart', 'pending', 'confirmed', 'preparing', 'shipped', 'completed'];
        $statusIndex  = array_search($row->status, $statusSteps, true);
        if ($statusIndex === false) $statusIndex = 0;

        return response()->json([
            'id'              => $row->id,
            'status'          => $row->status,
            'status_steps'    => $statusSteps,
            'status_index'    => $statusIndex,
            'delivery_method' => $row->delivery_method,
            'ship_to'         => [
                'name'    => $row->ship_to_name,
                'phone'   => $row->ship_to_phone,
                'address' => $row->ship_to_address,
            ],
            'items'           => $items,
            'items_count'     => $count,
            'subtotal'        => (float) ($row->subtotal ?? 0),
            'discount_total'  => (float) ($row->discount_total ?? 0),
            'shipping_total'  => (float) ($row->shipping_total ?? 0),
            'tax_total'       => (float) ($row->tax_total ?? 0),
            'grand_total'     => (float) ($row->grand_total ?? 0),
            'created_at'      => optional($row->created_at)->toIso8601String(),
            'updated_at'      => optional($row->updated_at)->toIso8601String(),
        ]);
    }
}
