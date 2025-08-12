import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../layout/admin-layout"; // adjust import if needed
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Pencil, Trash, Plus, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { PartEditor } from "./part-editor";

// ---- Types ----
type Id = number | string;

interface Category { id: Id; name: string }
interface Manufacturer { id: Id; name: string }
interface PartReferenceType { id: number; code: string; label: string }
interface VehicleBrand { id: number; name: string }
interface VehicleModel { id: number; name: string; year_from?: number|null; year_to?: number|null }

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

// API endpoints (Laravel to implement)
const endpoints = {
  parts: "/api/parts", // GET index (with filters & pagination), POST create
  partsBulkStatus: "/api/parts/bulk-status", // POST { ids: Id[], is_active: boolean }
  categories: "/api/categories?per_page=1000",
  manufacturers: "/api/manufacturers?per_page=1000",
  partReferenceTypes: "/api/parts/part-reference-types",
  vehicleBrands: "/api/parts/vehicle-brands?per_page=1000",
  vehicleModels: (brandId: Id) => `/api/parts/vehicle-models?vehicle_brand_id=${brandId}&per_page=1000`,
  part: (id: Id) => `/api/parts/${id}`, // GET show, PUT update, DELETE destroy
  partImages: (partId: Id) => `/api/parts/${partId}/images`, // GET list, POST create, PUT re-order, DELETE
  partReferences: (partId: Id) => `/api/parts/${partId}/references`, // GET/POST/PUT/DELETE
  partFitments: (partId: Id) => `/api/parts/${partId}/fitments`, // GET/POST/DELETE
};

// ---------------------- LIST PAGE ----------------------
export default function PartsListPage() {
  const [pageData, setPageData] = useState<Page<PartRow>>({ data: [], total: 0, page: 1, per_page: 10 });
  const [filters, setFilters] = useState({ category_id: "", manufacturer_id: "", is_active: "", sku: "", reference_code: "" });
  const [cats, setCats] = useState<Category[]>([]);
  const [mans, setMans] = useState<Manufacturer[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [openEditor, setOpenEditor] = useState(false);
  const [editingId, setEditingId] = useState<Id | null>(null);

  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);

  const fetchLookups = async () => {
    const [cRes, mRes] = await Promise.all([
      fetch(endpoints.categories, { headers: { Accept: "application/json" } }),
      fetch(endpoints.manufacturers, { headers: { Accept: "application/json" } }),
    ]);
    const cJson = await cRes.json();
    const mJson = await mRes.json();
    setCats(Array.isArray(cJson.data) ? cJson.data : (Array.isArray(cJson) ? cJson : cJson?.data ?? []));
    setMans(Array.isArray(mJson.data) ? mJson.data : (Array.isArray(mJson) ? mJson : mJson?.data ?? []));
  };

  const fetchData = async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), per_page: String(pageData.per_page),
      category_id: filters.category_id, manufacturer_id: filters.manufacturer_id,
      is_active: filters.is_active, sku: filters.sku, reference_code: filters.reference_code,
    });
    const res = await fetch(`${endpoints.parts}?${params.toString()}`, { headers: { Accept: "application/json" } });
    const json = await res.json();
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
    await fetch(endpoints.partsBulkStatus, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ids: allSelectedIds, is_active: val }),
    });
    await fetchData(pageData.page);
  };

  const openCreate = () => { setEditingId(null); setOpenEditor(true); };
  const openEdit = (row: PartRow) => { setEditingId(row.id); setOpenEditor(true); };

  const remove = async (row: PartRow) => {
    if (!confirm(`Delete part \"${row.name}\"?`)) return;
    await fetch(endpoints.part(row.id), { method: "DELETE", headers: { Accept: "application/json" } });
    await fetchData(pageData.page);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-semibold">Parts</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData(pageData.page)}><RefreshCw className="h-4 w-4 mr-1"/>Refresh</Button>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1"/>New Part</Button>
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
                    <SelectItem value="">All</SelectItem>
                    {cats.map(c => <SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Manufacturer</Label>
                <Select value={filters.manufacturer_id} onValueChange={(v) => setFilters({ ...filters, manufacturer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {mans.map(m => <SelectItem key={String(m.id)} value={String(m.id)}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Active</Label>
                <Select value={filters.is_active} onValueChange={(v) => setFilters({ ...filters, is_active: v })}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="1">Active</SelectItem>
                    <SelectItem value="0">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={filters.sku} onChange={(e) => setFilters({ ...filters, sku: e.target.value })} placeholder="e.g. ABC-123" />
              </div>
              <div>
                <Label>Reference Code</Label>
                <Input value={filters.reference_code} onChange={(e) => setFilters({ ...filters, reference_code: e.target.value })} placeholder="e.g. 1K0615301" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" onClick={() => fetchData(1)}>Apply</Button>
              <Button variant="ghost" onClick={() => { setFilters({ category_id: "", manufacturer_id: "", is_active: "", sku: "", reference_code: "" }); }}>Reset</Button>
            </div>
          </CardContent>
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
                <TableHead className="w-[40px]"><Checkbox checked={pageData.data.length>0 && allSelectedIds.length===pageData.data.length} onCheckedChange={(v) => {
                  const newSel: Record<string, boolean> = {};
                  if (v) pageData.data.forEach(r => newSel[String(r.id)] = true);
                  setSelected(newSel);
                }}/></TableHead>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead className="w-[140px]">SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[160px]">Category</TableHead>
                <TableHead className="w-[160px]">Manufacturer</TableHead>
                <TableHead className="w-[120px]">Price</TableHead>
                <TableHead className="w-[90px]">Active</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!pageData.data.length || loading) && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">{loading?"Loading...":"No data"}</TableCell></TableRow>
              )}
              {pageData.data.map((row) => (
                <TableRow key={String(row.id)}>
                  <TableCell><Checkbox checked={!!selected[String(row.id)]} onCheckedChange={(v) => toggleSelect(row.id, !!v)} /></TableCell>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{row.sku || "—"}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.category?.name || "—"}</TableCell>
                  <TableCell>{row.manufacturer?.name || "—"}</TableCell>
                  <TableCell>{row.base_price ? `${row.base_price} ${row.currency || "DZD"}` : "—"}</TableCell>
                  <TableCell>
                    <Switch checked={!!row.is_active} onCheckedChange={async (v) => {
                      await fetch(endpoints.part(row.id), {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        body: JSON.stringify({ is_active: v }),
                      });
                      await fetchData(pageData.page);
                    }}/>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4"/></Button>
                    <Button variant="destructive" size="icon" onClick={() => remove(row)}><Trash className="h-4 w-4"/></Button>
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

        {/* Create/Edit Dialog */}
        <Dialog open={openEditor} onOpenChange={setOpenEditor}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>{editingId == null ? "New Part" : `Edit Part #${editingId}`}</DialogTitle>
            </DialogHeader>
            <PartEditor partId={editingId} onSaved={async () => { setOpenEditor(false); await fetchData(pageData.page); }} onCancel={() => setOpenEditor(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

