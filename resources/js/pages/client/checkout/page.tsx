// resources/js/Pages/client/checkout/page.tsx
import { useEffect, useState } from "react";
import { Head } from "@inertiajs/react";
import { ClientLayout } from "../layout/client-layout";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Minus, Plus, Trash2, Truck, ShoppingCart, X } from "lucide-react";

declare const route: (name: string, params?: any) => string;

type Id = number | string;
type Ref = { type: string; code: string; source_brand?: string | null };
type Mini = { id: Id; name: string };

type CartItemFull = {
  id: number;
  sku?: string | null;
  name: string;
  image?: string | null;
  manufacturer?: Mini | null;
  category?: Mini | null;

  min_order_qty: number;
  min_qty_gros: number;
  price_retail?: number | null;
  price_demi_gros?: number | null;
  price_gros?: number | null;

  fitment_models: string[];
  fitment_brands: string[];
  references: Ref[];

  qty: number;
};

type Cart = { items: CartItemFull[]; subtotal: number; count: number; currency: string };

const csrf =
  (typeof document !== "undefined" &&
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content) ||
  "";

const baseHeaders = (json = true) => ({
  Accept: "application/json",
  ...(json ? { "Content-Type": "application/json" } : {}),
  "X-CSRF-TOKEN": csrf,
  "X-Requested-With": "XMLHttpRequest",
});

const http = {
  get: (url: string) => fetch(url, { method: "GET", headers: baseHeaders(false), credentials: "same-origin" }),
  post: (url: string, body?: any) =>
    fetch(url, { method: "POST", headers: baseHeaders(), credentials: "same-origin", body: body ? JSON.stringify(body) : undefined }),
  put: (url: string, body?: any) =>
    fetch(url, { method: "PUT", headers: baseHeaders(), credentials: "same-origin", body: body ? JSON.stringify(body) : undefined }),
  delete: (url: string) => fetch(url, { method: "DELETE", headers: baseHeaders(false), credentials: "same-origin" }),
};

const endpoints = {
  cartShow: route("shop.api.cart.show"),
  cartUpdate: (id: Id) => route("shop.api.cart.update", { part: id }),
  cartRemove: (id: Id) => route("shop.api.cart.remove", { part: id }),
  cartClear: route("shop.api.cart.clear"),
  checkoutSubmit: route("shop.api.checkout.submit"), // NEW
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart>({ items: [], subtotal: 0, count: 0, currency: "DZD" });
  const [loading, setLoading] = useState(true);
  const [busyRow, setBusyRow] = useState<number | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    delivery_method: "pickup", // default
  });
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ order_id: number; grand_total: number } | null>(null);

  const refreshCart = async () => {
    setLoading(true);
    const res = await http.get(endpoints.cartShow);
    const js = await res.json();
    setCart({
      items: js.items ?? [],
      subtotal: js.subtotal ?? 0,
      count: js.count ?? 0,
      currency: js.currency ?? "DZD",
    });
    setLoading(false);
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const updateQty = async (id: Id, qty: number) => {
    setBusyRow(Number(id));
    await http.put(endpoints.cartUpdate(id), { quantity: qty });
    await refreshCart();
    setBusyRow(null);
  };

  const remove = async (id: Id) => {
    setBusyRow(Number(id));
    await http.delete(endpoints.cartRemove(id));
    await refreshCart();
    setBusyRow(null);
  };

  const clear = async () => {
    setLoading(true);
    await http.delete(endpoints.cartClear);
    await refreshCart();
  };

  const submitShipping = async () => {
    setSubmitError(null);
    if (!cart.items.length) return;

    setSubmitBusy(true);
    try {
      const res = await http.post(endpoints.checkoutSubmit, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        delivery_method: form.delivery_method,
      });

      if (!res.ok) {
        const js = await res.json().catch(() => null);
        const msg =
          js?.errors?.address?.[0] ??
          js?.errors?.cart?.[0] ??
          js?.message ??
          "Failed to submit shipping.";
        setSubmitError(msg);
      } else {
        const js = await res.json();
        // success: mark placed, refresh cart (will be empty now)
        setPlaced({ order_id: js.order_id, grand_total: js.grand_total });
        await refreshCart();
      }
    } catch (e: any) {
      setSubmitError(e?.message ?? "Failed to submit shipping.");
    } finally {
      setSubmitBusy(false);
    }
  };


  const isEmpty = cart.items.length === 0;

  return (
    <ClientLayout title="Checkout">
      <div className="p-6 pt-0">
        <Head title="Checkout" />
        
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Checkout</h1>
          <Button variant="outline" onClick={refreshCart}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Full Columns */}
          <Card className="p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Your Order</div>
              {!isEmpty && (
                <Button variant="ghost" size="sm" onClick={clear}>
                  <X className="h-4 w-4 mr-2" /> Clear cart
                </Button>
              )}
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : isEmpty ? (
              <div className="text-sm text-muted-foreground">Your cart is empty.</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[180px]">Manufacturer</TableHead>
                      <TableHead className="w-[260px]">Fitment Models</TableHead>
                      <TableHead className="w-[220px]">Fitment Brands</TableHead>
                      <TableHead className="w-[110px]">Min Order</TableHead>
                      <TableHead className="w-[110px]">Min (Gros)</TableHead>
                      <TableHead className="w-[120px]">Retail</TableHead>
                      <TableHead className="w-[140px]">Demi-gros</TableHead>
                      <TableHead className="w-[120px]">Gros</TableHead>
                      <TableHead className="w-[260px]">References</TableHead>
                      <TableHead className="w-[200px]">Qty</TableHead>
                      <TableHead className="w-[80px]">Remove</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.items.map((it) => {
                      const disabled = busyRow === it.id;
                      const baseMin = Math.max(1, it.min_order_qty || 1);
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="font-mono text-xs">{it.sku || "—"}</TableCell>
                          <TableCell className="font-medium">{it.name}</TableCell>
                          <TableCell>{it.manufacturer?.name || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {it.fitment_models?.length ? it.fitment_models.join(", ") : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {it.fitment_brands?.length ? it.fitment_brands.join(", ") : "—"}
                          </TableCell>
                          <TableCell>{it.min_order_qty}</TableCell>
                          <TableCell>{it.min_qty_gros}</TableCell>
                          <TableCell>
                            {it.price_retail != null ? `${it.price_retail} ${cart.currency}` : "–"}
                          </TableCell>
                          <TableCell>
                            {it.price_demi_gros != null ? `${it.price_demi_gros} ${cart.currency}` : "–"}
                          </TableCell>
                          <TableCell>
                            {it.price_gros != null ? `${it.price_gros} ${cart.currency}` : "–"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {it.references?.length
                              ? it.references.map((r, i) => (
                                <span key={i}>
                                  {r.code}
                                  {r.source_brand ? ` (${r.source_brand})` : ""}
                                  {r.type ? ` [${r.type}]` : ""}
                                  {i < it.references.length - 1 ? ", " : ""}
                                </span>
                              ))
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={disabled}
                                onClick={() => updateQty(it.id, Math.max(baseMin, (it.qty ?? baseMin) - 1))}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                min={baseMin}
                                className="w-20 text-center"
                                disabled={disabled}
                                value={it.qty ?? baseMin}
                                onChange={(e) => {
                                  const v = Math.max(baseMin, Number(e.target.value) || baseMin);
                                  updateQty(it.id, v);
                                }}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={disabled}
                                onClick={() => updateQty(it.id, (it.qty ?? baseMin) + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" disabled={disabled} onClick={() => remove(it.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Summary */}
          <div className="space-y-6">
            <Card className="p-4">
              <div className="font-semibold mb-3">Order Summary</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Items</span>
                  <span>{cart.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">
                    {Number(cart.subtotal).toFixed(2)} {cart.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>Calculated at next step</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="font-semibold">Total (est.)</span>
                  <span className="font-semibold">
                    {Number(cart.subtotal).toFixed(2)} {cart.currency}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="font-semibold mb-3">Contact & Shipping</div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>Full name</Label>
                  <Input
                    placeholder="Your name"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    disabled={submitBusy}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    placeholder="05xx-xx-xx-xx"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    disabled={submitBusy}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    placeholder={form.delivery_method === 'pickup' ? "(optional for pickup)" : "Street, City"}
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    disabled={submitBusy}
                  />
                </div>
              </div>
              <Button
                className="w-full "
                disabled={isEmpty || submitBusy}
                onClick={submitShipping}
              >
                Continue to shipping <Truck className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
