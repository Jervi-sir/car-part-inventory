<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Part;
use App\Models\UserShippingAddress;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class CartController extends Controller
{
    // Always work on the authenticated user's single open cart
    private function getOrCreateCartOrder(int $userId): Order
    {
        /** @var Order|null $order */
        $order = Order::query()
            ->where('user_id', $userId)
            ->where('status', 'cart')
            ->first();

        if ($order) return $order;

        return Order::create([
            'user_id'        => $userId,
            'status'         => 'cart',
            'currency'       => 'DZD',
            'subtotal'       => 0,
            'discount_total' => 0,
            'shipping_total' => 0,
            'tax_total'      => 0,
            'grand_total'    => 0,
        ]);
    }

    private function recalcTotals(Order $order): void
    {
        // Recalculate subtotal from items and set grand_total (no shipping/tax yet)
        $subtotal = $order->items()->sum('line_total');
        $order->subtotal    = $subtotal;
        $order->grand_total = $subtotal; // adjust later when shipping/tax exist
        $order->save();
    }


    public function quickPreview(Request $request)
    {
        $data = $request->validate([
            'q'               => ['nullable','string'],
            'category_id'     => ['nullable','integer'],
            'manufacturer_id' => ['nullable','integer'],
            'is_active'       => ['nullable','in:0,1'],
            'min_price'       => ['nullable','numeric'],
            'max_price'       => ['nullable','numeric'],
            'price_tier'      => ['nullable','in:retail,demi_gros,gros'],
            'sort'            => ['nullable','string'], // e.g. "name,-created_at,price"
            'per_page'        => ['nullable','integer','min:1','max:100'],
        ]);

        $priceColumn = match($data['price_tier'] ?? 'retail') {
            'demi_gros' => 'price_demi_gros',
            'gros'      => 'price_gros',
            default     => 'price_retail',
        };

        $query = Part::query()
            ->with([
                'category:id,name,is_special,icon_url',
                'manufacturer:id,name',
            ])
            ->select([
                'id','manufacturer_id','category_id',
                'sku','name','description',
                'package_qty','min_order_qty',
                'price_retail','price_demi_gros','price_gros',
                'images','min_qty_gros','is_active','created_at',
            ])
            ->search($data['q'] ?? null);

        if (isset($data['category_id'])) {
            $query->where('category_id', $data['category_id']);
        }
        if (isset($data['manufacturer_id'])) {
            $query->where('manufacturer_id', $data['manufacturer_id']);
        }
        if (isset($data['is_active'])) {
            $query->where('is_active', (bool)$data['is_active']);
        } else {
            $query->where('is_active', true); // default: only active
        }

        // Price range on chosen tier
        if (isset($data['min_price'])) {
            $query->where($priceColumn, '>=', $data['min_price']);
        }
        if (isset($data['max_price'])) {
            $query->where($priceColumn, '<=', $data['max_price']);
        }

        // Sorting
        // alias "price" to the chosen tier; support "-field" DESC
        $sorts = array_filter(array_map('trim', explode(',', $data['sort'] ?? '')));
        if (empty($sorts)) {
            // sensible default
            $query->orderBy('created_at', 'desc');
        } else {
            foreach ($sorts as $s) {
                $dir = str_starts_with($s, '-') ? 'desc' : 'asc';
                $col = ltrim($s, '-');
                if ($col === 'price') $col = $priceColumn;
                if (in_array($col, [
                    'id','name','sku','created_at',
                    'price_retail','price_demi_gros','price_gros'
                ], true)) {
                    $query->orderBy($col, $dir);
                }
            }
        }

        $perPage = $data['per_page'] ?? 15;
        $paginator = $query->paginate($perPage)->appends($request->query());

        // Transform (lightweight)
        $items = collect($paginator->items())->map(function (Part $p) use ($priceColumn) {
            return [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'description' => $p->description,
                'package_qty' => $p->package_qty,
                'min_order_qty' => $p->min_order_qty,
                'prices' => [
                    'retail' => $p->price_retail,
                    'demi_gros' => $p->price_demi_gros,
                    'gros' => $p->price_gros,
                    'active' => $p->{$priceColumn},
                    'tier' => $priceColumn, // for the UI to know which tier was used
                ],
                'image' => $p->primary_image, // first image only for list
                'images' => $p->images,       // full if needed
                'min_qty_gros' => $p->min_qty_gros,
                'is_active' => $p->is_active,
                'category' => [
                    'id' => $p->category?->id,
                    'name' => $p->category?->name,
                    'is_special' => $p->category?->is_special,
                    'icon_url' => $p->category?->icon_url,
                ],
                'manufacturer' => [
                    'id' => $p->manufacturer?->id,
                    'name' => $p->manufacturer?->name,
                ],
                'created_at' => $p->created_at,
            ];
        });

        return response()->json([
            'items' => $items,
            'meta' => [
                'total'      => $paginator->total(),
                'per_page'   => $paginator->perPage(),
                'current'    => $paginator->currentPage(),
                'last_page'  => $paginator->lastPage(),
                'has_more'   => $paginator->hasMorePages(),
            ],
        ]);
    }


    public function show(Request $req)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'items'    => [],
                'currency' => 'DZD',
                'count'    => 0,
                'subtotal' => 0,
            ], 200);
        }

        $order = $this->getOrCreateCartOrder($user->id);

        // Load parts in one go
        $items = $order->items()
            ->with([
                'part.manufacturer:id,name',
                'part.category:id,name',
                'part.fitments.vehicleModel.vehicleBrand:id,name',
                'part.references:id,part_id,type,code,source_brand',
            ])
            ->get();

        $count = 0;
        $payloadItems = [];

        foreach ($items as $it) {
            $p = $it->part;
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
                    $bName = $vm->vehicleBrand?->name;
                    if ($bName) $brands[$bName] = true;
                }
            }

            $refs = $p->references->map(fn($r) => [
                'type' => $r->type,
                'code' => $r->code,
                'source_brand' => $r->source_brand,
            ])->values();

            $qty = (int)$it->quantity;
            $count += $qty;

            $payloadItems[] = [
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
            'items'    => $payloadItems,
            'currency' => $order->currency ?? 'DZD',
            'count'    => $count,
            'subtotal' => (float)($order->subtotal ?? 0),
        ]);
    }


    public function add(Request $req)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $data = $req->validate([
            'part_id'  => ['required', 'integer', 'exists:parts,id'],
            'quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        $qty = (int)($data['quantity'] ?? 1);

        return DB::transaction(function () use ($user, $data, $qty) {
            $order = $this->getOrCreateCartOrder($user->id);

            /** @var Part $part */
            $part = Part::query()->where('is_active', true)->findOrFail($data['part_id']);

            // Enforce min order qty on ADD
            $baseMin = max(1, (int)$part->min_order_qty);

            /** @var OrderItem|null $line */
            $line = OrderItem::query()
                ->where('order_id', $order->id)
                ->where('part_id', $part->id)
                ->lockForUpdate()
                ->first();

            if ($line) {
                $line->quantity  = max($baseMin, $line->quantity + $qty);
                $line->unit_price = (float)($part->price_retail ?? $line->unit_price ?? 0);
                $line->line_total = $line->quantity * $line->unit_price;
                $line->currency   = $order->currency ?? 'DZD';
                $line->save();
            } else {
                $unit = (float)($part->price_retail ?? 0);
                $quantity = max($baseMin, $qty);
                OrderItem::create([
                    'order_id'   => $order->id,
                    'part_id'    => $part->id,
                    'quantity'   => $quantity,
                    'unit_price' => $unit,
                    'currency'   => $order->currency ?? 'DZD',
                    'line_total' => $quantity * $unit,
                ]);
            }

            $this->recalcTotals($order);

            // Return same payload as show()
            return $this->show(request());
        });
    }

    public function update(Request $req, Part $part)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $data = $req->validate([
            'quantity' => ['required', 'integer', 'min:0'],
        ]);

        return DB::transaction(function () use ($user, $part, $data) {
            $order = $this->getOrCreateCartOrder($user->id);

            /** @var OrderItem|null $line */
            $line = OrderItem::query()
                ->where('order_id', $order->id)
                ->where('part_id', $part->id)
                ->lockForUpdate()
                ->first();

            // If setting to 0 => remove line
            if ((int)$data['quantity'] === 0) {
                if ($line) $line->delete();
                $this->recalcTotals($order);
                return $this->show(request());
            }

            // Ensure line exists (create on the fly)
            if (!$line) {
                $line = new OrderItem([
                    'order_id'   => $order->id,
                    'part_id'    => $part->id,
                    'unit_price' => (float)($part->price_retail ?? 0),
                    'currency'   => $order->currency ?? 'DZD',
                    'quantity'   => 0,
                    'line_total' => 0,
                ]);
            }

            $baseMin = max(1, (int)($part->min_order_qty ?? 1));
            $qty = max($baseMin, (int)$data['quantity']);

            $line->unit_price = (float)($part->price_retail ?? $line->unit_price ?? 0);
            $line->quantity   = $qty;
            $line->line_total = $qty * $line->unit_price;
            $line->currency   = $order->currency ?? 'DZD';
            $line->save();

            $this->recalcTotals($order);

            return $this->show(request());
        });
    }

    public function remove(Part $part)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        return DB::transaction(function () use ($user, $part) {
            $order = $this->getOrCreateCartOrder($user->id);

            OrderItem::query()
                ->where('order_id', $order->id)
                ->where('part_id', $part->id)
                ->delete();

            $this->recalcTotals($order);

            return $this->show(request());
        });
    }

    public function clear()
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        return DB::transaction(function () use ($user) {
            $order = $this->getOrCreateCartOrder($user->id);

            // Fast clear
            OrderItem::where('order_id', $order->id)->delete();

            // Reset totals but keep the cart order row
            $order->update([
                'subtotal'       => 0,
                'discount_total' => 0,
                'shipping_total' => 0,
                'tax_total'      => 0,
                'grand_total'    => 0,
            ]);

            return $this->show(request());
        });
    }

    public function submit(Request $req)
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $data = $req->validate([
            'full_name'       => ['required', 'string', 'min:2', 'max:120'],
            'phone'           => ['required', 'string', 'min:5', 'max:40'],
            'address'         => ['nullable', 'string', 'max:255'],
            'address_id'      => ['nullable', 'integer', 'exists:user_shipping_addresses,id'],
            'delivery_method' => ['required', Rule::in(['pickup', 'courier', 'post'])],
        ]);

        // For courier/post: must have either address_id (owned by user) or address text
        $needsAddress = in_array($data['delivery_method'], ['courier', 'post'], true);

        $chosenAddress = null;
        if (!empty($data['address_id'])) {
            $chosenAddress = UserShippingAddress::where('id', $data['address_id'])
                ->where('user_id', $user->id)
                ->first();
            if (!$chosenAddress) {
                return response()->json([
                    'message' => 'Invalid address.',
                    'errors'  => ['address_id' => ['Address not found']]
                ], 422);
            }
        }

        if ($needsAddress && !$chosenAddress && empty($data['address'])) {
            return response()->json([
                'message' => 'Address is required for this delivery method.',
                'errors'  => ['address' => ['Address is required for courier/post']]
            ], 422);
        }

        return DB::transaction(function () use ($user, $data, $chosenAddress, $needsAddress) {
            $order = $this->getOrCreateCartOrder($user->id);

            $itemsCount = $order->items()->count();
            if ($itemsCount === 0) {
                return response()->json([
                    'message' => 'Cart is empty.',
                    'errors'  => ['cart' => ['No items in cart']]
                ], 422);
            }

            $shipping = match ($data['delivery_method']) {
                'pickup'  => 0.00,
                'courier' => 600.00,
                'post'    => 400.00,
                default   => 0.00,
            };

            $subtotal = (float)$order->items()->sum('line_total');

            // Fill shipping contact + address: prioritize saved address if provided
            $shipToName  = $data['full_name'];
            $shipToPhone = $data['phone'];
            $shipToAddress = null;

            if ($chosenAddress) {
                // You can format it however you store it in one field:
                $shipToAddress = trim(implode(', ', array_filter([
                    $chosenAddress->address_line1,
                    $chosenAddress->address_line2,
                    $chosenAddress->city,
                    $chosenAddress->state,
                    $chosenAddress->postal_code,
                    $chosenAddress->country,
                ])));
                // Optionally override contact from saved address:
                if (!empty($chosenAddress->recipient_name)) $shipToName = $chosenAddress->recipient_name;
                if (!empty($chosenAddress->phone))          $shipToPhone = $chosenAddress->phone;
            } else {
                // Free-text (optional for pickup)
                $shipToAddress = $data['address'] ?? null;
            }

            $order->fill([
                'status'          => 'pending',
                'delivery_method' => $data['delivery_method'],
                'ship_to_name'    => $shipToName,
                'ship_to_phone'   => $shipToPhone,
                'ship_to_address' => $shipToAddress,
                'shipping_total'  => $shipping,
                'subtotal'        => $subtotal,
                'tax_total'       => 0.00,
                'discount_total'  => $order->discount_total ?? 0.00,
            ]);

            $order->grand_total = $order->subtotal - $order->discount_total + $order->shipping_total + $order->tax_total;
            $order->save();

            return response()->json([
                'ok'          => true,
                'order_id'    => $order->id,
                'status'      => $order->status,
                'currency'    => $order->currency,
                'items_count' => $itemsCount,
                'subtotal'    => (float)$order->subtotal,
                'shipping'    => (float)$order->shipping_total,
                'tax'         => (float)$order->tax_total,
                'discount'    => (float)$order->discount_total,
                'grand_total' => (float)$order->grand_total,
            ]);
        });
    }
}
