import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Head, router } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ShoppingCart, Trash2, Plus, Minus, ChevronDown, Loader2, Check } from "lucide-react";
import { ClientLayout } from "../layout/client-layout";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { AdsHeroSlider } from "@/components/ads/ad-hero-slider";
import { AdGridFooter } from "@/components/ads/ad-grid-footer";
import CatalogController from "@/actions/App/Http/Controllers/Client/CatalogController";
import CartController from "@/actions/App/Http/Controllers/Client/CartController";
import LookupController from "@/actions/App/Http/Controllers/LookupController";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ComboBox } from "@/components/combo-box";

declare const route: (name: string, params?: any) => string;

type Id = number | string;
type Page<T> = { data: T[]; total: number; page: number; per_page: number };

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
  fitment_models: string[];
  fitment_brands: string[];
  references: { type: string; code: string; source_brand?: string | null }[];
};

type CartItem = { id: number; name: string; unit_price: number; qty: number; image?: string | null; sku?: string | null };

const endpoints = {
  parts: CatalogController.parts().url,
  cartShow: CartController.show().url,
  cartAdd: CartController.add().url,
  // @ts-ignore
  cartUpdate: (id: Id) => CartController.update({ part: id }).url,
  // @ts-ignore
  cartRemove: (id: Id) => CartController.remove({ part: id }).url,
  cartClear: CartController.clear().url,
  lookups: LookupController.index().url, // or "/admin/lookups"
};

// ------- utils -------
const ALL = "all";
const LS_COLUMNS_KEY = "catalogColumnVisibility_v2";

function show(v: unknown) {
  return v === 0 || v ? String(v) : "—";
}

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

async function fetchLookups(include: string[], extra: Record<string, any> = {}) {
  const params = { include: include.join(","), ...extra };
  const { data } = await api.get(endpoints.lookups, { params });
  return data?.data ?? {};
}

// ------- column meta & responsive -------
const defaultColumnVisibility = {
  sku: true,
  name: true,
  manufacturer: true,
  fitmentModels: false,
  fitmentBrands: false,
  minOrderQty: false,
  minQtyGros: false,
  priceRetail: true,
  priceDemiGros: false,
  priceGros: false,
  references: false,
  add: true,
} as const;

type ColumnKey = keyof typeof defaultColumnVisibility;
const COLUMN_META: Record<ColumnKey, { min: number; priority: number; label: string }> = {
  sku: { min: 90, priority: 20, label: "SKU" },
  name: { min: 120, priority: 10, label: "Nom" },               // high priority
  manufacturer: { min: 140, priority: 30, label: "Fabricant" },
  fitmentModels: { min: 120, priority: 80, label: "Modèles" },
  fitmentBrands: { min: 120, priority: 90, label: "Marques" },
  minOrderQty: { min: 110, priority: 70, label: "Commande minimum" },
  minQtyGros: { min: 110, priority: 75, label: "Minimum (Gros)" },
  priceRetail: { min: 110, priority: 25, label: "Prix de détail" },
  priceDemiGros: { min: 110, priority: 65, label: "Demi-gros" },
  priceGros: { min: 110, priority: 60, label: "Gros" },
  references: { min: 200, priority: 95, label: "Références" },
  add: { min: 100, priority: 15, label: "Ajouter" },           // very high priority
};

// Reserve space for the expand chevron + padding/scrollbar/etc.
const STATIC_LEFT_MIN = 36;     // first column (expand)
const PADDING_ALLOW = 48;     // misc padding

function useAutoFitColumns(
  containerRef: React.RefObject<HTMLElement>,
  userVisibility: Record<ColumnKey, boolean>
) {
  const [autoVisibility, setAutoVisibility] = useState<Record<ColumnKey, boolean>>(() => {
    const init: Record<ColumnKey, boolean> = {} as any;
    (Object.keys(userVisibility) as ColumnKey[]).forEach(k => (init[k] = true));
    return init;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;

      const width = Math.floor(entry.contentRect.width);
      // Available width for dynamic columns:
      let budget = Math.max(0, width - STATIC_LEFT_MIN - PADDING_ALLOW);

      // Sort by priority (lower = more important first)
      const keys = (Object.keys(COLUMN_META) as ColumnKey[]).sort(
        (a, b) => COLUMN_META[a].priority - COLUMN_META[b].priority
      );

      // Greedy packing while respecting user toggles (if user turned a column off, don't consider it)
      const next: Record<ColumnKey, boolean> = {} as any;
      keys.forEach(k => (next[k] = false));

      keys.forEach(k => {
        const want = userVisibility[k]; // user toggle
        const need = COLUMN_META[k].min;
        if (!want) {
          next[k] = false;
          return;
        }
        if (budget - need >= 0) {
          next[k] = true;
          budget -= need;
        } else {
          next[k] = false;
        }
      });

      setAutoVisibility(next);
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [containerRef, userVisibility]);

  return autoVisibility;
}


export default function CatalogPage() {
  const tableWrapRef = useRef<HTMLDivElement>(null);
  // ---------------- state ----------------
  const [filters, setFilters] = useState({
    q: "",
    manufacturer_id: ALL,
    vehicle_brand_id: ALL,
    vehicle_model_id: ALL,
  });

  const debouncedQ = useDebounced(filters.q, 350);

  const [pageData, setPageData] = useState<Page<PartRow>>({ data: [], total: 0, page: 1, per_page: 12 });

  const [mans, setMans] = useState<Manufacturer[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const modelsCache = useRef<Record<string, VehicleModel[]>>({});

  const [cart, setCart] = useState<{ items: CartItem[]; subtotal: number; count: number; currency: string }>({
    items: [],
    subtotal: 0,
    count: 0,
    currency: "DZD",
  });

  const [qtyById, setQtyById] = useState<Record<number, number>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [isPending, startTransition] = useTransition();

  // track which product is being added (spinner)
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  // track which product shows the "Ajouté" state for 2s
  const [addedOk, setAddedOk] = useState<Record<number, boolean>>({});

  // ---------------- add to cart helper ----------------
  const setAdding = (id: number, v: boolean) =>
    setAddingIds((s) => {
      const next = new Set(s);
      v ? next.add(id) : next.delete(id);
      return next;
    });

  const flashAddedOk = (id: number, ms = 2000) => {
    setAddedOk((m) => ({ ...m, [id]: true }));
    setTimeout(() => {
      setAddedOk((m) => ({ ...m, [id]: false }));
    }, ms);
  };

  // ---------------- columns ----------------

  const [columnVisibility, setColumnVisibility] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LS_COLUMNS_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...defaultColumnVisibility, ...parsed };
        } catch { }
      }
    }
    return defaultColumnVisibility;
  });

  // @ts-ignore
  const autoVisibility = useAutoFitColumns(tableWrapRef, columnVisibility);

  const effectiveVisibility = useMemo(() => {
    const res: Record<keyof typeof defaultColumnVisibility, boolean> = {} as any;
    (Object.keys(defaultColumnVisibility) as (keyof typeof defaultColumnVisibility)[]).forEach(k => {
      res[k] = !!(columnVisibility[k] && autoVisibility[k as ColumnKey]);
    });
    return res;
  }, [columnVisibility, autoVisibility]);

  const visibleCount = useMemo(
    () => Object.values(effectiveVisibility).filter(Boolean).length,
    [effectiveVisibility]
  );


  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_COLUMNS_KEY, JSON.stringify(columnVisibility));
    }
  }, [columnVisibility]);

  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);

  const nonStickyVisibleCount = useMemo(
    () => visibleCount - (effectiveVisibility.add ? 1 : 0),
    [visibleCount, effectiveVisibility.add]
  );


  // ---------------- cart ----------------
  const refreshCart = useCallback(async () => {
    const { data: js } = await api.get(endpoints.cartShow);
    setCart({
      items: js.items ?? [],
      subtotal: js.subtotal ?? 0,
      count: js.count ?? 0,
      currency: js.currency ?? "DZD",
    });
  }, []);

  const addToCart = useCallback(
    async (id: number) => {
      try {
        setAdding(id, true);
        await api.post(endpoints.cartAdd, { part_id: id, quantity: qtyById[id] ?? 1 });
        await refreshCart();
        await router.reload({
          only: ["cart"],
          // @ts-ignore
          preserveState: true,
          preserveScroll: true,
        });

        flashAddedOk(id, 2000);
        toast.success("Ajouté au panier");
      } catch (e: any) {
        console.error(e);
        toast.error("Erreur lors de l’ajout au panier");
      } finally {
        setAdding(id, false);
      }
    },
    [qtyById, refreshCart]
  );

  // ---------------- lookups (initial) ----------------
  useEffect(() => {
    (async () => {
      const d = await fetchLookups(["manufacturers", "vehicle_brands"]);
      setMans(Array.isArray(d.manufacturers) ? d.manufacturers : []);
      setBrands(Array.isArray(d.vehicle_brands) ? d.vehicle_brands : []);
    })();
    refreshCart();
  }, [refreshCart]);

  // ---------------- models by brand (with cache) ----------------
  useEffect(() => {
    (async () => {
      const brandId = filters.vehicle_brand_id;
      // reset models when brand cleared
      if (!brandId || brandId === ALL) {
        setModels([]);
        // ensure model reset only if it isn't already ALL (avoids extra renders)
        setFilters((f) => (f.vehicle_model_id === ALL ? f : { ...f, vehicle_model_id: ALL }));
        return;
      }

      // cache hit
      if (modelsCache.current[brandId]) {
        setModels(modelsCache.current[brandId]);
        return;
      }

      const d = await fetchLookups(["vehicle_models"], { vehicle_brand_id: brandId });
      const mm = Array.isArray(d.vehicle_models) ? d.vehicle_models : [];
      modelsCache.current[brandId] = mm;
      setModels(mm);

      // reset model selection on brand change
      setFilters((f) => ({ ...f, vehicle_model_id: ALL }));
    })();
  }, [filters.vehicle_brand_id]);

  // ---------------- parts (paginated) ----------------
  const partsAbortRef = useRef<AbortController | null>(null);
  const reqRef = useRef(0);

  const refreshParts = useCallback(
    async (page = 1) => {
      partsAbortRef.current?.abort();
      const controller = new AbortController();
      partsAbortRef.current = controller;

      const myReq = ++reqRef.current;

      const params = {
        page: String(page),
        per_page: String(pageData.per_page),
        q: debouncedQ || undefined,
        manufacturer_id: filters.manufacturer_id === ALL ? undefined : filters.manufacturer_id,
        vehicle_brand_id: filters.vehicle_brand_id === ALL ? undefined : filters.vehicle_brand_id,
        vehicle_model_id: filters.vehicle_model_id === ALL ? undefined : filters.vehicle_model_id,
      };

      try {
        const { data: js } = await api.get(endpoints.parts, { params, signal: controller.signal });
        if (myReq !== reqRef.current) return;

        setPageData(js);

        // functional update -> no need to depend on qtyById
        setQtyById((prev) => {
          const seeded: Record<number, number> = {};
          (js.data ?? []).forEach((r: PartRow) => {
            const base = Math.max(1, r.min_order_qty || 1);
            seeded[r.id] = prev[r.id] ?? base;
          });
          return { ...seeded, ...prev };
        });
      } catch (e: any) {
        if (e.name !== "CanceledError" && e.code !== "ERR_CANCELED") console.error(e);
      }
    },
    [pageData.per_page, debouncedQ, filters.manufacturer_id, filters.vehicle_brand_id, filters.vehicle_model_id]
  );


  // trigger refresh on filter changes (debounced q included)
  useEffect(() => {
    startTransition(() => {
      refreshParts(1);
    });
  }, [debouncedQ, filters.manufacturer_id, filters.vehicle_brand_id, filters.vehicle_model_id, pageData.per_page]);

  // ---------------- handlers ----------------
  const resetFilters = useCallback(() => {
    setFilters({ q: "", manufacturer_id: ALL, vehicle_brand_id: ALL, vehicle_model_id: ALL });
    modelsCache.current = {};
    setModels([]);
    startTransition(() => refreshParts(1));
  }, [refreshParts]);

  // keep per_page change controlled; user presses "Appliquer"
  const applyPerPage = useCallback(() => refreshParts(1), [refreshParts]);

  // ---------------- render ----------------
  return (
    <ClientLayout title="Catalogue">
      <div className="p-4 pt-0">
        <Head title="Shop" />
        <Toaster richColors position="top-right" />

        <AdsHeroSlider />

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Catalogue</h1>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">Colonnes</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Colonnes du tableau</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(defaultColumnVisibility) as ColumnKey[]).map((k) => (
                  <DropdownMenuCheckboxItem
                    key={k}
                    checked={columnVisibility[k]}
                    onCheckedChange={(checked) =>
                      setColumnVisibility((prev) => ({ ...prev, [k]: !!checked }))
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    {COLUMN_META[k].label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <CartWidget cart={cart} refreshCart={refreshCart} />
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2 space-y-2">
              <Label>Recherche</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nom, SKU, code-barres, référence..."
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                />
              </div>
            </div>


            <div className="space-y-2">
              <Label>Fabricant</Label>
              <ComboBox
                value={filters.manufacturer_id}
                onChange={(v) => setFilters((f) => ({ ...f, manufacturer_id: v }))}
                options={mans.map((m) => ({
                  value: String(m.id),
                  label: m.name,
                }))}
                placeholder="Tous"
                emptyText="Aucun fabricant trouvé."
                allLabel="Tous"
                allValue={ALL}
              />
            </div>

            <div className="space-y-2">
              <Label>Marque</Label>
              <ComboBox
                value={filters.vehicle_brand_id}
                onChange={(v) => setFilters((f) => ({ ...f, vehicle_brand_id: v }))}
                options={brands.map((b) => ({
                  value: String(b.id),
                  label: b.name,
                }))}
                placeholder="Toutes"
                emptyText="Aucune marque trouvée."
                allLabel="Toutes"
                allValue={ALL}
              />
            </div>

            <div className="space-y-2">
              <Label>Modèle</Label>
              <ComboBox
                value={filters.vehicle_model_id}
                onChange={(v) => setFilters((f) => ({ ...f, vehicle_model_id: v }))}
                options={models.map((m) => ({
                  value: String(m.id),
                  label: m.year_from
                    ? `${m.name} (${m.year_from}${m.year_to ? `–${m.year_to}` : ""})`
                    : m.name,
                }))}
                placeholder={models.length ? "Tous" : "Choisissez d'abord la marque"}
                emptyText="Aucun modèle trouvé."
                allLabel="Tous"
                allValue={ALL}
                disabled={!models.length}
              />
            </div>

            <div className="flex ml-auto items-end">
              <Button variant="ghost" onClick={resetFilters}>
                Effacer
              </Button>
            </div>
          </div>
        </Card>

        {/* Results table */}
        <div ref={tableWrapRef} className="rounded-md border overflow-x-auto">
          <Table className="lg:table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[36px]" />
                {columnVisibility.sku && <TableHead className="w-[90px]">SKU</TableHead>}
                {columnVisibility.name && <TableHead className="w-[90px]">Nom</TableHead>}
                {columnVisibility.manufacturer && <TableHead className="w-[120px]">Fabricant</TableHead>}
                {columnVisibility.fitmentModels && <TableHead className="w-[90px]">Modèles</TableHead>}
                {columnVisibility.fitmentBrands && <TableHead>Marques</TableHead>}
                {columnVisibility.minOrderQty && <TableHead>Commande minimum</TableHead>}
                {columnVisibility.minQtyGros && <TableHead>Minimum (Gros)</TableHead>}
                {columnVisibility.priceRetail && <TableHead>Prix de détail</TableHead>}
                {columnVisibility.priceDemiGros && <TableHead>Demi-gros</TableHead>}
                {columnVisibility.priceGros && <TableHead>Gros</TableHead>}
                {columnVisibility.references && <TableHead>Références</TableHead>}
                {effectiveVisibility.add && (
                  <TableHead className="w-[120px] sticky right-0 z-20 bg-background shadow-[inset_1px_0_0_var(--border)]">
                    Ajouter
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageData?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleCount + 1} className="text-center text-muted-foreground">
                    {isPending ? "Chargement..." : "Aucune pièce trouvée"}
                  </TableCell>
                </TableRow>
              )}

              {pageData?.data.map((p) => (
                <React.Fragment key={p.id}>
                  <TableRow>
                    <TableCell className="align-middle">
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-muted transition"
                        aria-label={expanded[p.id] ? "Collapse" : "Expand"}
                        onClick={() => setExpanded((e) => ({ ...e, [p.id]: !e[p.id] }))}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${expanded[p.id] ? "" : "-rotate-90"}`} />
                      </button>
                    </TableCell>

                    {columnVisibility.sku &&
                      <TableCell className="font-mono text-xs">
                        <span className="text-wrap">{p.sku || "—"}</span>
                      </TableCell>
                    }

                    {columnVisibility.name && (
                      <TableCell>
                        <div className="max-w-[90px] whitespace-normal break-words text-pretty leading-snug text-xs">
                          {p.name}
                        </div>
                      </TableCell>
                    )}

                    {columnVisibility.manufacturer && (
                      <TableCell>
                        <div className="max-w-[180px] whitespace-normal break-words text-pretty leading-snug text-xs">
                          {p.manufacturer?.name || "—"}
                        </div>
                      </TableCell>
                    )}

                    {columnVisibility.fitmentModels && (
                      <TableCell className="text-xs whitespace-normal break-words max-w-[90px]">
                        {p.fitment_models?.length ? p.fitment_models.join(", ") : "—"}
                      </TableCell>
                    )}

                    {columnVisibility.fitmentBrands && (
                      <TableCell className="text-xs whitespace-normal break-words max-w-[90px]">
                        {p.fitment_brands?.length ? p.fitment_brands.join(", ") : "—"}
                      </TableCell>
                    )}

                    {columnVisibility.minOrderQty && <TableCell>{show(p.min_order_qty)}</TableCell>}
                    {columnVisibility.minQtyGros && <TableCell>{show(p.min_qty_gros)}</TableCell>}

                    {columnVisibility.priceRetail && (
                      <TableCell className="text-xs whitespace-normal break-words max-w-[60px]">
                        {p.price_retail != null ? `${p.price_retail} DZD` : "–"}
                      </TableCell>
                    )}
                    {columnVisibility.priceDemiGros && (
                      <TableCell>{p.price_demi_gros != null ? `${p.price_demi_gros} DZD` : "–"}</TableCell>
                    )}
                    {columnVisibility.priceGros && <TableCell>{p.price_gros != null ? `${p.price_gros} DZD` : "–"}</TableCell>}

                    {columnVisibility.references && (
                      <TableCell className="text-xs">
                        {p.references?.length
                          ? p.references.map((r, i) => (
                            <span key={i}>
                              {r.code}
                              {r.source_brand ? ` (${r.source_brand})` : ""}
                              {r.type ? ` [${r.type}]` : ""}
                              {i < (p.references?.length ?? 0) - 1 ? ", " : ""}
                            </span>
                          ))
                          : "—"}
                      </TableCell>
                    )}


                    {effectiveVisibility.add && (
                      <TableCell className="w-[120px] sticky right-0 z-10 bg-background shadow-[inset_1px_0_0_var(--border)]">
                        <div className="flex flex-row gap-1 ">
                          <div className="flex items-center gap-1 shrink-0">
                            <Input
                              type="number"
                              min={Math.max(1, p.min_order_qty || 1)}
                              className="show_arrows w-13 text-center px-1"
                              value={qtyById[p.id] ?? Math.max(1, p.min_order_qty || 1)}
                              onChange={(e) => {
                                const base = Math.max(1, p.min_order_qty || 1);
                                const v = Math.max(base, Number(e.target.value) || base);
                                setQtyById((q) => ({ ...q, [p.id]: v }));
                              }}
                              max={99999}
                            />
                            {/* <div className="flex flex-col gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  setQtyById((q) => ({ ...q, [p.id]: (q[p.id] ?? Math.max(1, p.min_order_qty || 1)) + 1 }))
                                }
                                className="py-0 h-full"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  setQtyById((q) => ({ ...q, [p.id]: Math.max(1, (q[p.id] ?? Math.max(1, p.min_order_qty || 1)) - 1) }))
                                }
                                className="py-0 h-full"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div> */}
                          </div>
                          <Button
                            className={`transition ${addedOk[p.id]
                              ? "bg-emerald-600 hover:bg-emerald-600 animate-pulse"
                              : ""
                              }`}
                            variant={addedOk[p.id] ? "default" : "default"}
                            disabled={addingIds.has(p.id)}
                            onClick={() => addToCart(p.id)}
                          >
                            {addingIds.has(p.id) ? (
                              <>
                                <Loader2 className="h-4 w-4  animate-spin" />
                              </>
                            ) : addedOk[p.id] ? (
                              <>
                                <Check className="h-4 w-4 " />
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4 " />
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    )}

                  </TableRow>

                  {expanded[p.id] && (
                    <TableRow>
                      <TableCell colSpan={visibleCount + 1} className="bg-muted/40 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {p.image && (
                            <div className="rounded border bg-background p-3 flex gap-3">
                              <div className="w-20 h-20 rounded overflow-hidden bg-muted/40 flex items-center justify-center">
                                <img src={p.image} alt={p.name} className="object-cover w-full h-full" />
                              </div>
                              <div className="text-sm">
                                <div className="text-xs font-medium text-muted-foreground mb-1">Image</div>
                                <div className="truncate max-w-[220px]">{p.image}</div>
                              </div>
                            </div>
                          )}

                          {!columnVisibility.sku && <DetailItem label="SKU" value={p.sku || "—"} />}
                          {!columnVisibility.name && <DetailItem label="Nom" value={p.name} />}
                          {!columnVisibility.manufacturer && <DetailItem label="Fabricant" value={p.manufacturer?.name || "—"} />}

                          {!columnVisibility.fitmentBrands && (
                            <DetailItem label="Modèles compatibles" value={p.fitment_brands?.length ? p.fitment_brands.join(", ") : "—"} />
                          )}
                          {!columnVisibility.fitmentModels && (
                            <DetailItem label="Marques compatibles" value={p.fitment_models?.length ? p.fitment_models.join(", ") : "—"} />
                          )}

                          {!columnVisibility.minOrderQty && <DetailItem label="Commande minimum" value={show(p.min_order_qty)} />}
                          {!columnVisibility.minQtyGros && <DetailItem label="Minimum (Gros)" value={show(p.min_qty_gros)} />}

                          {!columnVisibility.priceRetail && (
                            <DetailItem label="Prix de détail" value={p.price_retail != null ? `${p.price_retail} DZD` : "–"} />
                          )}
                          {!columnVisibility.priceDemiGros && (
                            <DetailItem label="Demi-gros" value={p.price_demi_gros != null ? `${p.price_demi_gros} DZD` : "–"} />
                          )}
                          {!columnVisibility.priceGros && (
                            <DetailItem label="Gros" value={p.price_gros != null ? `${p.price_gros} DZD` : "–"} />
                          )}

                          {!columnVisibility.references && (
                            <div className="lg:col-span-3">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Références</div>
                              {p.references?.length ? (
                                <ul className="text-sm list-disc pl-5 space-y-0.5">
                                  {p.references.map((r, i) => (
                                    <li key={i}>
                                      {r.code}
                                      {r.source_brand ? ` · ${r.source_brand}` : ""}
                                      {r.type ? ` · ${r.type}` : ""}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-sm">—</div>
                              )}
                            </div>
                          )}

                          {!columnVisibility.qty && (
                            <div className="rounded border bg-background p-3">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Qté</div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    setQtyById((q) => ({ ...q, [p.id]: Math.max(1, (q[p.id] ?? 1) - 1) }))
                                  }
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
                                  onClick={() =>
                                    setQtyById((q) => ({
                                      ...q,
                                      [p.id]: (q[p.id] ?? Math.max(1, p.min_order_qty || 1)) + 1,
                                    }))
                                  }
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {!columnVisibility.add && (
                            <div className="rounded border bg-background p-3">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Ajouter</div>
                              <Button className="w-full" onClick={() => addToCart(p.id)}>
                                <ShoppingCart className="h-4 w-4 mr-2" /> Ajouter
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {pageData.total
              ? `${(pageData.page - 1) * pageData.per_page + 1}-${Math.min(pageData.total, pageData.page * pageData.per_page)} of ${pageData.total}`
              : "0"}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="per">Par page</Label>
              <Select
                value={String(pageData.per_page)}
                onValueChange={(v) => setPageData((p) => ({ ...p, per_page: Number(v) }))}
              >
                <SelectTrigger className="w-[84px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 8, 10, 12, 16, 20, 40].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={applyPerPage}>
                Appliquer
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => refreshParts(Math.max(1, pageData.page - 1))}
                disabled={pageData.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">
                Page {pageData.page} / {maxPage}
              </div>
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

        <AdGridFooter />
      </div>
    </ClientLayout>
  );
}

function CartWidget({
  cart,
  refreshCart,
}: {
  cart: { items: CartItem[]; subtotal: number; count: number; currency: string };
  refreshCart: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const updateQty = useCallback(
    async (id: Id, qty: number) => {
      await api.put(endpoints.cartUpdate(id), { quantity: qty });
      await refreshCart();
    },
    [refreshCart]
  );

  const remove = useCallback(
    async (id: Id) => {
      await api.delete(endpoints.cartRemove(id));
      await refreshCart();
    },
    [refreshCart]
  );

  const clear = useCallback(async () => {
    await api.delete(endpoints.cartClear);
    await refreshCart();
  }, [refreshCart]);

  return (
    <div className="relative" ref={ref}>
      <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
        <ShoppingCart className="h-4 w-4 mr-2" /> {cart.count} articles
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-[420px] bg-background border rounded-md shadow-xl z-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Votre panier</div>
            <Button variant="ghost" size="sm" onClick={clear}>
              Effacer Tous
            </Button>
          </div>

          {cart.items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Le panier est vide</div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
              {cart.items.map((it) => (
                <div key={it.id} className="flex gap-3 items-center">
                  <div className="w-14 h-14 rounded bg-muted/30 overflow-hidden flex items-center justify-center">
                    {it.image ? (
                      <img src={it.image} className="object-cover w-full h-full" />
                    ) : (
                      <div className="text-xs text-muted-foreground">Aucune image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{it.sku || "—"}</div>
                    <div className="text-sm">
                      {it.unit_price} {cart.currency}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQty(it.id, Math.max(1, it.qty - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      className="w-16 text-center"
                      value={it.qty}
                      onChange={(e) =>
                        updateQty(it.id, Math.max(1, Number(e.target.value) || 1))
                      }
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQty(it.id, it.qty + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(it.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="font-medium">Sous total</div>
            <div className="font-semibold">
              {cart.subtotal} {cart.currency}
            </div>
          </div>
          <div className="mt-3">
            <Button className="w-full">Commander</Button>
          </div>
        </div>
      )}
    </div>
  );
}


function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border bg-background p-3">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="text-sm break-words">{value}</div>
    </div>
  );
}
