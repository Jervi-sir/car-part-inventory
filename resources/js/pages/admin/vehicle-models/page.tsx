
// =============================================================================================================
// file: app/admin/vehicle-models/page.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Pencil, Trash, Plus } from "lucide-react";
import { AdminLayout } from "../layout/admin-layout";

type Id4 = number | string;
interface VehicleBrand2 { id: Id4; name: string }
interface VehicleModel { id: Id4; vehicle_brand_id: Id4; name: string; year_from: number | null; year_to: number | null }
interface Page4<T> { data: T[]; total: number; page: number; per_page: number }

const endpointBrands = "/api/vehicle-brands";
const endpointModels = "/api/vehicle-models";

export default function VehicleModelsPage() {
  const [brands, setBrands] = useState<VehicleBrand2[]>([]);
  const [pageData, setPageData] = useState<Page4<VehicleModel>>({ data: [], total: 0, page: 1, per_page: 10 });
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleModel | null>(null);

  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);

  const loadBrands = async () => {
    const res = await fetch(`${endpointBrands}?page=1&per_page=999`, { headers: { Accept: "application/json" } });
    const json = await res.json();
    setBrands(Array.isArray(json) ? json : json.data);
  };

  const fetchData = async (page = 1) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(pageData.per_page) });
    if (search) params.set("search", search);
    if (brandFilter) params.set("vehicle_brand_id", brandFilter);
    const res = await fetch(`${endpointModels}?${params.toString()}`, { headers: { Accept: "application/json" } });
    const json = await res.json();
    const normalized: Page4<VehicleModel> = Array.isArray(json) ? { data: json, page, per_page: 10, total: json.length } : json;
    setPageData(normalized);
  };

  useEffect(() => { loadBrands(); }, []);
  useEffect(() => { fetchData(1); }, [search, brandFilter]);

  const openCreate = () => { setEditing(null); setOpen(true); };
  const openEdit = (row: VehicleModel) => { setEditing(row); setOpen(true); };

  const save = async (payload: { name: string; vehicle_brand_id: string; year_from?: string; year_to?: string }) => {
    const body = JSON.stringify({
      name: payload.name,
      vehicle_brand_id: parseInt(payload.vehicle_brand_id),
      year_from: payload.year_from ? parseInt(payload.year_from) : null,
      year_to: payload.year_to ? parseInt(payload.year_to) : null,
    });
    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    if (!editing) await fetch(endpointModels, { method: "POST", headers, body });
    else await fetch(`${endpointModels}/${editing.id}`, { method: "PUT", headers, body });
    setOpen(false); await fetchData(pageData.page);
  };

  const remove = async (row: VehicleModel) => {
    if (!confirm(`Delete model \"${row.name}\"?`)) return;
    await fetch(`${endpointModels}/${row.id}`, { method: "DELETE", headers: { Accept: "application/json" } });
    await fetchData(pageData.page);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <div className="text-2xl font-semibold">Vehicle Models</div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search models..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <select className="border rounded px-3 py-2 text-sm" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="">All brands</option>
            {brands.map((b) => (<option key={String(b.id)} value={String(b.id)}>{b.name}</option>))}
          </select>
          <div className="flex-1" />
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />New Model</Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">ID</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.data.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No data</TableCell></TableRow>)}
              {pageData.data.map((row) => (
                <TableRow key={String(row.id)}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{brands.find(b => String(b.id) === String(row.vehicle_brand_id))?.name || row.vehicle_brand_id}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.year_from ?? ""}</TableCell>
                  <TableCell>{row.year_to ?? ""}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" onClick={() => remove(row)}><Trash className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {pageData.total ? `${(pageData.page - 1) * pageData.per_page + 1}-${Math.min(pageData.total, pageData.page * pageData.per_page)} of ${pageData.total}` : "0"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchData(Math.max(1, pageData.page - 1))} disabled={pageData.page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-sm">Page {pageData.page} / {maxPage}</div>
            <Button variant="outline" size="icon" onClick={() => fetchData(Math.min(maxPage, pageData.page + 1))} disabled={pageData.page >= maxPage}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <VehicleModelDialog open={open} onOpenChange={setOpen} brands={brands} initial={editing || undefined} onSave={save} />
      </div>
    </AdminLayout>
  );
}

function VehicleModelDialog({ open, onOpenChange, brands, initial, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; brands: VehicleBrand2[]; initial?: VehicleModel; onSave: (payload: { name: string; vehicle_brand_id: string; year_from?: string; year_to?: string }) => void | Promise<void> }) {
  const [name, setName] = useState(initial?.name || "");
  const [vehicleBrandId, setVehicleBrandId] = useState(String(initial?.vehicle_brand_id || ""));
  const [yearFrom, setYearFrom] = useState(initial?.year_from ? String(initial.year_from) : "");
  const [yearTo, setYearTo] = useState(initial?.year_to ? String(initial.year_to) : "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(initial?.name || "");
    setVehicleBrandId(String(initial?.vehicle_brand_id || ""));
    setYearFrom(initial?.year_from ? String(initial.year_from) : "");
    setYearTo(initial?.year_to ? String(initial.year_to) : "");
  }, [initial]);

  const submit = async () => {
    if (!name.trim() || !vehicleBrandId) return;
    setSubmitting(true);
    await onSave({ name: name.trim(), vehicle_brand_id: vehicleBrandId, year_from: yearFrom || undefined, year_to: yearTo || undefined });
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit Model" : "New Model"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm">Brand</label>
            <Select value={vehicleBrandId} onValueChange={setVehicleBrandId}>
              <SelectTrigger><SelectValue placeholder="Select a brand" /></SelectTrigger>
              <SelectContent>
                {brands.map(b => (<SelectItem key={String(b.id)} value={String(b.id)}>{b.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm">Model name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Golf" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-sm">Year from</label><Input value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="1998" /></div>
            <div className="space-y-1"><label className="text-sm">Year to</label><Input value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="2005" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !name.trim() || !vehicleBrandId}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
