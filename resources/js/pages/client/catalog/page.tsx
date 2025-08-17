import { useEffect, useMemo, useRef, useState } from "react";
import { Head } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ShoppingCart, Trash2, Plus, Minus, RefreshCw } from "lucide-react";
import { ClientLayout } from "../layout/client-layout";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";

const csrf = (typeof document !== "undefined" && (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content) || "";
const baseHeaders = (json = true) => ({
  Accept: "application/json",
  ...(json ? { "Content-Type": "application/json" } : {}),
  "X-CSRF-TOKEN": csrf,
  "X-Requested-With": "XMLHttpRequest",
});
const http = {
  get: (url: string) => fetch(url, { method: "GET", headers: baseHeaders(false), credentials: "same-origin" }),
  post: (url: string, body?: any) => fetch(url, { method: "POST", headers: baseHeaders(), credentials: "same-origin", body: body ? JSON.stringify(body) : undefined }),
  put: (url: string, body?: any) => fetch(url, { method: "PUT", headers: baseHeaders(), credentials: "same-origin", body: body ? JSON.stringify(body) : undefined }),
  delete: (url: string) => fetch(url, { method: "DELETE", headers: baseHeaders(false), credentials: "same-origin" }),
};

declare const route: (name: string, params?: any) => string;

type Id = number | string;
type Page<T> = { data: T[]; total: number; page: number; per_page: number };

type Category = { id: Id; name: string };
type Manufacturer = { id: Id; name: string };
type VehicleBrand = { id: number; name: string };
type VehicleModel = { id: number; name: string; year_from?: number | null; year_to?: number | null };

type PartRow = {
  id: number;
  sku?: string | null;
  name: string;
  image?: string | null;
  manufacturer?: { id: Id; name: string } | null;
  category?: { id: Id; name: string } | null;

  min_order_qty: number;
  min_qty_gros: number;
  price_retail?: number | null;
  price_demi_gros?: number | null;
  price_gros?: number | null;

  fitment_models: string[];   // NEW
  fitment_brands: string[];   // NEW
  references: { type: string; code: string; source_brand?: string | null }[]; // NEW
};

type CartItem = { id: number; name: string; unit_price: number; qty: number; image?: string | null; sku?: string | null };

const endpoints = {
  parts: route("shop.api.parts"),
  cartShow: route("shop.api.cart.show"),
  cartAdd: route("shop.api.cart.add"),
  cartUpdate: (id: Id) => route("shop.api.cart.update", { part: id }),
  cartRemove: (id: Id) => route("shop.api.cart.remove", { part: id }),
  cartClear: route("shop.api.cart.clear"),

  cats: route("lookup.api.categories"),
  mans: route("lookup.api.manufacturers"),
  vbrands: route("lookup.api.vehicle-brands"),
  vmodels: (brandId: Id) => `${route("lookup.api.vehicle-models")}?vehicle_brand_id=${brandId}`,
};

export default function CatalogPage() {
  const [filters, setFilters] = useState({
    q: "",
    category_id: "all",
    manufacturer_id: "all",
    vehicle_brand_id: "all",
    vehicle_model_id: "all",
  });
  const [pageData, setPageData] = useState<Page<PartRow>>({ data: [], total: 0, page: 1, per_page: 12 });

  const [cats, setCats] = useState<Category[]>([]);
  const [mans, setMans] = useState<Manufacturer[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);

  const [cart, setCart] = useState<{ items: CartItem[]; subtotal: number; count: number; currency: string }>({ items: [], subtotal: 0, count: 0, currency: "DZD" });

  const [qtyById, setQtyById] = useState<Record<number, number>>({});
  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);
  // State for column visibility
  const defaultColumnVisibility = {
    sku: true,
    name: true,
    manufacturer: true,
    fitmentModels: true,
    fitmentBrands: true,
    minOrderQty: true,
    minQtyGros: true,
    priceRetail: true,
    priceDemiGros: true,
    priceGros: true,
    references: true,
    qty: true,
    add: true,
  };
  // Initialize column visibility from localStorage or default
  const [columnVisibility, setColumnVisibility] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("catalogColumnVisibility");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Ensure all keys exist, fallback to default if missing
          return { ...defaultColumnVisibility, ...parsed };
        } catch (e) {
          console.error("Failed to parse column visibility from localStorage:", e);
        }
      }
    }
    return defaultColumnVisibility;
  });
  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("catalogColumnVisibility", JSON.stringify(columnVisibility));
    }
  }, [columnVisibility]);

  useEffect(() => {
    (async () => {
      const [c, m, b] = await Promise.all([http.get(endpoints.cats), http.get(endpoints.mans), http.get(endpoints.vbrands)]);
      const [cj, mj, bj] = await Promise.all([c.json(), m.json(), b.json()]);
      const ext = (x: any) => (Array.isArray(x?.data) ? x.data : x?.data ?? []);
      setCats(ext(cj));
      setMans(ext(mj));
      setBrands(ext(bj));
    })();
    refreshCart();
  }, []);

  const refreshCart = async () => {
    const res = await http.get(endpoints.cartShow);
    const js = await res.json();
    setCart({ items: js.items ?? [], subtotal: js.subtotal ?? 0, count: js.count ?? 0, currency: js.currency ?? "DZD" });
  };
  const reqRef = useRef(0);

  const refreshParts = async (page = 1) => {
    const myReq = ++reqRef.current;
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(pageData.per_page),
      q: filters.q,
      category_id: filters.category_id,
      manufacturer_id: filters.manufacturer_id,
      vehicle_brand_id: filters.vehicle_brand_id,
      vehicle_model_id: filters.vehicle_model_id,
    });

    const res = await http.get(`${endpoints.parts}?${params.toString()}`);
    const js = await res.json();

    if (myReq !== reqRef.current) return;

    setPageData(js);

    const next: Record<number, number> = {};
    (js.data ?? []).forEach((r: PartRow) => {
      next[r.id] = qtyById[r.id] ?? 1;
    });
    setQtyById((q) => ({ ...next, ...q }));
  };

  useEffect(() => {
    refreshParts(1);
  }, [filters.q]);

  useEffect(() => {
    refreshParts(1);
  }, [filters.category_id, filters.manufacturer_id, filters.vehicle_brand_id, filters.vehicle_model_id]);

  useEffect(() => {
    (async () => {
      if (filters.vehicle_brand_id && filters.vehicle_brand_id !== "all") {
        const res = await http.get(endpoints.vmodels(filters.vehicle_brand_id));
        const js = await res.json();
        const ext = (x: any) => (Array.isArray(x?.data) ? x.data : x?.data ?? []);
        setModels(ext(js));
      } else {
        setModels([]);
        setFilters((f) => ({ ...f, vehicle_model_id: "all" }));
      }
    })();
  }, [filters.vehicle_brand_id]);

  const addToCart = async (id: number) => {
    await http.post(endpoints.cartAdd, { part_id: id, quantity: qtyById[id] ?? 1 });
    await refreshCart();
  };

  return (
    <ClientLayout title="Catalog">
      <div className="max-w-7xl mx-auto p-6">
        <Head title="Shop" />
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Catalog</h1>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Columns</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Table Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                  {Object.keys(columnVisibility).map((key) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={columnVisibility[key as keyof typeof columnVisibility]}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev: any) => ({ ...prev, [key]: checked }))
                    }
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <CartWidget cart={cart} refreshCart={refreshCart} />
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            <div className="md:col-span-2 space-y-2">
              <Label>Search</Label>
              <div className="flex gap-2">
                <Input placeholder="Name, SKU, reference..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
                {/* <Button variant="outline" onClick={() => refreshParts(1)}><RefreshCw className="h-4 w-4" /></Button> */}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={filters.category_id} onValueChange={(v) => setFilters({ ...filters, category_id: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {cats.map(c => <SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Select value={filters.manufacturer_id} onValueChange={(v) => setFilters({ ...filters, manufacturer_id: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {mans.map(m => <SelectItem key={String(m.id)} value={String(m.id)}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={filters.vehicle_brand_id} onValueChange={(v) => setFilters({ ...filters, vehicle_brand_id: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {brands.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={filters.vehicle_model_id} onValueChange={(v) => setFilters({ ...filters, vehicle_model_id: v })} disabled={!models.length}>
                <SelectTrigger className="w-full"><SelectValue placeholder={models.length ? "All" : "Pick brand first"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {models.map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}{m.year_from ? ` (${m.year_from}${m.year_to ? `–${m.year_to}` : ""})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex ml-auto items-end">
              <Button variant="ghost" onClick={() => {
                setFilters({ q: "", category_id: "all", manufacturer_id: "all", vehicle_brand_id: "all", vehicle_model_id: "all" });
                refreshParts(1);
              }}>Clear</Button>
            </div>
          </div>
        </Card>

        {/* Results table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columnVisibility.sku && <TableHead className="w-[120px]">SKU</TableHead>}
                {columnVisibility.name && <TableHead>Name</TableHead>}
                {columnVisibility.manufacturer && <TableHead className="w-[180px]">Manufacturer</TableHead>}
                {columnVisibility.fitmentModels && <TableHead className="w-[260px]">Fitment Models</TableHead>}
                {columnVisibility.fitmentBrands && <TableHead className="w-[220px]">Fitment Brands</TableHead>}
                {columnVisibility.minOrderQty && <TableHead className="w-[110px]">Min Order</TableHead>}
                {columnVisibility.minQtyGros && <TableHead className="w-[110px]">Min (Gros)</TableHead>}
                {columnVisibility.priceRetail && <TableHead className="w-[120px]">Retail</TableHead>}
                {columnVisibility.priceDemiGros && <TableHead className="w-[140px]">Demi-gros</TableHead>}
                {columnVisibility.priceGros && <TableHead className="w-[120px]">Gros</TableHead>}
                {columnVisibility.references && <TableHead className="w-[260px]">References</TableHead>}
                {columnVisibility.qty && <TableHead className="w-[140px]">Qty</TableHead>}
                {columnVisibility.add && <TableHead className="w-[120px]">Add</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={Object.values(columnVisibility).filter(Boolean).length} className="text-center text-muted-foreground">
                    No parts found
                  </TableCell>
                </TableRow>
              )}
              {pageData.data.map((p) => (
                <TableRow key={p.id}>
                  {columnVisibility.sku && <TableCell className="font-mono text-xs">{p.sku || "—"}</TableCell>}
                  {columnVisibility.name && <TableCell className="font-medium">{p.name}</TableCell>}
                  {columnVisibility.manufacturer && <TableCell>{p.manufacturer?.name || "—"}</TableCell>}
                  {columnVisibility.fitmentModels && (
                    <TableCell className="text-xs">{p.fitment_models?.length ? p.fitment_models.join(", ") : "—"}</TableCell>
                  )}
                  {columnVisibility.fitmentBrands && (
                    <TableCell className="text-xs">{p.fitment_brands?.length ? p.fitment_brands.join(", ") : "—"}</TableCell>
                  )}
                  {columnVisibility.minOrderQty && <TableCell>{p.min_order_qty}</TableCell>}
                  {columnVisibility.minQtyGros && <TableCell>{p.min_qty_gros}</TableCell>}
                  {columnVisibility.priceRetail && <TableCell>{p.price_retail != null ? `${p.price_retail} DZD` : "–"}</TableCell>}
                  {columnVisibility.priceDemiGros && <TableCell>{p.price_demi_gros != null ? `${p.price_demi_gros} DZD` : "–"}</TableCell>}
                  {columnVisibility.priceGros && <TableCell>{p.price_gros != null ? `${p.price_gros} DZD` : "–"}</TableCell>}
                  {columnVisibility.references && (
                    <TableCell className="text-xs">
                      {p.references?.length
                        ? p.references.map((r, i) => (
                          <span key={i}>
                            {r.code}
                            {r.source_brand ? ` (${r.source_brand})` : ""}
                            {r.type ? ` [${r.type}]` : ""}
                            {i < p.references.length - 1 ? ", " : ""}
                          </span>
                        ))
                        : "—"}
                    </TableCell>
                  )}
                  {columnVisibility.qty && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQtyById((q) => ({ ...q, [p.id]: Math.max(1, (q[p.id] ?? 1) - 1) }))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min={Math.max(1, p.min_order_qty || 1)}
                          className="remove_arrows w-16 text-center"
                          value={qtyById[p.id] ?? Math.max(1, p.min_order_qty || 1)}
                          onChange={(e) => {
                            const base = Math.max(1, p.min_order_qty || 1);
                            const v = Math.max(base, Number(e.target.value) || base);
                            setQtyById((q) => ({ ...q, [p.id]: v }));
                          }}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQtyById((q) => ({ ...q, [p.id]: (q[p.id] ?? Math.max(1, p.min_order_qty || 1)) + 1 }))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  {columnVisibility.add && (
                    <TableCell>
                      <Button className="w-full" onClick={() => addToCart(p.id)}>
                        <ShoppingCart className="h-4 w-4 mr-2" /> Add
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {pageData.total ? `${(pageData.page - 1) * pageData.per_page + 1}-${Math.min(pageData.total, pageData.page * pageData.per_page)} of ${pageData.total}` : "0"}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="per">Per page</Label>
              <Select value={String(pageData.per_page)} onValueChange={(v) => setPageData((p) => ({ ...p, per_page: Number(v) }))}>
                <SelectTrigger className="w-[84px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 12, 20, 30, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refreshParts(1)}>
                Apply
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refreshParts(Math.max(1, pageData.page - 1))} disabled={pageData.page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">Page {pageData.page} / {maxPage}</div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refreshParts(Math.min(maxPage, pageData.page + 1))}
                disabled={pageData.page >= maxPage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

function CartWidget({ cart, refreshCart }: { cart: { items: CartItem[]; subtotal: number; count: number; currency: string }, refreshCart: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);

  const updateQty = async (id: Id, qty: number) => {
    await http.put(endpoints.cartUpdate(id), { quantity: qty });
    await refreshCart();
  };
  const remove = async (id: Id) => {
    await http.delete(endpoints.cartRemove(id));
    await refreshCart();
  };
  const clear = async () => {
    await http.delete(endpoints.cartClear);
    await refreshCart();
  };

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen(o => !o)}>
        <ShoppingCart className="h-4 w-4 mr-2" /> {cart.count} items
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-[420px] bg-background border rounded-md shadow-xl z-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Your Cart</div>
            <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>
          </div>
          {cart.items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Cart is empty</div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
              {cart.items.map(it => (
                <div key={it.id} className="flex gap-3 items-center">
                  <div className="w-14 h-14 rounded bg-muted/30 overflow-hidden flex items-center justify-center">
                    {it.image ? <img src={it.image} className="object-cover w-full h-full" /> : <div className="text-xs text-muted-foreground">No Img</div>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{it.sku || "—"}</div>
                    <div className="text-sm">{it.unit_price} {cart.currency}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={() => updateQty(it.id, Math.max(1, it.qty - 1))}><Minus className="h-4 w-4" /></Button>
                    <Input type="number" min={1} className="w-16 text-center" value={it.qty} onChange={(e) => updateQty(it.id, Math.max(1, Number(e.target.value) || 1))} />
                    <Button variant="outline" size="icon" onClick={() => updateQty(it.id, it.qty + 1)}><Plus className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <div className="font-medium">Subtotal</div>
            <div className="font-semibold">{cart.subtotal} {cart.currency}</div>
          </div>
          <div className="mt-3">
            <Button className="w-full">Checkout</Button>
          </div>
        </div>
      )}
    </div>
  );
}
