"use client";

import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, ShoppingCart, Trash, RefreshCw } from "lucide-react";

// ===================== Types =====================

type Id = number | string;

interface Category { id: Id; name: string }
interface Manufacturer { id: Id; name: string }

interface PartRow {
  id: Id;
  sku?: string | null;
  name: string;
  category?: { id: Id; name: string } | null;
  manufacturer?: { id: Id; name: string } | null;
  base_price?: string | number | null;
  currency?: string;
  is_active: boolean | 0 | 1;
}

interface Page<T> { data: T[]; total: number; page: number; per_page: number }

interface CartItem {
  part_id: number;
  name: string;
  sku?: string | null;
  unit_price: number;
  currency: string;
  qty: number;
  line_total: number;
}

interface CartSummary {
  currency: string;
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
}

// ===================== Config =====================

const endpoints = {
  // Catalog
  parts: "/api/client/parts", // GET index (filters & pagination)
  categories: "/api/client/categories?per_page=1000",
  manufacturers: "/api/client/manufacturers?per_page=1000",

  // Cart (Draft Order) — implement these in Laravel as thin controllers over orders/order_items
  cart: "/api/client/cart", // GET current draft order with items+totals
  cartAdd: "/api/client/cart/items", // POST { part_id, qty }
  cartUpdate: (partId: Id) => `/api/client/cart/items/${partId}`, // PUT { qty }
  cartRemove: (partId: Id) => `/api/client/cart/items/${partId}`, // DELETE
  cartPlace: "/api/client/cart/place", // POST -> returns { order_id }
};

// ===================== API utils =====================

async function jsonGet<T>(url: string) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

async function jsonSend<T>(url: string, method: string, body?: any) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Accept: "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

// ===================== Cart Hook =====================

function useCart() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await jsonGet<{ items: CartItem[]; summary: CartSummary }>(endpoints.cart);
      setItems(data.items);
      setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  };

  const add = async (part_id: number, qty = 1) => {
    await jsonSend(endpoints.cartAdd, "POST", { part_id, qty });
    await refresh();
    setOpen(true);
  };

  const update = async (part_id: number, qty: number) => {
    await jsonSend(endpoints.cartUpdate(part_id), "PUT", { qty });
    await refresh();
  };

  const remove = async (part_id: number) => {
    await jsonSend(endpoints.cartRemove(part_id), "DELETE");
    await refresh();
  };

  const place = async () => {
    const res = await jsonSend<{ order_id: number }>(endpoints.cartPlace, "POST");
    await refresh();
    return res.order_id;
  };

  useEffect(() => { refresh(); }, []);

  return { open, setOpen, items, summary, loading, refresh, add, update, remove, place };
}

// ===================== Parts Catalog Page =====================

export default function PartsCatalog() {
  // Filters & paging state
  const [pageData, setPageData] = useState<Page<PartRow>>({ data: [], total: 0, page: 1, per_page: 12 });
  const [cats, setCats] = useState<Category[]>([]);
  const [mans, setMans] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    category_id: "",
    manufacturer_id: "",
    is_active: "1", // default only active items for clients
    keyword: "", // maps to sku + reference_code contains; backend supports those
  });

  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);

  // load lookups
  useEffect(() => {
    (async () => {
      const [c, m] = await Promise.all([
        jsonGet<{ data: Category[] } | Category[]>(endpoints.categories),
        jsonGet<{ data: Manufacturer[] } | Manufacturer[]>(endpoints.manufacturers),
      ]);
      setCats(Array.isArray(c) ? c : c.data);
      setMans(Array.isArray(m) ? m : m.data);
    })();
  }, []);

  // fetch table rows
  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(pageData.per_page),
      });
      if (filters.category_id) params.set("category_id", filters.category_id);
      if (filters.manufacturer_id) params.set("manufacturer_id", filters.manufacturer_id);
      if (filters.is_active !== "") params.set("is_active", filters.is_active);
      if (filters.keyword.trim()) {
        // Map a single keyword to multiple supported filters on backend
        params.set("sku", filters.keyword.trim());
        params.set("reference_code", filters.keyword.trim());
      }

      const res = await jsonGet<Page<PartRow>>(endpoints.parts + "?" + params.toString());
      setPageData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(1); }, [filters.category_id, filters.manufacturer_id, filters.is_active]);

  // Cart
  const cart = useCart();

  // quick qty local cache
  const [qtyDraft, setQtyDraft] = useState<Record<string, number>>({});

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-2xl font-semibold">Catalog</div>
          <p className="text-muted-foreground text-sm">Search and add parts to your cart.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(pageData.page)}>
            <RefreshCw className="h-4 w-4 mr-2"/> Refresh
          </Button>
          <Sheet open={cart.open} onOpenChange={cart.setOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="relative">
                <ShoppingCart className="h-4 w-4 mr-2"/>
                Cart
                {!!cart.items.length && (
                  <Badge className="ml-2" variant="secondary">{cart.items.length}</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[480px] sm:w-[560px]">
              <SheetHeader>
                <SheetTitle>Your Cart</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {!cart.items.length && <div className="text-sm text-muted-foreground">Cart is empty.</div>}
                {cart.items.map((it) => (
                  <div key={it.part_id} className="flex items-start justify-between gap-3 border rounded-lg p-3">
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-muted-foreground">SKU: {it.sku || "—"}</div>
                      <div className="text-sm mt-1">{it.unit_price} {it.currency} × {it.qty} = <span className="font-semibold">{it.line_total} {it.currency}</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20"
                        value={it.qty}
                        min={1}
                        onChange={(e) => cart.update(it.part_id, Math.max(1, Number(e.target.value || 1)))}
                      />
                      <Button variant="ghost" size="icon" onClick={() => cart.remove(it.part_id)}>
                        <Trash className="h-4 w-4"/>
                      </Button>
                    </div>
                  </div>
                ))}

                {cart.summary && (
                  <div className="border rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{cart.summary.subtotal} {cart.summary.currency}</span></div>
                    <div className="flex justify-between"><span>Discount</span><span>- {cart.summary.discount_total} {cart.summary.currency}</span></div>
                    <div className="flex justify-between"><span>Shipping</span><span>{cart.summary.shipping_total} {cart.summary.currency}</span></div>
                    <div className="flex justify-between"><span>Tax</span><span>{cart.summary.tax_total} {cart.summary.currency}</span></div>
                    <div className="flex justify-between font-semibold text-base pt-1 border-t mt-1"><span>Total</span><span>{cart.summary.grand_total} {cart.summary.currency}</span></div>
                    <Button className="w-full mt-3" disabled={!cart.items.length} onClick={async () => {
                      const orderId = await cart.place();
                      // Optional: navigate to order confirmation page via Inertia
                      router.visit(`/orders/${orderId}`);
                    }}>Place Order</Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={filters.category_id} onValueChange={(v) => setFilters({ ...filters, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {cats.map(c => <SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Select value={filters.manufacturer_id} onValueChange={(v) => setFilters({ ...filters, manufacturer_id: v })}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {mans.map(m => <SelectItem key={String(m.id)} value={String(m.id)}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filters.is_active} onValueChange={(v) => setFilters({ ...filters, is_active: v })}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Search (SKU / Reference)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 1K0615301 or ABC-123"
                  value={filters.keyword}
                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") fetchData(1); }}
                />
                <Button variant="secondary" onClick={() => fetchData(1)}>Apply</Button>
                <Button variant="ghost" onClick={() => { setFilters({ category_id: "", manufacturer_id: "", is_active: "1", keyword: "" }); }}>Reset</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead className="w-[140px]">SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[160px]">Category</TableHead>
              <TableHead className="w-[160px]">Manufacturer</TableHead>
              <TableHead className="w-[120px]">Price</TableHead>
              <TableHead className="w-[160px]">Add</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!pageData.data.length || loading) && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{loading?"Loading...":"No results"}</TableCell></TableRow>
            )}
            {pageData.data.map((row) => (
              <TableRow key={String(row.id)} className={!row.is_active ? "opacity-60" : ""}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.sku || "—"}</TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.category?.name || "—"}</TableCell>
                <TableCell>{row.manufacturer?.name || "—"}</TableCell>
                <TableCell>{row.base_price ? `${row.base_price} ${row.currency || "DZD"}` : "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24"
                      min={1}
                      value={qtyDraft[String(row.id)] ?? 1}
                      onChange={(e) => setQtyDraft((s) => ({ ...s, [String(row.id)]: Math.max(1, Number(e.target.value || 1)) }))}
                    />
                    <Button size="sm" disabled={!row.is_active} onClick={() => cart.add(Number(row.id), qtyDraft[String(row.id)] ?? 1)}>
                      <ShoppingCart className="h-4 w-4 mr-2"/> Add
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {pageData.total ? `${(pageData.page - 1) * pageData.per_page + 1}-${Math.min(pageData.total, pageData.page * pageData.per_page)} of ${pageData.total}` : "0"}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData(Math.max(1, pageData.page - 1))} disabled={pageData.page <= 1}><ChevronLeft className="h-4 w-4"/></Button>
          <div className="text-sm">Page {pageData.page} / {maxPage}</div>
          <Button variant="outline" size="icon" onClick={() => fetchData(Math.min(maxPage, pageData.page + 1))} disabled={pageData.page >= maxPage}><ChevronRight className="h-4 w-4"/></Button>
        </div>
      </div>
    </div>
  );
}
