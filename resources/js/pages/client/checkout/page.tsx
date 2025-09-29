import { useEffect, useState, useMemo, useCallback } from "react";
import { Head } from "@inertiajs/react";
import { ClientLayout } from "../layout/client-layout";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Minus, Plus, Trash2, Truck, ShoppingCart } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import CartController from "@/actions/App/Http/Controllers/Client/CartController";
import ShippingAddressController from "@/actions/App/Http/Controllers/Client/ShippingAddressController";

declare const route: (name: string, params?: any) => string;

type Id = number | string;
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
  price_retail?: number | null;     // TTC (mapped by backend)
  price_demi_gros?: number | null;  // null
  price_gros?: number | null;       // TTC wholesale (mapped by backend)
  fitment_models: string[];
  fitment_brands: string[];
  references: { type: string; code: string; source_brand?: string | null }[];
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
  cartShow: CartController.show().url,
  cartUpdate: (id: Id) => CartController.update({ part: id }).url,
  cartRemove: (id: Id) => CartController.remove({ part: id }).url,
  cartClear: CartController.clear().url,
  checkoutSubmit: CartController.submit().url,
  addressesIndex: ShippingAddressController.index().url,
};

const http = {
  get: (url: string, config: any = {}) => api.get(url, config),
  post: (url: string, body?: any, config: any = {}) => api.post(url, body, config),
  put: (url: string, body?: any, config: any = {}) => api.put(url, body, config),
  delete: (url: string, config: any = {}) => api.delete(url, config),
};

/* ---------------------- helpers for soft-merge & optimistic UI ---------------------- */

function indexById<T extends { id: number }>(arr: T[]) {
  const m = new Map<number, T>();
  arr.forEach((x) => m.set(x.id, x));
  return m;
}

/** merge server cart into current one while preserving current row order */
function softMergeCart(current: Cart, server: Cart): Cart {
  const byId = indexById(server.items);
  const kept: CartItemFull[] = [];

  for (const item of current.items) {
    const fresh = byId.get(item.id);
    if (fresh) {
      kept.push({ ...item, ...fresh }); // update fields (qty, prices, etc.)
      byId.delete(item.id);
    }
  }

  // append new items (if any)
  const appended = Array.from(byId.values());
  const items = kept.concat(appended);

  return {
    items,
    subtotal: server.subtotal,
    count: server.count,
    currency: server.currency ?? current.currency,
  };
}

/** quick local subtotal used during optimistic updates */
function computeSubtotal(items: CartItemFull[]) {
  const pickPrice = (it: CartItemFull) =>
    it.price_retail ?? it.price_gros ?? it.price_demi_gros ?? 0;
  const sum = items.reduce((acc, it) => acc + pickPrice(it) * (it.qty ?? 0), 0);
  return Number(sum.toFixed(2));
}

/* ---------------------------------- Component ---------------------------------- */

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
  const toggleRow = (id: number) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // NEW: local draft for qty so UI changes instantly
  const [qtyDraft, setQtyDraft] = useState<Record<number, number>>({});

  const fmt = (v?: number | null) => (v == null ? "–" : `${Number(v).toFixed(2)} ${cart.currency}`);

  const refreshCart = useCallback(async () => {
    setLoading(true);
    try {
      const { data: js } = await http.get(endpoints.cartShow);
      setCart({
        items: js.items ?? [],
        subtotal: js.subtotal ?? 0,
        count: js.count ?? 0,
        currency: js.currency ?? "DZD",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCartSoftMerge = useCallback(async () => {
    try {
      const { data: js } = await http.get(endpoints.cartShow);
      setCart((cur) =>
        softMergeCart(cur, {
          items: js.items ?? [],
          subtotal: js.subtotal ?? 0,
          count: js.count ?? 0,
          currency: js.currency ?? cur.currency,
        })
      );
    } catch (e) {
      console.warn("Soft cart refresh failed", e);
    }
  }, []);

  const loadAddresses = useCallback(async () => {
    setAddrLoading(true);
    try {
      const { data: js } = await http.get(endpoints.addressesIndex);
      const list: Address[] = js?.data ?? js ?? [];
      setAddresses(list);
      const def = list.find((a) => a.is_default);
      if (def) setSelectedAddressId(String(def.id));
      else if (list.length) setSelectedAddressId(String(list[0].id));
      else setSelectedAddressId("new");
    } catch (e) {
      console.error("Échec du chargement des adresses", e);
      setSelectedAddressId("new");
    } finally {
      setAddrLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
    loadAddresses();
  }, [refreshCart, loadAddresses]);

  // Keep qtyDraft in sync with cart (authoritative) whenever cart changes
  useEffect(() => {
    const next: Record<number, number> = {};
    for (const it of cart.items) {
      const base = Math.max(1, it.min_order_qty || 1);
      next[it.id] = it.qty ?? base;
    }
    setQtyDraft(next);
  }, [cart.items]);

  /* ------------------------------ optimistic actions ------------------------------ */

  const updateQty = useCallback(
    async (id: Id, qty: number) => {
      const itemId = Number(id);
      const minQty = 1;
      const safeQty = Math.max(minQty, qty);

      setBusyRow(itemId);

      // optimistic UI (cart)
      setCart((cur) => {
        const items = cur.items.map((it) => (it.id === itemId ? { ...it, qty: safeQty } : it));
        return { ...cur, items, subtotal: computeSubtotal(items), count: items.reduce((n, it) => n + (it.qty ?? 0), 0) };
      });

      try {
        await http.put(endpoints.cartUpdate(id), { quantity: safeQty });
        await fetchCartSoftMerge(); // reconcile authoritative totals/prices without reordering
      } catch (e) {
        await fetchCartSoftMerge(); // revert from server
      } finally {
        setBusyRow(null);
      }
    },
    [fetchCartSoftMerge]
  );

  const remove = useCallback(
    async (id: Id) => {
      const itemId = Number(id);
      setBusyRow(itemId);

      // optimistic remove
      setCart((cur) => {
        const items = cur.items.filter((it) => it.id !== itemId);
        return { ...cur, items, subtotal: computeSubtotal(items), count: items.reduce((n, it) => n + (it.qty ?? 0), 0) };
      });

      try {
        await http.delete(endpoints.cartRemove(id));
        await fetchCartSoftMerge();
      } catch (e) {
        await fetchCartSoftMerge();
      } finally {
        setBusyRow(null);
      }
    },
    [fetchCartSoftMerge]
  );

  const clear = useCallback(async () => {
    // optimistic clear
    setCart((cur) => ({ ...cur, items: [], subtotal: 0, count: 0 }));
    try {
      await http.delete(endpoints.cartClear);
      await fetchCartSoftMerge();
    } catch (e) {
      await fetchCartSoftMerge();
    }
  }, [fetchCartSoftMerge]);

  /* --------------------------------- checkout flow -------------------------------- */

  const needsAddress = form.delivery_method === "courier" || form.delivery_method === "post";
  const usingSavedAddress = selectedAddressId !== "new";
  const chosenAddress = useMemo(
    () => (usingSavedAddress ? addresses.find((a) => String(a.id) === selectedAddressId) ?? null : null),
    [usingSavedAddress, selectedAddressId, addresses]
  );

  const submitShipping = useCallback(async () => {
    setSubmitError(null);
    if (!cart.items.length) return;

    if (needsAddress) {
      if (usingSavedAddress) {
        if (!chosenAddress) {
          setSubmitError("Veuillez sélectionner une adresse enregistrée.");
          return;
        }
      } else if (!form.address.trim()) {
        setSubmitError("Veuillez indiquer une adresse ou sélectionner une adresse enregistrée.");
        return;
      }
    }

    if (!form.full_name.trim() || !form.phone.trim()) {
      setSubmitError("Veuillez indiquer votre nom et votre numéro de téléphone.");
      return;
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
      await refreshCart(); // normal hard refresh for the recap card after placing order
    } catch (e: any) {
      const msg =
        e?.response?.data?.errors?.address?.[0] ??
        e?.response?.data?.errors?.address_id?.[0] ??
        e?.response?.data?.errors?.cart?.[0] ??
        e?.response?.data?.message ??
        e?.message ??
        "Échec de la soumission de l'expédition.";
      setSubmitError(msg);
    } finally {
      setSubmitBusy(false);
    }
  }, [cart.items.length, needsAddress, usingSavedAddress, chosenAddress, form, refreshCart]);

  const isEmpty = cart.items.length === 0;

  /* ------------------------------------- UI ------------------------------------- */

  return (
    <ClientLayout title="Checkout">
      <div className="p-6 pt-0">
        <Head title="Checkout" />

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Paiement</h1>
          <Button size={"sm"} variant="outline" onClick={refreshCart}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Actualiser
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <Card className="p-4 gap-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Votre commande</div>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Chargement…</div>
            ) : isEmpty ? (
              <div className="text-sm text-muted-foreground">Votre panier est vide.</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px]" />
                      <TableHead className="w-[120px]">SKU</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead className="w-[260px]">Modèles compatibles</TableHead>
                      <TableHead className="w-[200px]">Qté</TableHead>
                      <TableHead className="w-[80px]">Supprimer</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {cart.items.map((it) => {
                      const disabled = busyRow === it.id;
                      const baseMin = Math.max(1, it.min_order_qty || 1);
                      const isOpen = !!expanded[it.id];
                      const DETAIL_COLSPAN = 6; // matches header cells

                      const currentDraft = qtyDraft[it.id] ?? it.qty ?? baseMin;

                      const commitQty = (next: number) => {
                        const safe = Math.max(baseMin, Number(next) || baseMin);
                        if (safe !== it.qty) {
                          // keep the input updated immediately
                          setQtyDraft((d) => ({ ...d, [it.id]: safe }));
                          updateQty(it.id, safe);
                        } else {
                          // still sync draft to safe (in case of invalid typing)
                          setQtyDraft((d) => ({ ...d, [it.id]: safe }));
                        }
                      };

                      return (
                        <>
                          <TableRow key={`row-${it.id}`}>
                            <TableCell className="p-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 transition-transform ${isOpen ? "rotate-90" : ""}`}
                                onClick={() => toggleRow(it.id)}
                                title={isOpen ? "Masquer les détails" : "Afficher les détails"}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </TableCell>

                            <TableCell className="font-mono text-xs">{it.sku || "—"}</TableCell>
                            <TableCell className="font-medium">{it.name}</TableCell>
                            <TableCell className="text-xs truncate max-w-[260px]">
                              {it.fitment_models?.length ? it.fitment_models.join(", ") : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  disabled={disabled}
                                  onClick={() => {
                                    const next = Math.max(baseMin, currentDraft - 1);
                                    setQtyDraft((d) => ({ ...d, [it.id]: next }));
                                    commitQty(next);
                                  }}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                {/* Controlled input bound to qtyDraft */}
                                <Input
                                  type="number"
                                  min={baseMin}
                                  className="remove_arrows w-20 text-center"
                                  disabled={disabled}
                                  value={currentDraft}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = Math.max(baseMin, Number(raw) || 0);
                                    setQtyDraft((d) => ({ ...d, [it.id]: val }));
                                  }}
                                  onBlur={(e) => commitQty(Number(e.target.value))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") commitQty(Number((e.target as HTMLInputElement).value));
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  disabled={disabled}
                                  onClick={() => {
                                    const next = currentDraft + 1;
                                    setQtyDraft((d) => ({ ...d, [it.id]: next }));
                                    commitQty(next);
                                  }}
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

                          {isOpen && (
                            <TableRow key={`detail-${it.id}`} className="bg-muted/30">
                              <TableCell colSpan={DETAIL_COLSPAN} className="p-0">
                                <div className="p-4 border-t">
                                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                    {/* Image */}
                                    <div className="lg:col-span-1">
                                      <div className="aspect-video rounded-md border overflow-hidden flex items-center justify-center bg-background">
                                        {it.image ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={it.image} alt={it.name} className="object-contain w-full h-full" />
                                        ) : (
                                          <div className="text-sm text-muted-foreground">No image</div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Details */}
                                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                      <div className="space-y-1">
                                        <div className="font-medium">Identifiants</div>
                                        <div>
                                          <span className="text-muted-foreground">SKU:</span> {it.sku || "—"}
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Fabricant:</span>{" "}
                                          {it.manufacturer?.name || "—"}
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Commande minimum:</span>{" "}
                                          {it.min_order_qty ?? "—"}
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Prix minimum (Gros):</span>{" "}
                                          {it.min_qty_gros ?? "—"}
                                        </div>
                                      </div>

                                      <div className="space-y-1">
                                        <div className="font-medium">Prix (TTC)</div>
                                        <div>
                                          <span className="text-muted-foreground">Prix de détail:</span> {fmt(it.price_retail)}
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Demi-gros:</span>{" "}
                                          {fmt(it.price_demi_gros)}
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Gros:</span> {fmt(it.price_gros)}
                                        </div>
                                      </div>

                                      <div className="space-y-1 md:col-span-1">
                                        <div className="font-medium">Montage</div>
                                        <div>
                                          <span className="text-muted-foreground">Modèles:</span>{" "}
                                          {it.fitment_models?.length ? it.fitment_models.join(", ") : "—"}
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Marques:</span>{" "}
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
              <div className="font-semibold">Récapitulatif de la commande</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Articles</span>
                  <span>{cart.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sous-total</span>
                  <span className="font-medium">
                    {Number(cart.subtotal).toFixed(2)} {cart.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Frais de port</span>
                  <span>Calculé à l'étape suivante</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="font-semibold">Total (estimé)</span>
                  <span className="font-semibold">
                    {Number(cart.subtotal).toFixed(2)} {cart.currency}
                  </span>
                </div>
              </div>
              {!isEmpty && (
                <div className="mt-3">
                  <Button variant="ghost" size="sm" onClick={clear}>
                    Vider le panier
                  </Button>
                </div>
              )}
            </Card>

            <Card className="p-4 gap-3">
              <div className="font-semibold">Contact</div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <Input
                    placeholder="Your name"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    disabled={submitBusy}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    placeholder="05xx-xx-xx-xx"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    disabled={submitBusy}
                  />
                </div>
              </div>

              <div className="font-semibold pt-2">Mode de livraison</div>
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
                  <div className="font-semibold pt-2">Adresse de livraison</div>

                  {addrLoading ? (
                    <div className="text-sm text-muted-foreground">Chargement des adresses...</div>
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
                              {a.label || "Address"} {a.is_default && <span className="ml-2 text-xs">• Par défaut</span>}
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

                      <label
                        className={cn(
                          "flex gap-3 rounded-md border p-3 cursor-pointer",
                          selectedAddressId === "new" && "border-primary ring-1 ring-primary/30"
                        )}
                      >
                        <RadioGroupItem value="new" />
                        <div className="text-sm">
                          <div className="font-medium">Utiliser une autre adresse</div>
                          <div className="text-muted-foreground">Saisissez-la ci-dessous</div>
                        </div>
                      </label>
                    </RadioGroup>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Vous n'avez pas d'adresse enregistrée. Saisissez-en une nouvelle ci-dessous.
                    </div>
                  )}

                  {selectedAddressId === "new" && (
                    <div className="pt-2">
                      <Label>Adresse</Label>
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
                  Retrait sélectionné — adresse facultative (vous pouvez toujours ajouter des instructions).
                </div>
              )}

              {!!submitError && <div className="text-sm text-red-600">{submitError}</div>}

              <Button className="w-full" disabled={isEmpty || submitBusy} onClick={submitShipping}>
                Continuer vers l'expédition <Truck className="ml-2 h-4 w-4" />
              </Button>

              {placed && (
                <div className="text-sm mt-2">
                  Commande <span className="font-mono">#{placed.order_id}</span> passée. Total:{" "}
                  <span className="font-semibold">
                    {placed.grand_total} {cart.currency}
                  </span>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
