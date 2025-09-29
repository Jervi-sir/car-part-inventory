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
import PartController from "@/actions/App/Http/Controllers/Admin/PartController";
import LookupController from "@/actions/App/Http/Controllers/LookupController";
import { ComboBox } from "@/components/combo-box";

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
  parts: PartController.index().url,
  partsBulkStatus: PartController.bulkStatus().url,
  part: (id: Id) => `${PartController.index().url}/${id}`,
  // @ts-ignore
  partActive: (id: Id) => PartController.updateActive({ part: id }).url,
  // Single lookup entrypoint
  lookup: LookupController.index().url, // expects ?include=manufacturers,vehicle_brands or include=vehicle_models&vehicle_brand_id=...
};

export default function PartsIndex() {
  const [pageData, setPageData] = useState<Page<PartRow>>({ data: [], total: 0, page: 1, per_page: 10 });
  const [filters, setFilters] = useState({
    manufacturer_id: "all",
    is_active: "all",
    sku: "",
    reference: "",
    vehicle_brand_id: "all",
    vehicle_model_id: "all",
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

  // Single call to fetch manufacturers + brands
  const fetchLookups = async () => {
    const { data } = await api.get(endpoints.lookup, {
      params: { include: "manufacturers,vehicle_brands" },
    });
    // Controller returns: { data: { manufacturers: [...], vehicle_brands: [...] } }
    const payload = data?.data || {};
    setMans(Array.isArray(payload.manufacturers) ? payload.manufacturers : []);
    setBrands(Array.isArray(payload.vehicle_brands) ? payload.vehicle_brands : []);
  };

  // Lazy load models for a given brand using the same endpoint
  const ensureModelsLoaded = async (brandId: Id | "all") => {
    if (!brandId || brandId === "all") return;
    const key = String(brandId);
    if (!modelsByBrand[key]) {
      const { data } = await api.get(endpoints.lookup, {
        params: { include: "vehicle_models", vehicle_brand_id: brandId },
      });
      const payload = data?.data || {};
      const models: VehicleModel[] = Array.isArray(payload.vehicle_models) ? payload.vehicle_models : [];
      setModelsByBrand((m) => ({ ...m, [key]: models }));
    }
  };

  const fetchData = async (page = 1) => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      per_page: String(pageData.per_page),
    };

    if (filters.vehicle_brand_id !== "all") params.vehicle_brand_id = filters.vehicle_brand_id;
    if (filters.vehicle_model_id !== "all") params.vehicle_model_id = filters.vehicle_model_id;
    if (filters.manufacturer_id !== "all") params.manufacturer_id = filters.manufacturer_id;
    if (filters.is_active !== "all") params.is_active = filters.is_active;
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
    <AdminLayout title="Pièces">
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
            {/* Manufacturer */}
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
                allValue={"all"}
              />
            </div>

            {/* Vehicle Brand */}
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
                allValue={"all"}
              />
            </div>


            {/* Vehicle Model */}
            <div className="space-y-2">
              <Label>Modèle</Label>

              <ComboBox
                value={filters.vehicle_model_id}
                onChange={(v) => setFilters({ ...filters, vehicle_model_id: v })}
                options={
                  (filters.vehicle_brand_id !== "all"
                    ? (modelsByBrand[String(filters.vehicle_brand_id)] || [])
                    : []
                  ).map((m: any) => ({
                    value: String(m.id),
                    label: m.year_from
                      ? `${m.name} (${m.year_from}${m.year_to ? `–${m.year_to}` : ""})`
                      : m.name,
                  }))
                }
                placeholder={
                  filters.vehicle_brand_id !== "all"
                    ? "Tous"
                    : "Sélectionner la marque en premier"
                }
                emptyText="Aucun modèle trouvé."
                allLabel="Tous"
                allValue="all"
                disabled={filters.vehicle_brand_id === "all"}
                className="w-full"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={filters.is_active}
                onValueChange={(v) => setFilters({ ...filters, is_active: v })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
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
                onClick={() => {
                  setFilters({
                    manufacturer_id: "all",
                    is_active: "all",
                    sku: "",
                    reference: "",
                    vehicle_brand_id: "all",
                    vehicle_model_id: "all",
                  });
                }}
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
                <TableHead className="w-[100px] sticky right-0 z-20 bg-background shadow-[inset_1px_0_0_var(--border)]">
                  Action
                </TableHead>
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
                    <TableCell className="flex gap-2 w-[100px] sticky right-0 z-10 bg-background shadow-[inset_1px_0_0_var(--border)]">
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
