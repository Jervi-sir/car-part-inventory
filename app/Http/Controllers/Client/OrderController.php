<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OrderController extends Controller
{
    private function ensureOwner(Order $order): void
    {
        $uid = Auth::id();
        abort_unless($uid && $order->user_id === $uid, 404);
    }

    // Inertia page
    public function page(Order $order)
    {
        $this->ensureOwner($order);
        return Inertia::render('client/order/page', [
            'orderId' => $order->id,
        ]);
    }

    // JSON API
    public function show(Order $order)
    {
        $this->ensureOwner($order);

        $order->load([
            'items.part.manufacturer:id,name',
            'items.part.category:id,name',
            'items.part.fitments.vehicleModel.vehicleBrand:id,name',
            'items.part.references:id,part_id,type,code,source_brand',
        ]);

        // Build items payload (reusing shapes from your cart)
        $items = [];
        $count = 0;

        foreach ($order->items as $it) {
            $p = $it->part;
            if (!$p) continue;

            $image = is_array($p->images ?? null) && !empty($p->images)
                ? ($p->images[0]['url'] ?? $p->images[0])
                : null;

            $models = [];
            $brands = [];
            foreach ($p->fitments as $f) {
                $vm = $f->vehicleModel;
                if ($vm) {
                    $models[] = $vm->name;
                    $b = $vm->vehicleBrand?->name;
                    if ($b) $brands[$b] = true;
                }
            }

            $refs = $p->references->map(fn($r) => [
                'type' => $r->type,
                'code' => $r->code,
                'source_brand' => $r->source_brand,
            ])->values();

            $qty = (int)$it->quantity;
            $count += $qty;

            $items[] = [
                'id'              => $p->id,
                'sku'             => $p->sku,
                'name'            => $p->name,
                'image'           => $image,
                'manufacturer'    => $p->manufacturer?->only(['id','name']),
                'category'        => $p->category?->only(['id','name']),
                'min_order_qty'   => $p->min_order_qty,
                'min_qty_gros'    => $p->min_qty_gros,
                'price_retail'    => (float)$p->price_retail,
                'price_demi_gros' => (float)$p->price_demi_gros,
                'price_gros'      => (float)$p->price_gros,
                'fitment_models'  => array_values($models),
                'fitment_brands'  => array_keys($brands),
                'references'      => $refs,

                // order-specific
                'qty'        => $qty,
                'unit_price' => (float)$it->unit_price,
                'line_total' => (float)$it->line_total,
            ];
        }

        $statusSteps = ['cart','pending','confirmed','preparing','shipped','completed'];
        $statusIndex = array_search($order->status, $statusSteps, true);
        if ($statusIndex === false) $statusIndex = 0;

        return response()->json([
            'id'              => $order->id,
            'status'          => $order->status,
            'status_steps'    => $statusSteps,
            'status_index'    => $statusIndex,

            'delivery_method' => $order->delivery_method,
            'ship_to'         => [
                'name'    => $order->ship_to_name,
                'phone'   => $order->ship_to_phone,
                'address' => $order->ship_to_address,
            ],

            'currency'        => $order->currency,
            'items'           => $items,
            'items_count'     => $count,

            'subtotal'        => (float)($order->subtotal ?? 0),
            'discount_total'  => (float)($order->discount_total ?? 0),
            'shipping_total'  => (float)($order->shipping_total ?? 0),
            'tax_total'       => (float)($order->tax_total ?? 0),
            'grand_total'     => (float)($order->grand_total ?? 0),

            'created_at'      => $order->created_at?->toIso8601String(),
            'updated_at'      => $order->updated_at?->toIso8601String(),
        ]);
    }
}
