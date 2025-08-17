<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Part;

class CartController extends Controller
{
    private function cart()
    {
        return session()->get('cart', [
            'items' => [],
            'currency' => 'DZD',
        ]);
    }

    private function putCart(array $cart)
    {
        session(['cart' => $cart]);
    }

    public function show()
    {
        $cart = $this->cart();

        // when empty, return the same shape
        if (empty($cart['items'])) {
            return response()->json([
                'items'    => [],
                'currency' => $cart['currency'],
                'count'    => 0,
                'subtotal' => 0,
            ]);
        }

        $partIds = array_map(fn($x) => (int)$x['id'], array_values($cart['items']));

        // Load all needed details in one shot
        $parts = \App\Models\Part::query()
            ->with([
                'manufacturer:id,name',
                'category:id,name',
                'fitments.vehicleModel.vehicleBrand:id,name',
                'references:id,part_id,type,code,source_brand',
            ])
            ->whereIn('id', $partIds)
            ->get()
            ->keyBy('id');

        $items = [];
        $subtotal = 0;
        $count = 0;

        foreach ($cart['items'] as $line) {
            $pid = (int)$line['id'];
            $p = $parts->get($pid);
            if (!$p) continue;

            // image
            $image = is_array($p->images ?? null) && !empty($p->images)
                ? ($p->images[0]['url'] ?? $p->images[0])
                : null;

            // models & brands
            $models = [];
            $brands = [];
            foreach ($p->fitments as $f) {
                $vm = $f->vehicleModel;
                if ($vm) {
                    $models[] = $vm->name;
                    $brandName = $vm->vehicleBrand?->name;
                    if ($brandName) $brands[$brandName] = true; // unique
                }
            }

            // references
            $refs = $p->references->map(fn($r) => [
                'type' => $r->type,
                'code' => $r->code,
                'source_brand' => $r->source_brand,
            ])->values();

            $qty = (int)($line['qty'] ?? 0);
            $unit = (float)($p->price_retail ?? $line['unit_price'] ?? 0); // prefer live retail
            $subtotal += $unit * $qty;
            $count += $qty;

            $items[] = [
                'id'              => $p->id,
                'sku'             => $p->sku,
                'name'            => $p->name,
                'image'           => $image,
                'manufacturer'    => $p->manufacturer?->only(['id', 'name']),
                'category'        => $p->category?->only(['id', 'name']),
                'min_order_qty'   => $p->min_order_qty,
                'min_qty_gros'    => $p->min_qty_gros,
                'price_retail'    => (float)$p->price_retail,
                'price_demi_gros' => (float)$p->price_demi_gros,
                'price_gros'      => (float)$p->price_gros,
                'fitment_models'  => array_values($models),
                'fitment_brands'  => array_keys($brands),
                'references'      => $refs,
                'qty'             => $qty,
            ];
        }

        return response()->json([
            'items'    => $items,
            'currency' => $cart['currency'],
            'count'    => $count,
            'subtotal' => round($subtotal, 2),
        ]);
    }


    public function add(Request $req)
    {
        $data = $req->validate([
            'part_id'  => ['required', 'integer', 'exists:parts,id'],
            'quantity' => ['nullable', 'integer', 'min:1'],
        ]);
        $qty = (int)($data['quantity'] ?? 1);

        $part = Part::where('is_active', true)->findOrFail($data['part_id']);
        $image = is_array($part->images ?? null) && !empty($part->images) ? ($part->images[0]['url'] ?? $part->images[0]) : null;

        $cart = $this->cart();
        $line = $cart['items'][$part->id] ?? [
            'id'         => $part->id,
            'name'       => $part->name,
            'unit_price' => (float)($part->price_retail ?? 0),
            'qty'        => 0,
            'image'      => $image,
            'sku'        => $part->sku,
        ];
        $line['qty'] += $qty;
        $cart['items'][$part->id] = $line;

        $this->putCart($cart);
        return $this->show();
    }

    public function update(Request $req, Part $part)
    {
        $data = $req->validate([
            'quantity' => ['required', 'integer', 'min:0'],
        ]);
        $cart = $this->cart();

        if ($data['quantity'] === 0) {
            unset($cart['items'][$part->id]);
        } else {
            if (!isset($cart['items'][$part->id])) {
                // create if not exists
                $image = is_array($part->images ?? null) && !empty($part->images) ? ($part->images[0]['url'] ?? $part->images[0]) : null;
                $cart['items'][$part->id] = [
                    'id'         => $part->id,
                    'name'       => $part->name,
                    'unit_price' => (float)($part->price_retail ?? 0),
                    'qty'        => 0,
                    'image'      => $image,
                    'sku'        => $part->sku,
                ];
            }
            $cart['items'][$part->id]['qty'] = (int)$data['quantity'];
        }

        $this->putCart($cart);
        return $this->show();
    }

    public function remove(Part $part)
    {
        $cart = $this->cart();
        unset($cart['items'][$part->id]);
        $this->putCart($cart);
        return $this->show();
    }

    public function clear()
    {
        $this->putCart(['items' => [], 'currency' => 'DZD']);
        return $this->show();
    }
}
