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

interface Category { id: Id; name: string }
interface Manufacturer { id: Id; name: string }

interface PartRow {
  id: Id;
  sku?: string | null;
  name: string;
  category?: { id: Id; name: string } | null;
  manufacturer?: { id: Id; name: string } | null;
  price_retail?: string | number | null;
  is_active: boolean | 0 | 1;
  min_order_qty?: number | null;
  min_qty_gros?: number | null;
  price_demi_gros?: string | number | null;
  price_gros?: string | number | null;
  qty?: number | null;
  fitment_models?: string[];   // e.g. ["Golf V", "Passat B6"]
  fitment_brands?: string[];   // e.g. ["VW", "Audi"]
  references?: Array<{ code: string; type?: string; source_brand?: string | null }>;
}

interface Page<T> { data: T[]; total: number; page: number; per_page: number }

// If TypeScript complains about global `route()`, uncomment:
// declare const route: (name: string, params?: any) => string;

const endpoints = {
  parts: route("admin.parts.api.crud"),
  partsBulkStatus: route("admin.parts.api.bulk-status"),
  part: (id: Id) => `${route("admin.parts.api.crud")}/${id}`,
  partActive: (id: Id) => `${route("admin.parts.api.crud")}/${id}/active`, // NEW
  categories: route("lookup.api.categories"),
  manufacturers: route("lookup.api.manufacturers"),
};

export default function PartsIndex() {
  const [pageData, setPageData] = useState<Page<PartRow>>({ data: [], total: 0, page: 1, per_page: 10 });
  const [filters, setFilters] = useState({ category_id: "", manufacturer_id: "", is_active: "", sku: "", reference_code: "" });
  const [cats, setCats] = useState<Category[]>([]);
  const [mans, setMans] = useState<Manufacturer[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const show = (v: unknown) => (v === 0 || v ? String(v) : "—");

  // Sheet state (instead of Dialog)
  const [openEditor, setOpenEditor] = useState(false);
  const [editingId, setEditingId] = useState<Id | null>(null);

  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);

  const fetchLookups = async () => {
    const [{ data: cJson }, { data: mJson }] = await Promise.all([
      api.get(endpoints.categories),
      api.get(endpoints.manufacturers),
    ]);

    const ext = (x: any) => (Array.isArray(x.data) ? x.data : Array.isArray(x) ? x : x?.data ?? []);
    setCats(ext(cJson));
    setMans(ext(mJson));
  };

  const fetchData = async (page = 1) => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      per_page: String(pageData.per_page),
    };
    if (filters.category_id && filters.category_id !== "all") params.category_id = filters.category_id;
    if (filters.manufacturer_id && filters.manufacturer_id !== "all") params.manufacturer_id = filters.manufacturer_id;
    if (filters.is_active && filters.is_active !== "all") params.is_active = filters.is_active;
    if (filters.sku) params.sku = filters.sku;
    if (filters.reference_code) params.reference_code = filters.reference_code;
    const { data: json } = await api.get<Page<PartRow> | PartRow[]>(endpoints.parts, { params });
    const normalized: Page<PartRow> = Array.isArray(json)
      ? { data: json, page, per_page: pageData.per_page, total: json.length }
      : json;
    setPageData(normalized);
    setSelected({});
    setLoading(false);
  };

  useEffect(() => { fetchLookups(); }, []);
  useEffect(() => { fetchData(1); }, [filters.category_id, filters.manufacturer_id, filters.is_active]);

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
    if (!confirm(`Delete part "${row.name}"?`)) return;
    await api.delete(endpoints.part(row.id));
    await fetchData(pageData.page);
  };

  return (
    <AdminLayout>
      <Head title="Parts" />
      <div className="p-6 pt-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-semibold">Parts</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData(pageData.page)}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New Part
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={filters.category_id} onValueChange={(v) => setFilters({ ...filters, category_id: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {cats.map((c) => <SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Select value={filters.manufacturer_id} onValueChange={(v) => setFilters({ ...filters, manufacturer_id: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {mans.map((m) => <SelectItem key={String(m.id)} value={String(m.id)}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.is_active} onValueChange={(v) => setFilters({ ...filters, is_active: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={filters.sku} onChange={(e) => setFilters({ ...filters, sku: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Reference code</Label>
              <Input value={filters.reference_code} onChange={(e) => setFilters({ ...filters, reference_code: e.target.value })} />
            </div>
            <div className="flex items-end justify-end">
              <Button variant="outline" onClick={() => setFilters({ category_id: "", manufacturer_id: "", is_active: "", sku: "", reference_code: "" })}>
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {/* Bulk actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => bulkSetActive(true)} disabled={!allSelectedIds.length}>Activate</Button>
          <Button variant="outline" size="sm" onClick={() => bulkSetActive(false)} disabled={!allSelectedIds.length}>Deactivate</Button>
          <div className="text-sm text-muted-foreground">{allSelectedIds.length ? `${allSelectedIds.length} selected` : ""}</div>
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
                <TableHead>Name</TableHead>
                <TableHead className="w-[160px]">Category</TableHead>
                <TableHead className="w-[160px]">Manufacturer</TableHead>
                <TableHead className="w-[120px]">Retail</TableHead>
                <TableHead className="w-[90px]">Active</TableHead>
                <TableHead className="w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!pageData.data.length || loading) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    {loading ? "Loading..." : "No data"}
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
                        aria-label={expanded[String(row.id)] ? "Collapse" : "Expand"}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${expanded[String(row.id)] ? "" : "-rotate-90"}`} />
                      </button>
                    </TableCell>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.sku || "—"}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.category?.name || "—"}</TableCell>
                    <TableCell>{row.manufacturer?.name || "—"}</TableCell>
                    <TableCell>{row.price_retail ?? "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={!!row.is_active}
                        onCheckedChange={async (v) => {
                          // optimistic update
                          const prev = pageData;
                          setPageData(p => ({
                            ...p,
                            data: p.data.map(r => r.id === row.id ? { ...r, is_active: v } : r),
                          }));
                          try {
                            await api.patch(endpoints.partActive(row.id), { is_active: v });
                          } catch {
                            // revert on error
                            setPageData(prev);
                            alert('Failed to update status');
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
                      {/* colSpan must cover ALL header columns: checkbox + expander + ID + SKU + Name + Category + Manufacturer + Retail + Active + Actions = 10 */}
                      <TableCell colSpan={10} className="bg-muted/40 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <DetailItem label="Fitment Brands" value={(row.fitment_brands?.length ? row.fitment_brands.join(", ") : "—")} />
                          <DetailItem label="Fitment Models" value={(row.fitment_models?.length ? row.fitment_models.join(", ") : "—")} />
                          <DetailItem label="Min Order" value={show(row.min_order_qty)} />
                          <DetailItem label="Min (Gros)" value={show(row.min_qty_gros)} />
                          <DetailItem label="Demi-gros" value={show(row.price_demi_gros)} />
                          <DetailItem label="Gros" value={show(row.price_gros)} />
                          <DetailItem label="Qty" value={show(row.qty)} />
                          <div className="lg:col-span-3">
                            <div className="text-xs font-medium text-muted-foreground mb-1">References</div>
                            {row.references?.length ? (
                              <ul className="text-sm list-disc pl-5 space-y-0.5">
                                {row.references.map((r, i) => (
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
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId == null ? "New Part" : `Edit Part #${editingId}`}</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <Editor
              partId={editingId}
              onSaved={async () => { setOpenEditor(false); await fetchData(pageData.page); }}
              onCancel={() => setOpenEditor(false)}
            />
          </div>
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
