<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
    /** Get (or create) the current DRAFT order for the user */
    private function getDraftOrderId(int $userId): int
    {
        $statusId = $this->statusId('DRAFT');

        $order = DB::table('orders')
            ->where('user_id', $userId)
            ->where('status_id', $statusId)
            ->first(['id']);

        if ($order) return (int) $order->id;

        return (int) DB::table('orders')->insertGetId([
            'user_id'          => $userId,
            'status_id'        => $statusId,
            'currency'         => 'DZD',
            'subtotal'         => 0,
            'discount_total'   => 0,
            'shipping_total'   => 0,
            'tax_total'        => 0,
            'grand_total'      => 0,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);
    }

    /** Resolve an order_status by code, e.g. DRAFT/PLACED */
    private function statusId(string $code): int
    {
        $row = cache()->remember("order_status_id_{$code}", 3600, function () use ($code) {
            return DB::table('order_statuses')->where('code', $code)->first(['id']);
        });
        abort_unless($row, 500, "Missing order_statuses seed for code {$code}");
        return (int) $row->id;
    }

    /** Recalculate totals for given order */
    private function recalcTotals(int $orderId): array
    {
        $currency = DB::table('orders')->where('id', $orderId)->value('currency') ?? 'DZD';

        $subtotal = (float) DB::table('order_items')
            ->where('order_id', $orderId)
            ->sum('line_total');

        // For now keep discounts/shipping/tax zero (you can plug logic later)
        $discount = 0.0;
        $shipping = 0.0;
        $tax      = 0.0;
        $grand    = $subtotal - $discount + $shipping + $tax;

        DB::table('orders')
            ->where('id', $orderId)
            ->update([
                'subtotal'       => $subtotal,
                'discount_total' => $discount,
                'shipping_total' => $shipping,
                'tax_total'      => $tax,
                'grand_total'    => $grand,
                'updated_at'     => now(),
            ]);

        return [
            'currency'       => $currency,
            'subtotal'       => $subtotal,
            'discount_total' => $discount,
            'shipping_total' => $shipping,
            'tax_total'      => $tax,
            'grand_total'    => $grand,
        ];
    }

    /** GET /api/cart -> current draft + items + summary */
    public function current(Request $request)
    {
        $userId = (int) $request->user()->id;
        $orderId = $this->getDraftOrderId($userId);

        $items = DB::table('order_items as oi')
            ->join('parts as p', 'p.id', '=', 'oi.part_id')
            ->where('oi.order_id', $orderId)
            ->orderBy('oi.id')
            ->get([
                'oi.part_id',
                'p.name',
                'p.sku',
                'oi.qty',
                'oi.unit_price',
                'oi.currency',
                'oi.line_total',
            ]);

        $summary = $this->recalcTotals($orderId);

        return response()->json([
            'items'   => $items,
            'summary' => $summary,
        ]);
    }

    /** POST /api/cart/items { part_id, qty } */
    public function addItem(Request $request)
    {
        $userId  = (int) $request->user()->id;
        $payload = $request->validate([
            'part_id' => ['required', 'integer', 'exists:parts,id'],
            'qty'     => ['nullable', 'integer', 'min:1'],
        ]);

        $part = DB::table('parts')->where('id', $payload['part_id'])->first([
            'id','name','sku','base_price','currency','is_active','min_order_qty','package_qty'
        ]);

        abort_unless($part, 404, 'Part not found');
        abort_unless((bool) $part->is_active, 422, 'This part is inactive');
        $qty = max(1, (int) ($payload['qty'] ?? $part->min_order_qty ?? 1));

        // Enforce min_order_qty and package multiples
        $minOrder    = max(1, (int) ($part->min_order_qty ?? 1));
        $packageSize = max(1, (int) ($part->package_qty ?? 1));
        if ($qty < $minOrder) $qty = $minOrder;
        if ($qty % $packageSize !== 0) {
            $qty = (int) (ceil($qty / $packageSize) * $packageSize);
        }

        $unit = (float) ($part->base_price ?? 0);
        $cur  = $part->currency ?: 'DZD';
        abort_if($unit <= 0, 422, 'No base price configured for this part');

        $orderId = $this->getDraftOrderId($userId);

        // Upsert unique(order_id, part_id)
        $existing = DB::table('order_items')
            ->where('order_id', $orderId)
            ->where('part_id', $part->id)
            ->first(['id','qty','unit_price']);

        if ($existing) {
            $newQty = (int) $existing->qty + $qty;
            DB::table('order_items')->where('id', $existing->id)->update([
                'qty'        => $newQty,
                'unit_price' => $unit,
                'currency'   => $cur,
                'line_total' => $newQty * $unit,
                'updated_at' => now(),
            ]);
        } else {
            DB::table('order_items')->insert([
                'order_id'   => $orderId,
                'part_id'    => $part->id,
                'qty'        => $qty,
                'unit_price' => $unit,
                'currency'   => $cur,
                'line_total' => $qty * $unit,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $summary = $this->recalcTotals($orderId);
        return response()->json(['ok' => true, 'summary' => $summary]);
    }

    /** PUT /api/cart/items/{part} { qty } */
    public function updateItem(Request $request, int $part)
    {
        $userId = (int) $request->user()->id;
        $payload = $request->validate([
            'qty' => ['required', 'integer', 'min:1'],
        ]);

        $orderId = $this->getDraftOrderId($userId);

        // Get part constraints
        $p = DB::table('parts')->where('id', $part)->first(['min_order_qty','package_qty','base_price','currency','is_active']);
        abort_unless($p, 404, 'Part not found');
        abort_unless((bool) $p->is_active, 422, 'This part is inactive');
        $unit = (float) ($p->base_price ?? 0);
        $cur  = $p->currency ?: 'DZD';
        abort_if($unit <= 0, 422, 'No base price configured for this part');

        $qty = (int) $payload['qty'];
        $minOrder    = max(1, (int) ($p->min_order_qty ?? 1));
        $packageSize = max(1, (int) ($p->package_qty ?? 1));
        if ($qty < $minOrder) $qty = $minOrder;
        if ($qty % $packageSize !== 0) {
            $qty = (int) (ceil($qty / $packageSize) * $packageSize);
        }

        $affected = DB::table('order_items')
            ->where('order_id', $orderId)
            ->where('part_id', $part)
            ->update([
                'qty'        => $qty,
                'unit_price' => $unit,
                'currency'   => $cur,
                'line_total' => $qty * $unit,
                'updated_at' => now(),
            ]);

        abort_if(!$affected, 404, 'Item not found in cart');

        $summary = $this->recalcTotals($orderId);
        return response()->json(['ok' => true, 'summary' => $summary]);
    }

    /** DELETE /api/cart/items/{part} */
    public function removeItem(Request $request, int $part)
    {
        $userId  = (int) $request->user()->id;
        $orderId = $this->getDraftOrderId($userId);

        $deleted = DB::table('order_items')
            ->where('order_id', $orderId)
            ->where('part_id', $part)
            ->delete();

        abort_if(!$deleted, 404, 'Item not found in cart');

        $summary = $this->recalcTotals($orderId);
        return response()->json(['ok' => true, 'summary' => $summary]);
    }

    /** POST /api/cart/place -> finalize the draft order */
    public function place(Request $request)
    {
        $userId  = (int) $request->user()->id;
        $orderId = $this->getDraftOrderId($userId);

        $itemsCount = DB::table('order_items')->where('order_id', $orderId)->count();
        abort_if($itemsCount === 0, 422, 'Cart is empty');

        // Optionally validate shipping info or require it before placing.
        $placedId = $this->statusId('PLACED');

        DB::table('orders')
            ->where('id', $orderId)
            ->update([
                'status_id'  => $placedId,
                'updated_at' => now(),
            ]);

        // Create a fresh empty draft for next time
        $newDraftId = $this->getDraftOrderId($userId);

        return response()->json(['order_id' => $orderId]);
    }
}
