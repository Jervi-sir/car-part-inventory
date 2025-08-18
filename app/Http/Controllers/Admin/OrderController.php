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
    private const BRIEF_LIMIT = 10; // how many items to show in "items_brief"

    /*
    |--------------------------------------------------------------------------
    | Pages
    |--------------------------------------------------------------------------
    */
    public function page()
    {
        return Inertia::render('admin/orders/page', []);
    }

    public function showPage($orderId)
    {
        return Inertia::render('admin/order/page', ['orderId' => (int) $orderId]);
    }

    /*
    |--------------------------------------------------------------------------
    | API: List
    |--------------------------------------------------------------------------
    | GET /admin/orders/api
    */
    public function index(Request $request)
    {
        // 1) Validate + read params
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
        $qIsNumeric = $q !== '' && ctype_digit($q);

        // 2) Base list query — Query Builder (NO Eloquent hydration)
        $base = DB::table('orders')
            ->select([
                'orders.id',
                'orders.user_id',
                'orders.status',
                'orders.delivery_method',
                'orders.subtotal',
                'orders.discount_total',
                'orders.shipping_total',
                'orders.tax_total',
                'orders.grand_total',
                'orders.created_at',
                'orders.updated_at',
            ]);

        // Filters
        if ($status !== 'all') {
            $base->where('orders.status', $status);
        }
        if ($method !== 'all') {
            $base->where('orders.delivery_method', $method);
        }
        if ($from) {
            $base->whereDate('orders.created_at', '>=', Carbon::parse($from)->toDateString());
        }
        if ($to) {
            $base->whereDate('orders.created_at', '<=', Carbon::parse($to)->toDateString());
        }

        // Search: group everything to avoid OR exploding the table
        if ($q !== '') {
            $base->where(function ($w) use ($q, $qIsNumeric) {
                if ($qIsNumeric) {
                    $w->orWhere('orders.id', (int)$q);
                }
                $w->orWhere('orders.ship_to_name',  'like', "%{$q}%")
                    ->orWhere('orders.ship_to_phone', 'like', "%{$q}%")
                    ->orWhereExists(function ($sub) use ($q) {
                        $sub->from('order_items as oi')
                            ->join('parts as p', 'p.id', '=', 'oi.part_id')
                            ->whereColumn('oi.order_id', 'orders.id')
                            ->where(function ($x) use ($q) {
                                $x->where('p.sku',       'like', "%{$q}%")
                                    ->orWhere('p.name',     'like', "%{$q}%")
                                    ->orWhere('p.reference', 'like', "%{$q}%")
                                    ->orWhere('p.barcode',  'like', "%{$q}%");
                            });
                    });
            });
        }

        // Sort
        $base->orderBy($sortBy, $sortDir);

        // 3) Paginate (DB builder paginate hydrates only current page rows)
        $paginator = $base->paginate($perPage, ['*'], 'page', $page);

        // Grab page rows as simple arrays (small)
        $rows = collect($paginator->items());

        if ($rows->isEmpty()) {
            return response()->json([
                'data'     => [],
                'total'    => $paginator->total(),
                'page'     => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
            ]);
        }

        // 4) items_count via subquery (no relation hydration)
        // Build a map: order_id => count
        $orderIds = $rows->pluck('id')->all();
        $counts = DB::table('order_items')
            ->select('order_id', DB::raw('COUNT(*) as c'))
            ->whereIn('order_id', $orderIds)
            ->groupBy('order_id')
            ->pluck('c', 'order_id'); // returns [order_id => count]

        // 5) Load users in one small query
        $userIds = $rows->pluck('user_id')->filter()->unique()->values()->all();
        $usersMap = [];
        if (!empty($userIds)) {
            $usersMap = DB::table('users')
                ->whereIn('id', $userIds)
                ->get(['id', 'name', 'email'])
                ->keyBy('id')
                ->map(fn($u) => ['id' => (int)$u->id, 'name' => $u->name, 'email' => $u->email])
                ->all();
        }

        // 6) Brief items (strict LIMIT per order; no chance to explode)
        $BRIEF_LIMIT = 10; // match your UI expectations
        $briefs = [];

        foreach ($orderIds as $oid) {
            $briefRows = DB::table('order_items as oi')
                ->join('parts as p', 'p.id', '=', 'oi.part_id')
                ->where('oi.order_id', $oid)
                ->orderBy('oi.id', 'asc')
                ->limit($BRIEF_LIMIT)
                ->get([
                    'p.sku',
                    'p.name',
                    DB::raw('oi.quantity as qty'),
                    'oi.unit_price',
                    'oi.line_total',
                ]);

            if ($briefRows->isNotEmpty()) {
                $briefs[$oid] = $briefRows->map(fn($r) => [
                    'sku'        => $r->sku,
                    'name'       => $r->name,
                    'qty'        => (int)$r->qty,
                    'unit_price' => (float)$r->unit_price,
                    'line_total' => (float)$r->line_total,
                ])->all();
            } else {
                $briefs[$oid] = [];
            }
        }

        // 7) Build payload
        $data = $rows->map(function ($o) use ($counts, $briefs, $usersMap) {
            $oid = (int)$o->id;
            $uid = $o->user_id;

            return [
                'id'              => $oid,
                'status'          => $o->status,
                'delivery_method' => $o->delivery_method,
                'items_count'     => (int)($counts[$oid] ?? 0),
                'subtotal'        => (float)$o->subtotal,
                'discount_total'  => (float)$o->discount_total,
                'shipping_total'  => (float)$o->shipping_total,
                'tax_total'       => (float)$o->tax_total,
                'grand_total'     => (float)$o->grand_total,
                'created_at'      => $o->created_at ? (new \DateTime($o->created_at))->format(DATE_ATOM) : null,
                'updated_at'      => $o->updated_at ? (new \DateTime($o->updated_at))->format(DATE_ATOM) : null,
                'items_brief'     => $briefs[$oid] ?? [],
                'user'            => $uid && isset($usersMap[$uid]) ? $usersMap[$uid] : null,
            ];
        })->values();

        // 8) Return
        return response()->json([
            'data'     => $data,
            'total'    => $paginator->total(),
            'page'     => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | API: Show
    |--------------------------------------------------------------------------
    | GET /admin/order/api/{order}
    */
    public function show(Order $order)
    {
        $order->load('user:id,name,email');

        $steps = ['cart', 'pending', 'confirmed', 'preparing', 'shipped', 'completed', 'canceled'];
        $statusIndex = array_search($order->status, $steps, true);
        if ($statusIndex === false) $statusIndex = 0;

        $items = OrderItem::query()
            ->select([
                'order_items.id',
                'order_items.part_id',
                'order_items.quantity as qty',
                'order_items.unit_price',
                'order_items.line_total',
                'order_items.notes',

                'p.sku',
                'p.reference',
                'p.barcode',
                'p.name',

                'm.id as manu_id',
                'm.name as manu_name',
            ])
            ->join('parts as p', 'p.id', '=', 'order_items.part_id')
            ->leftJoin('manufacturers as m', 'm.id', '=', 'p.manufacturer_id')
            ->where('order_items.order_id', $order->id)
            ->orderBy('order_items.id', 'asc')
            ->get();

        $partIds = $items->pluck('part_id')->unique()->values()->all();
        $fits = collect();
        if (!empty($partIds)) {
            $fits = DB::table('part_fitments as pf')
                ->join('vehicle_models as vm', 'vm.id', '=', 'pf.vehicle_model_id')
                ->leftJoin('vehicle_brands as vb', 'vb.id', '=', 'vm.vehicle_brand_id')
                ->whereIn('pf.part_id', $partIds)
                ->select('pf.part_id', 'vm.name as model_name', 'vb.name as brand_name')
                ->get()
                ->groupBy('part_id');
        }

        $itemsPayload = [];
        foreach ($items as $it) {
            $pId = (int) $it->part_id;
            $fitRows = collect($fits[$pId] ?? []);
            $itemsPayload[] = [
                'id'             => (int) $it->id,
                'sku'            => $it->sku,
                'reference'      => $it->reference,
                'barcode'        => $it->barcode,
                'name'           => $it->name,
                'image'          => null,
                'manufacturer'   => $it->manu_id ? ['id' => (int) $it->manu_id, 'name' => $it->manu_name] : null,
                'fitment_models' => $fitRows->pluck('model_name')->filter()->unique()->values()->all(),
                'fitment_brands' => $fitRows->pluck('brand_name')->filter()->unique()->values()->all(),
                'qty'            => (int) $it->qty,
                'unit_price'     => (float) $it->unit_price,
                'line_total'     => (float) $it->line_total,
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
            'items'          => $itemsPayload,
            'items_count'    => (int) $order->items()->count(),
            'subtotal'       => (float) $order->subtotal,
            'discount_total' => (float) $order->discount_total,
            'shipping_total' => (float) $order->shipping_total,
            'tax_total'      => (float) $order->tax_total,
            'grand_total'    => (float) $order->grand_total,
            'created_at'     => $order->created_at?->toIso8601String(),
            'updated_at'     => $order->updated_at?->toIso8601String(),
            'notes'          => $order->notes,
            'user'           => $order->user ? [
                'id'    => $order->user->id,
                'name'  => $order->user->name,
                'email' => $order->user->email,
            ] : null,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | API: Update Status
    |--------------------------------------------------------------------------
    | PATCH /admin/order/api/{order}/status
    */
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

    /*
    |--------------------------------------------------------------------------
    | API: Update Shipping
    |--------------------------------------------------------------------------
    | PATCH /admin/order/api/{order}/shipping
    */
    public function updateShipping(Request $req, Order $order)
    {
        $data = $req->validate([
            'delivery_method' => ['nullable', Rule::in(['pickup', 'courier', 'post'])],
            'ship_to_name'    => ['nullable', 'string', 'max:120'],
            'ship_to_phone'   => ['nullable', 'string', 'max:40'],
            'ship_to_address' => ['nullable', 'string', 'max:255'],
        ]);

        $order->fill($data)->save();

        return response()->json([
            'ok'    => true,
            'order' => $order->only([
                'id',
                'delivery_method',
                'ship_to_name',
                'ship_to_phone',
                'ship_to_address',
                'status',
            ]),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | API: Update Notes
    |--------------------------------------------------------------------------
    | PATCH /admin/order/api/{order}/notes
    */
    public function updateNotes(Request $req, Order $order)
    {
        $data = $req->validate([
            'notes' => ['nullable', 'string'],
        ]);

        $order->update(['notes' => $data['notes'] ?? null]);

        return response()->json([
            'ok'    => true,
            'order' => [
                'id'         => $order->id,
                'notes'      => $order->notes,
                'updated_at' => $order->updated_at?->toIso8601String(),
            ],
        ]);
    }
}
