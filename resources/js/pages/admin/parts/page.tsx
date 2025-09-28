import React, { useEffect, useMemo, useState } from "react";
import { Head } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Pencil, Trash, Plus, RefreshCw, ChevronDown } from "lucide-react";
import Editor from "./_editor";
import { AdminLayout } from "../layout/admin-layout";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import api from "@/lib/api";

type Id = number | string;

interface Manufacturer { id: Id; name: string }

interface PartRow {
  id: Id;
  reference?: string | null;
  barcode?: string | null;
  sku?: string | null;
  name: string | null;
  manufacturer?: { id: Id; name: string } | null;
  price_retail_ttc?: string | number | null;
  is_active: boolean | 0 | 1;
  stock_real?: number;
  stock_available?: number;
  fitment_models?: string[];
  fitment_brands?: string[];
}

interface Page<T> { data: T[]; total: number; page: number; per_page: number }
interface VehicleBrand { id: number; name: string }
interface VehicleModel { id: number; name: string; year_from?: number | null; year_to?: number | null }

const endpoints = {
  parts: route("admin.parts.api.crud"),
  partsBulkStatus: route("admin.parts.api.bulk-status"),
  part: (id: Id) => `${route("admin.parts.api.crud")}/${id}`,
  partActive: (id: Id) => `${route("admin.parts.api.active", { part: id })}`,
  manufacturers: route("lookup.api.manufacturers"),
  vehicleBrands: route("lookup.api.vehicle-brands"),
  vehicleModels: (brandId: Id) => `${route("lookup.api.vehicle-models")}?vehicle_brand_id=${brandId}`,
};

export default function PartsIndex() {
  const [pageData, setPageData] = useState<Page<PartRow>>({ data: [], total: 0, page: 1, per_page: 10 });
  const [filters, setFilters] = useState({
    manufacturer_id: "", is_active: "", sku: "", reference: "",
    vehicle_brand_id: "", vehicle_model_id: "",
  });
  const [mans, setMans] = useState<Manufacturer[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const show = (v: unknown) => (v === 0 || v ? String(v) : "—");

  const [openEditor, setOpenEditor] = useState(false);
  const [editingId, setEditingId] = useState<Id | null>(null);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [modelsByBrand, setModelsByBrand] = useState<Record<string, VehicleModel[]>>({});

  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);

  const fetchLookups = async () => {
    const [{ data: mJson }, { data: bJson }] = await Promise.all([
      api.get(endpoints.manufacturers),
      api.get(endpoints.vehicleBrands),
    ]);
    const ext = (x: any) => (Array.isArray(x.data) ? x.data : Array.isArray(x) ? x : x?.data ?? []);
    setMans(ext(mJson));
    setBrands(ext(bJson));
  };

  const ensureModelsLoaded = async (brandId: Id | "") => {
    if (!brandId) return;
    const key = String(brandId);
    if (!modelsByBrand[key]) {
      const { data: json } = await api.get(endpoints.vehicleModels(brandId));
      const ext = (x: any) => (Array.isArray(x.data) ? x.data : Array.isArray(x) ? x : x?.data ?? []);
      setModelsByBrand((m) => ({ ...m, [key]: ext(json) }));
    }
  };

  const fetchData = async (page = 1) => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      per_page: String(pageData.per_page),
    };
    if (filters.vehicle_brand_id) params.vehicle_brand_id = filters.vehicle_brand_id;
    if (filters.vehicle_model_id) params.vehicle_model_id = filters.vehicle_model_id;
    if (filters.manufacturer_id && filters.manufacturer_id !== "all") params.manufacturer_id = filters.manufacturer_id;
    if (filters.is_active && filters.is_active !== "all") params.is_active = filters.is_active;
    if (filters.sku) params.sku = filters.sku;
    if (filters.reference) params.reference = filters.reference;

    const { data: json } = await api.get<Page<PartRow> | PartRow[]>(endpoints.parts, { params });
    const normalized: Page<PartRow> = Array.isArray(json)
      ? { data: json, page, per_page: pageData.per_page, total: json.length }
      : json;
    setPageData(normalized);
    setSelected({});
    setLoading(false);
  };

  useEffect(() => { fetchLookups(); }, []);
  useEffect(() => { fetchData(1); }, [filters.manufacturer_id, filters.is_active]);

  const toggleSelect = (id: Id, checked: boolean) => setSelected((s) => ({ ...s, [String(id)]: checked }));
  const allSelectedIds = useMemo(() => Object.entries(selected).filter(([_, v]) => v).map(([k]) => k), [selected]);

  const bulkSetActive = async (val: boolean) => {
    if (!allSelectedIds.length) return;
    await api.post(endpoints.partsBulkStatus, { ids: allSelectedIds.map(Number), is_active: val });
    await fetchData(pageData.page);
  };

  const openCreate = () => { setEditingId(null); setOpenEditor(true); };
  const openEdit = (row: PartRow) => { setEditingId(row.id); setOpenEditor(true); };
  const remove = async (row: PartRow) => {
    if (!confirm(`Delete part "${row.name ?? row.sku ?? row.reference ?? row.id}"?`)) return;
    await api.delete(endpoints.part(row.id));
    await fetchData(pageData.page);
  };

  return (
    <AdminLayout>
      <Head title="Pièces" />
      <div className="p-6 pt-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-semibold">Pièces</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData(pageData.page)}>
              <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nouvelle pièce
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {/* Manufacturer (kept) */}
            <div className="space-y-2">
              <Label>Fabricant</Label>
              <Select value={filters.manufacturer_id} onValueChange={(v) => setFilters({ ...filters, manufacturer_id: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  {mans.map((m) => <SelectItem key={String(m.id)} value={String(m.id)}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Vehicle Brand */}
            <div className="space-y-2">
              <Label>Marque du véhicule</Label>
              <Select
                value={filters.vehicle_brand_id}
                onValueChange={async (v) => {
                  setFilters({ ...filters, vehicle_brand_id: v, vehicle_model_id: "" });
                  await ensureModelsLoaded(v);
                }}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Vehicle Model */}
            <div className="space-y-2">
              <Label>Vehicle Model</Label>
              <Select
                value={filters.vehicle_model_id}
                onValueChange={(v) => setFilters({ ...filters, vehicle_model_id: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={filters.vehicle_brand_id ? "Tous" : "Sélectionner la marque en premier"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  {(filters.vehicle_brand_id
                    ? (modelsByBrand[String(filters.vehicle_brand_id)] || [])
                    : []
                  ).map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}{m.year_from ? ` (${m.year_from}${m.year_to ? `–${m.year_to}` : ""})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={filters.is_active} onValueChange={(v) => setFilters({ ...filters, is_active: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  <SelectItem value="1">Actif</SelectItem>
                  <SelectItem value="0">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={filters.sku} onChange={(e) => setFilters({ ...filters, sku: e.target.value })} />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label>Référence</Label>
              <Input value={filters.reference} onChange={(e) => setFilters({ ...filters, reference: e.target.value })} />
            </div>

            {/* Clear */}
            <div className="flex items-end justify-end">
              <Button
                variant="outline"
                onClick={() => setFilters({
                  manufacturer_id: "", is_active: "", sku: "", reference: "",
                  vehicle_brand_id: "", vehicle_model_id: "",
                })}
              >
                Effacer
              </Button>
            </div>
          </div>
        </Card>

        {/* Bulk actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => bulkSetActive(true)} disabled={!allSelectedIds.length}>Activer</Button>
          <Button variant="outline" size="sm" onClick={() => bulkSetActive(false)} disabled={!allSelectedIds.length}>Désactiver</Button>
          <div className="text-sm text-muted-foreground">{allSelectedIds.length ? `${allSelectedIds.length} sélectionné` : ""}</div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={pageData.data.length > 0 && allSelectedIds.length === pageData.data.length}
                    onCheckedChange={(v) => {
                      const newSel: Record<string, boolean> = {};
                      if (v) pageData.data.forEach((r) => (newSel[String(r.id)] = true));
                      setSelected(newSel);
                    }}
                  />
                </TableHead>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead className="w-[140px]">SKU</TableHead>
                <TableHead className="w-[160px]">Référence</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="w-[160px]">Fabricant</TableHead>
                <TableHead className="w-[120px]">Prix de vente au détail</TableHead>
                <TableHead className="w-[90px]">Actif</TableHead>
                <TableHead className="w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!pageData.data.length || loading) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    {loading ? "Chargement..." : "Aucune donnée"}
                  </TableCell>
                </TableRow>
              )}
              {pageData.data.map((row) => (
                <React.Fragment key={String(row.id)}>
                  <TableRow>
                    <TableCell className="flex flex-row items-center space-x-1">
                      <Checkbox className="h-4 w-4 mb-1" checked={!!selected[String(row.id)]} onCheckedChange={(v) => toggleSelect(row.id, !!v)} />
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-muted"
                        onClick={() =>
                          setExpanded((e) => ({ ...e, [String(row.id)]: !e[String(row.id)] }))
                        }
                        aria-label={expanded[String(row.id)] ? "Réduire" : "Développer"}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${expanded[String(row.id)] ? "" : "-rotate-90"}`} />
                      </button>
                    </TableCell>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.sku || "—"}</TableCell>
                    <TableCell>{row.reference || "—"}</TableCell>
                    <TableCell>{row.name || "—"}</TableCell>
                    <TableCell>{row.manufacturer?.name || "—"}</TableCell>
                    <TableCell>{row.price_retail_ttc ?? "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={!!row.is_active}
                        onCheckedChange={async (v) => {
                          const prev = pageData;
                          setPageData(p => ({
                            ...p,
                            data: p.data.map(r => r.id === row.id ? { ...r, is_active: v } : r),
                          }));
                          try {
                            await api.patch(endpoints.partActive(row.id), { is_active: v });
                          } catch {
                            setPageData(prev);
                            alert('Échec de la mise à jour du statut');
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => remove(row)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {expanded[String(row.id)] && (
                    <TableRow>
                      {/* colSpan now = checkbox+expander + 8 other cols = 9+1 = 10 */}
                      <TableCell colSpan={10} className="bg-muted/40 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <DetailItem label="Marques de montage" value={(row.fitment_brands?.length ? row.fitment_brands.join(", ") : "—")} />
                          <DetailItem label="Modèles de montage" value={(row.fitment_models?.length ? row.fitment_models.join(", ") : "—")} />
                          <DetailItem label="Stock réel" value={show(row.stock_real)} />
                          <DetailItem label="Stock disponible" value={show(row.stock_available)} />
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
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {pageData.total ? `${(pageData.page - 1) * pageData.per_page + 1}-${Math.min(pageData.total, pageData.page * pageData.per_page)} of ${pageData.total}` : "0"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchData(Math.max(1, pageData.page - 1))} disabled={pageData.page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm">Page {pageData.page} / {maxPage}</div>
            <Button variant="outline" size="icon" onClick={() => fetchData(Math.min(maxPage, pageData.page + 1))} disabled={pageData.page >= maxPage}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sheet Editor */}
      <Sheet open={openEditor} onOpenChange={setOpenEditor}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto gap-0">
          <SheetHeader>
            <SheetTitle className="pl-2">{editingId == null ? "Nouvelle pièce" : `Modifier la pièce #${editingId}`}</SheetTitle>
          </SheetHeader>
          <Editor
            partId={editingId}
            onSaved={async () => { setOpenEditor(false); await fetchData(pageData.page); }}
            onCancel={() => setOpenEditor(false)}
          />
        </SheetContent>
      </Sheet>
    </AdminLayout>
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
