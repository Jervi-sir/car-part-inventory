import { useEffect, useState, useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import { ClientLayout } from "../layout/client-layout";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Minus, Plus, Trash2, Truck, ShoppingCart, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import api from "@/lib/api"; // path to the axios code you pasted

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

type Address = {
  id: number;
  label?: string | null;
  recipient_name?: string | null;
  phone?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state?: string | null;
  postal_code?: string | null;
  country: string;
  is_default: boolean;
};

const endpoints = {
  cartShow: route("shop.api.cart.show"),
  cartUpdate: (id: Id) => route("shop.api.cart.update", { part: id }),
  cartRemove: (id: Id) => route("shop.api.cart.remove", { part: id }),
  cartClear: route("shop.api.cart.clear"),
  checkoutSubmit: route("shop.api.checkout.submit"),
  addressesIndex: route("client.settings.api.shipping-addresses.crud"),
};

// 👇 new http wrapper with axios
const http = {
  get: (url: string, config: any = {}) => api.get(url, config),
  post: (url: string, body?: any, config: any = {}) => api.post(url, body, config),
  put: (url: string, body?: any, config: any = {}) => api.put(url, body, config),
  delete: (url: string, config: any = {}) => api.delete(url, config),
};



export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart>({ items: [], subtotal: 0, count: 0, currency: "DZD" });
  const [loading, setLoading] = useState(true);
  const [busyRow, setBusyRow] = useState<number | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState(true);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    delivery_method: "pickup" as "pickup" | "courier" | "post",
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ order_id: number; grand_total: number } | null>(null);

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toggleRow = (id: number) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const fmt = (v?: number | null) =>
    v == null ? "–" : `${Number(v).toFixed(2)} ${cart.currency}`;

  const refreshCart = async () => {
    setLoading(true);
    const { data: js } = await http.get(endpoints.cartShow);
    setCart({
      items: js.items ?? [],
      subtotal: js.subtotal ?? 0,
      count: js.count ?? 0,
      currency: js.currency ?? "DZD",
    });
    setLoading(false);
  };

  const loadAddresses = async () => {
    setAddrLoading(true);
    try {
      const { data: js } = await http.get(endpoints.addressesIndex);
      const list: Address[] = js?.data ?? js ?? [];
      setAddresses(list);
      const def = list.find(a => a.is_default);
      if (def) setSelectedAddressId(String(def.id));
      else if (list.length) setSelectedAddressId(String(list[0].id));
      else setSelectedAddressId("new");
    } catch (e) {
      console.error("Failed loading addresses", e);
      setSelectedAddressId("new");
    } finally {
      setAddrLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
    loadAddresses();
  }, []);

  const updateQty = async (id: Id, qty: number) => {
    setBusyRow(Number(id));
    await http.put(endpoints.cartUpdate(id), { quantity: qty });
    await refreshCart();
    setBusyRow(null);
    await router.reload({
      only: ["cart"],
      preserveState: true,
      preserveScroll: true,
    });
  };

  const remove = async (id: Id) => {
    setBusyRow(Number(id));
    await http.delete(endpoints.cartRemove(id));
    await refreshCart();
    setBusyRow(null);
    await router.reload({
      only: ["cart"],
      preserveState: true,
      preserveScroll: true,
    });
  };

  const clear = async () => {
    setLoading(true);
    await http.delete(endpoints.cartClear);
    await refreshCart();
  };

  const needsAddress = form.delivery_method === "courier" || form.delivery_method === "post";
  const usingSavedAddress = selectedAddressId !== "new";
  const chosenAddress = useMemo(
    () => (usingSavedAddress ? addresses.find(a => String(a.id) === selectedAddressId) ?? null : null),
    [usingSavedAddress, selectedAddressId, addresses]
  );

  const submitShipping = async () => {
    setSubmitError(null);
    if (!cart.items.length) return;
    if (needsAddress) {
      if (!usingSavedAddress && !form.address.trim()) {
        setSubmitError("Please provide an address or select a saved one.");
        return;
      }
    }

    setSubmitBusy(true);
    try {
      const payload: any = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        delivery_method: form.delivery_method,
      };

      if (needsAddress) {
        if (usingSavedAddress && chosenAddress) {
          payload.address_id = chosenAddress.id;
        } else {
          payload.address = form.address.trim();
        }
      } else {
        if (form.address.trim()) payload.address = form.address.trim();
      }

      const res = await http.post(endpoints.checkoutSubmit, payload);

      const js = res.data;
      setPlaced({ order_id: js.order_id, grand_total: js.grand_total });
      await refreshCart();
    } catch (e: any) {
      const msg =
        e?.response?.data?.errors?.address?.[0] ??
        e?.response?.data?.errors?.address_id?.[0] ??
        e?.response?.data?.errors?.cart?.[0] ??
        e?.response?.data?.message ??
        e?.message ??
        "Failed to submit shipping.";
      setSubmitError(msg);
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
          <Button size={'sm'} variant="outline" onClick={refreshCart}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order items */}
          <Card className="p-4 gap-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Your Order</div>
              {/* {!isEmpty && (
                <Button variant="ghost" size="sm" onClick={clear}>
                  <X className="h-4 w-4 mr-2" /> Clear cart
                </Button>
              )} */}
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
                      {/* NEW: toggle column */}
                      <TableHead className="w-[44px]"></TableHead>
                      <TableHead className="w-[120px]">SKU</TableHead>
                      <TableHead>Name</TableHead>
                      {/* <TableHead className="w-[180px]">Manufacturer</TableHead> */}
                      <TableHead className="w-[260px]">Fitment Models</TableHead>
                      {/* <TableHead className="w-[220px]">Fitment Brands</TableHead> */}
                      {/* <TableHead className="w-[110px]">Min Order</TableHead> */}
                      {/* <TableHead className="w-[110px]">Min (Gros)</TableHead> */}
                      {/* <TableHead className="w-[120px]">Retail</TableHead> */}
                      {/* <TableHead className="w-[140px]">Demi-gros</TableHead> */}
                      {/* <TableHead className="w-[120px]">Gros</TableHead> */}
                      {/* <TableHead className="w-[260px]">References</TableHead> */}
                      <TableHead className="w-[200px]">Qty</TableHead>
                      <TableHead className="w-[80px]">Remove</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {cart.items.map((it) => {
                      const disabled = busyRow === it.id;
                      const baseMin = Math.max(1, it.min_order_qty || 1);
                      const isOpen = !!expanded[it.id];
                      // header has 14 cells now → colSpan for detail row:
                      const DETAIL_COLSPAN = 14;

                      return (
                        <>
                          <TableRow key={`row-${it.id}`}>
                            {/* NEW: toggle cell */}
                            <TableCell className="p-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 transition-transform ${isOpen ? "rotate-90" : ""}`}
                                onClick={() => toggleRow(it.id)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </TableCell>

                            <TableCell className="font-mono text-xs">{it.sku || "—"}</TableCell>
                            <TableCell className="font-medium">{it.name}</TableCell>
                            {/* <TableCell>{it.manufacturer?.name || "—"}</TableCell> */}
                            <TableCell className="text-xs truncate max-w-[260px]">
                              {it.fitment_models?.length ? it.fitment_models.join(", ") : "—"}
                            </TableCell>
                            {/* <TableCell className="text-xs truncate max-w-[220px]">
                              {it.fitment_brands?.length ? it.fitment_brands.join(", ") : "—"}
                            </TableCell> */}
                            {/* <TableCell>{it.min_order_qty}</TableCell> */}
                            {/* <TableCell>{it.min_qty_gros}</TableCell> */}
                            {/* <TableCell>{fmt(it.price_retail)}</TableCell> */}
                            {/* <TableCell>{fmt(it.price_demi_gros)}</TableCell> */}
                            {/* <TableCell>{fmt(it.price_gros)}</TableCell> */}
                            {/* <TableCell className="text-xs truncate max-w-[260px]">
                              {it.references?.length
                                ? it.references
                                  .map(r => `${r.code}${r.source_brand ? ` (${r.source_brand})` : ""}${r.type ? ` [${r.type}]` : ""}`)
                                  .join(", ")
                                : "—"}
                            </TableCell> */}
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
                                  className="remove_arrows w-20 text-center"
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

                          {/* NEW: detail row */}
                          {isOpen && (
                            <TableRow key={`detail-${it.id}`} className="bg-muted/30">
                              <TableCell colSpan={DETAIL_COLSPAN} className="p-0">
                                <div className="p-4 border-t">
                                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                    {/* Image */}
                                    {/* <div className="lg:col-span-1">
                                      <div className="aspect-video rounded-md border overflow-hidden flex items-center justify-center bg-background">
                                        {it.image ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={it.image} alt={it.name} className="object-contain w-full h-full" />
                                        ) : (
                                          <div className="text-sm text-muted-foreground">No image</div>
                                        )}
                                      </div>
                                    </div> */}

                                    {/* Details */}
                                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                      <div className="space-y-1">
                                        <div className="font-medium">Identifiers</div>
                                        <div><span className="text-muted-foreground">SKU:</span> {it.sku || "—"}</div>
                                        <div><span className="text-muted-foreground">Category:</span> {it.category?.name || "—"}</div>
                                        <div><span className="text-muted-foreground">Manufacturer:</span> {it.manufacturer?.name || "—"}</div>
                                        <div><span className="text-muted-foreground">Min Order:</span> {it.min_order_qty ?? "—"}</div>
                                        <div><span className="text-muted-foreground">Min (Gros):</span> {it.min_qty_gros ?? "—"}</div>
                                      </div>

                                      <div className="space-y-1">
                                        <div className="font-medium">Pricing</div>
                                        <div><span className="text-muted-foreground">Retail:</span> {fmt(it.price_retail)}</div>
                                        <div><span className="text-muted-foreground">Demi-gros:</span> {fmt(it.price_demi_gros)}</div>
                                        <div><span className="text-muted-foreground">Gros:</span> {fmt(it.price_gros)}</div>
                                      </div>

                                      <div className="space-y-1 md:col-span-1">
                                        <div className="font-medium">References</div>
                                        <div className="max-h-32 overflow-auto pr-1">
                                          {it.references?.length ? (
                                            <ul className="list-disc pl-4">
                                              {it.references.map((r, idx) => (
                                                <li key={idx} className="break-all">
                                                  <span className="font-mono">{r.code}</span>
                                                  {r.source_brand ? <> • {r.source_brand}</> : null}
                                                  {r.type ? <> • <span className="uppercase">{r.type}</span></> : null}
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <div className="text-muted-foreground">No references</div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="space-y-1 md:col-span-3">
                                        <div className="font-medium">Fitment</div>
                                        <div>
                                          <span className="text-muted-foreground">Models:</span>{" "}
                                          {it.fitment_models?.length ? it.fitment_models.join(", ") : "—"}
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Brands:</span>{" "}
                                          {it.fitment_brands?.length ? it.fitment_brands.join(", ") : "—"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

            )}
          </Card>

          {/* Right column */}
          <div className="space-y-6">
            <Card className="p-4 gap-3">
              <div className="font-semibold">Order Summary</div>
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

            <Card className="p-4 gap-3">
              <div className="font-semibold">Contact</div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input
                    placeholder="Your name"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    disabled={submitBusy}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="05xx-xx-xx-xx"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    disabled={submitBusy}
                  />
                </div>
              </div>

              <div className="font-semibold pt-2">Delivery Method</div>
              <RadioGroup
                className="grid grid-cols-3 gap-2"
                value={form.delivery_method}
                onValueChange={(v) => setForm((f) => ({ ...f, delivery_method: v as any }))}
              >
                {(["pickup", "courier", "post"] as const).map((opt) => (
                  <label
                    key={opt}
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2 cursor-pointer",
                      form.delivery_method === opt && "border-primary ring-1 ring-primary/30"
                    )}
                  >
                    <RadioGroupItem value={opt} />
                    <span className="capitalize">{opt}</span>
                  </label>
                ))}
              </RadioGroup>

              {needsAddress && (
                <>
                  <div className="font-semibold pt-2">Shipping Address</div>

                  {/* Saved address selector */}
                  {addrLoading ? (
                    <div className="text-sm text-muted-foreground">Loading addresses...</div>
                  ) : addresses.length ? (
                    <RadioGroup
                      className="space-y-2"
                      value={selectedAddressId}
                      onValueChange={(v) => setSelectedAddressId(v)}
                    >
                      {addresses.map((a) => (
                        <label
                          key={a.id}
                          className={cn(
                            "flex gap-3 rounded-md border p-3 cursor-pointer",
                            String(a.id) === selectedAddressId && "border-primary ring-1 ring-primary/30"
                          )}
                        >
                          <RadioGroupItem value={String(a.id)} />
                          <div className="text-sm">
                            <div className="font-medium">
                              {a.label || "Address"} {a.is_default && <span className="ml-2 text-xs">• Default</span>}
                            </div>
                            <div className="text-muted-foreground">
                              {a.recipient_name ? `${a.recipient_name} • ` : ""}
                              {a.phone || ""}
                            </div>
                            <div>
                              {a.address_line1}
                              {a.address_line2 ? `, ${a.address_line2}` : ""}, {a.city}
                              {a.state ? `, ${a.state}` : ""} {a.postal_code || ""} • {a.country}
                            </div>
                          </div>
                        </label>
                      ))}

                      {/* New address option */}
                      <label
                        className={cn(
                          "flex gap-3 rounded-md border p-3 cursor-pointer",
                          selectedAddressId === "new" && "border-primary ring-1 ring-primary/30"
                        )}
                      >
                        <RadioGroupItem value="new" />
                        <div className="text-sm">
                          <div className="font-medium">Use a different address</div>
                          <div className="text-muted-foreground">Enter it below</div>
                        </div>
                      </label>
                    </RadioGroup>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      You don’t have saved addresses. Enter a new one below.
                    </div>
                  )}

                  {/* Free-text input only when "new" is selected */}
                  {selectedAddressId === "new" && (
                    <div className="pt-2">
                      <Label>Address</Label>
                      <Input
                        placeholder="Street, City"
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        disabled={submitBusy}
                      />
                    </div>
                  )}
                </>
              )}

              {!needsAddress && (
                <div className="text-xs text-muted-foreground">
                  Pickup selected — address optional (you may still add instructions).
                </div>
              )}

              {!!submitError && (
                <div className="text-sm text-red-600">{submitError}</div>
              )}

              <Button className="w-full" disabled={isEmpty || submitBusy} onClick={submitShipping}>
                Continue to shipping <Truck className="ml-2 h-4 w-4" />
              </Button>

              {placed && (
                <div className="text-sm mt-2">
                  Order <span className="font-mono">#{placed.order_id}</span> placed. Total:{" "}
                  <span className="font-semibold">{placed.grand_total} {cart.currency}</span>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
