<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OrderController extends Controller
{

    public function page()
    {
        return Inertia::render('admin/orders/page', []);
    }

    public function showPage($orderId)
    {
        return Inertia::render('admin/order/page', ['orderId' => (int)$orderId]);
    }

    // GET /admin/order/api
    public function index(Request $request)
    {
        $validated = $request->validate([
            'page'            => 'nullable|integer|min:1',
            'per_page'        => 'nullable|integer|min:1|max:200',
            'q'               => 'nullable|string|max:200',
            'status'          => ['nullable', 'string', Rule::in(['all', 'cart', 'pending', 'confirmed', 'preparing', 'shipped', 'completed', 'canceled'])],
            'delivery_method' => ['nullable', 'string', Rule::in(['all', 'pickup', 'courier', 'post'])],
            'from'            => 'nullable|date',
            'to'              => 'nullable|date',
            'sort_by'         => ['nullable', 'string', Rule::in(['created_at', 'grand_total', 'status'])],
            'sort_dir'        => ['nullable', 'string', Rule::in(['asc', 'desc'])],
        ]);

        $page     = (int)($validated['page'] ?? 1);
        $perPage  = (int)($validated['per_page'] ?? 12);
        $q        = trim($validated['q'] ?? '');
        $status   = $validated['status'] ?? 'all';
        $method   = $validated['delivery_method'] ?? 'all';
        $from     = $validated['from'] ?? null;
        $to       = $validated['to'] ?? null;
        $sortBy   = $validated['sort_by'] ?? 'created_at';
        $sortDir  = $validated['sort_dir'] ?? 'desc';

        $query = Order::query()
            ->withCount('items as items_count')
            ->with(['user:id,name,email']); // 👈 add this

        // filters
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($method && $method !== 'all') {
            $query->where('delivery_method', $method);
        }

        if ($from) {
            $query->whereDate('created_at', '>=', Carbon::parse($from)->toDateString());
        }
        if ($to) {
            $query->whereDate('created_at', '<=', Carbon::parse($to)->toDateString());
        }

        // q: search by order id, SKU, part name, or reference code
        if ($q !== '') {
            $query->where(function ($w) use ($q) {
                $w->where('id', $q) // exact id
                    ->orWhere('ship_to_name', 'like', "%{$q}%")
                    ->orWhere('ship_to_phone', 'like', "%{$q}%")
                    ->orWhereExists(function ($sub) use ($q) {
                        $sub->from('order_items as oi')
                            ->join('parts as p', 'p.id', '=', 'oi.part_id')
                            ->whereColumn('oi.order_id', 'orders.id')
                            ->where(function ($x) use ($q) {
                                $x->where('p.sku', 'like', "%{$q}%")
                                    ->orWhere('p.name', 'like', "%{$q}%");
                            });
                    })
                    ->orWhereExists(function ($sub) use ($q) {
                        $sub->from('order_items as oi')
                            ->join('part_references as pr', 'pr.part_id', '=', 'oi.part_id')
                            ->whereColumn('oi.order_id', 'orders.id')
                            ->where('pr.code', 'like', "%{$q}%");
                    });
            });
        }

        $query->orderBy($sortBy, $sortDir);

        // paginate
        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        // Load brief items for the orders returned (efficient 2nd query)
        $orderIds = $paginator->pluck('id')->all();
        $briefs = [];
        if (!empty($orderIds)) {
            $rows = OrderItem::query()
                ->select([
                    'order_items.order_id',
                    DB::raw('p.sku as sku'),
                    DB::raw('p.name as name'),
                    'order_items.quantity as qty',
                    'order_items.unit_price',
                    'order_items.line_total',
                ])
                ->join('parts as p', 'p.id', '=', 'order_items.part_id')
                ->whereIn('order_items.order_id', $orderIds)
                ->orderBy('order_items.id', 'asc')
                ->get();

            foreach ($rows as $r) {
                $briefs[$r->order_id][] = [
                    'sku'        => $r->sku,
                    'name'       => $r->name,
                    'qty'        => (int)$r->qty,
                    'unit_price' => (float)$r->unit_price,
                    'line_total' => (float)$r->line_total,
                ];
            }
        }

        $data = $paginator->getCollection()->map(function ($o) use ($briefs) {
            return [
                'id'              => $o->id,
                'status'          => $o->status,
                'delivery_method' => $o->delivery_method,
                'currency'        => $o->currency,
                'items_count'     => (int)$o->items_count,
                'subtotal'        => (float)$o->subtotal,
                'discount_total'  => (float)$o->discount_total,
                'shipping_total'  => (float)$o->shipping_total,
                'tax_total'       => (float)$o->tax_total,
                'grand_total'     => (float)$o->grand_total,
                'created_at'      => $o->created_at?->toIso8601String(),
                'updated_at'      => $o->updated_at?->toIso8601String(),
                'items_brief'     => array_slice($briefs[$o->id] ?? [], 0, 10),

                'user' => $o->user ? [
                    'id'    => $o->user->id,
                    'name'  => $o->user->name,
                    'email' => $o->user->email,
                ] : null,
            ];
        });


        return response()->json([
            'data'     => $data,
            'total'    => $paginator->total(),
            'page'     => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
        ]);
    }

    // GET /admin/order/api/{order}
    public function show(Order $order)
    {
        $order->load('user:id,name,email'); // 🔹 add this
        // status pipeline
        $steps = ['cart', 'pending', 'confirmed', 'preparing', 'shipped', 'completed', 'canceled'];
        $statusIndex = array_search($order->status, $steps, true);
        if ($statusIndex === false) $statusIndex = 0;

        // load items + part relations needed in your TS shape
        $items = OrderItem::query()
            ->select([
                'order_items.id',
                'order_items.part_id',
                'order_items.quantity as qty',
                'order_items.unit_price',
                'order_items.line_total',
                'order_items.notes',
                'p.sku',
                'p.name',
                'p.min_order_qty',
                'p.min_qty_gros',
                'p.price_retail',
                'p.price_demi_gros',
                'p.price_gros',
                'm.id as manu_id',
                'm.name as manu_name',
                'c.id as cat_id',
                'c.name as cat_name',
            ])
            ->join('parts as p', 'p.id', '=', 'order_items.part_id')
            ->leftJoin('manufacturers as m', 'm.id', '=', 'p.manufacturer_id')
            ->leftJoin('categories as c', 'c.id', '=', 'p.category_id')
            ->where('order_items.order_id', $order->id)
            ->orderBy('order_items.id', 'asc')
            ->get();

        // references and fitments (optional arrays)
        $partIds = $items->pluck('part_id')->unique()->values()->all();
        $partIdsForParts = OrderItem::where('order_id', $order->id)->pluck('part_id')->all();

        $refs = DB::table('part_references')
            ->select('part_id', 'type', 'code', 'source_brand')
            ->whereIn('part_id', $partIds)
            ->get()
            ->groupBy('part_id');


        $fits = DB::table('part_fitments as pf')
            ->join('vehicle_models as vm', 'vm.id', '=', 'pf.vehicle_model_id')
            ->leftJoin('vehicle_brands as vb', 'vb.id', '=', 'vm.vehicle_brand_id') // <-- correct column
            ->whereIn('pf.part_id', $partIds)
            ->select('pf.part_id', 'vm.name as model_name', 'vb.name as brand_name')
            ->get()
            ->groupBy('part_id');


        $itemsPayload = [];
        foreach ($items as $it) {
            $pId = (int)$it->part_id;

            $itemsPayload[] = [
                'id'              => (int)$it->id,
                'sku'             => $it->sku,
                'name'            => $it->name,
                'image'           => null,
                'manufacturer'    => $it->manu_id ? ['id' => (int)$it->manu_id, 'name' => $it->manu_name] : null,
                'category'        => $it->cat_id ? ['id' => (int)$it->cat_id, 'name' => $it->cat_name] : null,

                'min_order_qty'   => (int)$it->min_order_qty,
                'min_qty_gros'    => (int)$it->min_qty_gros,
                'price_retail'    => $it->price_retail !== null ? (float)$it->price_retail : null,
                'price_demi_gros' => $it->price_demi_gros !== null ? (float)$it->price_demi_gros : null,
                'price_gros'      => $it->price_gros !== null ? (float)$it->price_gros : null,

                'fitment_models'  => collect($fits[$pId] ?? [])->pluck('model_name')->filter()->unique()->values()->all(),
                'fitment_brands'  => collect($fits[$pId] ?? [])->pluck('brand_name')->filter()->unique()->values()->all(),
                'references'      => collect($refs[$pId] ?? [])->map(fn($r) => [
                    'type' => $r->type,
                    'code' => $r->code,
                    'source_brand' => $r->source_brand
                ])->values()->all(),

                'qty'        => (int)$it->qty,
                'unit_price' => (float)$it->unit_price,
                'line_total' => (float)$it->line_total,

            ];
        }

        return response()->json([
            'id'              => $order->id,
            'status'          => $order->status,
            'status_steps'    => $steps,
            'status_index'    => $statusIndex,
            'delivery_method' => $order->delivery_method,
            'ship_to'         => [
                'name'    => $order->ship_to_name,
                'phone'   => $order->ship_to_phone,
                'address' => $order->ship_to_address,
            ],
            'currency'       => $order->currency,
            'items'          => $itemsPayload,
            'items_count'    => (int)$order->items()->count(),
            'subtotal'       => (float)$order->subtotal,
            'discount_total' => (float)$order->discount_total,
            'shipping_total' => (float)$order->shipping_total,
            'tax_total'      => (float)$order->tax_total,
            'grand_total'    => (float)$order->grand_total,
            'created_at'     => $order->created_at?->toIso8601String(),
            'updated_at'     => $order->updated_at?->toIso8601String(),
            'notes'         => $order->notes,

            // 🔹 return user
            'user' => $order->user ? [
                'id'    => $order->user->id,
                'name'  => $order->user->name,
                'email' => $order->user->email,
            ] : null,
        ]);
    }

    // PATCH /admin/order/api/{order}/status
    public function updateStatus(Request $req, Order $order)
    {
        $data = $req->validate([
            'status' => ['required', Rule::in(['pending', 'confirmed', 'preparing', 'shipped', 'completed', 'canceled'])],
        ]);

        $order->update(['status' => $data['status']]);

        return response()->json([
            'ok'    => true,
            'order' => ['id' => $order->id, 'status' => $order->status],
        ]);
    }

    // PATCH /admin/order/api/{order}/shipping
    public function updateShipping(Request $req, Order $order)
    {
        $data = $req->validate([
            'delivery_method' => ['nullable', Rule::in(['pickup', 'courier', 'post'])],
            'ship_to_name'    => ['nullable', 'string', 'max:120'],
            'ship_to_phone'   => ['nullable', 'string', 'max:40'],
            'ship_to_address' => ['nullable', 'string', 'max:255'],
        ]);

        $order->fill($data)->save();

        return response()->json(['ok' => true, 'order' => $order->only([
            'id',
            'delivery_method',
            'ship_to_name',
            'ship_to_phone',
            'ship_to_address',
            'status'
        ])]);
    }

    // POST /admin/order/api/{order}/notes
    public function updateNotes(Request $req, Order $order)
    {
        $data = $req->validate([
            'notes' => ['nullable', 'string'],
        ]);

        $order->update(['notes' => $data['notes'] ?? null]);

        return response()->json([
            'ok' => true,
            'order' => [
                'id' => $order->id,
                'notes' => $order->notes,
                'updated_at' => $order->updated_at?->toIso8601String(),
            ],
        ]);
    }
}
