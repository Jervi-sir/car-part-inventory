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

export function PartEditor({ partId, onSaved, onCancel }: { partId: Id | null; onSaved: () => void|Promise<void>; onCancel: () => void }) {
  // lookups
  const [cats, setCats] = useState<Category[]>([]);
  const [mans, setMans] = useState<Manufacturer[]>([]);
  const [refTypes, setRefTypes] = useState<PartReferenceType[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);

  // core part fields
  const [form, setForm] = useState({
    category_id: "",
    manufacturer_id: "",
    sku: "",
    name: "",
    description: "",
    package_qty: 1,
    min_order_qty: 1,
    currency: "DZD",
    base_price: "",
    is_active: true,
  });

  // images
  const [images, setImages] = useState<{ id?: Id; url: string; sort_order: number }[]>([]);

  // references
  const [refs, setRefs] = useState<{ id?: Id; part_reference_type_id: number | string; reference_code: string; source_brand: string }[]>([]);

  // fitments
  const [fitments, setFitments] = useState<{ id?: Id; vehicle_brand_id?: number|string; vehicle_model_id?: number|string; engine_code?: string; notes?: string }[]>([]);
  const [modelsByBrand, setModelsByBrand] = useState<Record<string, VehicleModel[]>>({});

  const loadLookups = async () => {
    const [cRes, mRes, rRes, bRes] = await Promise.all([
      fetch(endpoints.categories, { headers: { Accept: "application/json" } }),
      fetch(endpoints.manufacturers, { headers: { Accept: "application/json" } }),
      fetch(endpoints.partReferenceTypes, { headers: { Accept: "application/json" } }),
      fetch(endpoints.vehicleBrands, { headers: { Accept: "application/json" } }),
    ]);
    const [cJson, mJson, rJson, bJson] = await Promise.all([cRes.json(), mRes.json(), rRes.json(), bRes.json()]);
    const ext = (x:any) => Array.isArray(x.data) ? x.data : (Array.isArray(x)?x:(x?.data??[]));
    setCats(ext(cJson));
    setMans(ext(mJson));
    setRefTypes(ext(rJson));
    setBrands(ext(bJson));
  };

  const loadPart = async () => {
    if (partId == null) return;
    const res = await fetch(endpoints.part(partId), { headers: { Accept: "application/json" } });
    const json = await res.json();
    // Expecting Laravel to return { part, images, references, fitments }
    const p = json.part ?? json;
    setForm({
      category_id: String(p.category_id ?? ""),
      manufacturer_id: p.manufacturer_id ? String(p.manufacturer_id) : "",
      sku: p.sku ?? "",
      name: p.name ?? "",
      description: p.description ?? "",
      package_qty: p.package_qty ?? 1,
      min_order_qty: p.min_order_qty ?? 1,
      currency: p.currency ?? "DZD",
      base_price: p.base_price ?? "",
      is_active: !!p.is_active,
    });
    setImages((json.images ?? []).map((x:any) => ({ id: x.id, url: x.url, sort_order: x.sort_order })));
    setRefs((json.references ?? []).map((x:any) => ({ id: x.id, part_reference_type_id: x.part_reference_type_id, reference_code: x.reference_code, source_brand: x.source_brand || "" })));
    setFitments((json.fitments ?? []).map((x:any) => ({ id: x.id, vehicle_brand_id: x.vehicle_brand_id, vehicle_model_id: x.vehicle_model_id, engine_code: x.engine_code || "", notes: x.notes || "" })));
  };

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => { loadPart(); }, [partId]);

  const saveCore = async (): Promise<Id> => {
    const payload = {
      category_id: form.category_id ? Number(form.category_id) : null,
      manufacturer_id: form.manufacturer_id ? Number(form.manufacturer_id) : null,
      sku: form.sku || null,
      name: form.name,
      description: form.description || null,
      package_qty: Number(form.package_qty) || 1,
      min_order_qty: Number(form.min_order_qty) || 1,
      currency: form.currency || "DZD",
      base_price: form.base_price === "" ? null : Number(form.base_price),
      is_active: !!form.is_active,
    };

    if (partId == null) {
      const res = await fetch(endpoints.parts, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      return json.id ?? json.part?.id ?? json?.data?.id;
    } else {
      await fetch(endpoints.part(partId), { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      return partId;
    }
  };

  const saveImages = async (pid: Id) => {
    // Send full list (id optional). Backend can upsert & reorder by provided array index.
    const payload = images.map((img, i) => ({ id: img.id, url: img.url, sort_order: i }));
    await fetch(endpoints.partImages(pid), { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ images: payload }) });
  };

  const saveReferences = async (pid: Id) => {
    const payload = refs.map(r => ({ id: r.id, part_reference_type_id: Number(r.part_reference_type_id), reference_code: r.reference_code, source_brand: r.source_brand || null }));
    await fetch(endpoints.partReferences(pid), { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ references: payload }) });
  };

  const saveFitments = async (pid: Id) => {
    const payload = fitments.map(f => ({ id: f.id, vehicle_model_id: Number(f.vehicle_model_id), engine_code: f.engine_code || null, notes: f.notes || null }));
    await fetch(endpoints.partFitments(pid), { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ fitments: payload }) });
  };

  const onSaveAll = async () => {
    if (!form.name.trim() || !form.category_id) { alert("Name and Category are required"); return; }
    const pid = await saveCore();
    await Promise.all([ saveImages(pid), saveReferences(pid), saveFitments(pid) ]);
    await onSaved();
  };

  // helpers
  const moveImage = (idx:number, dir:-1|1) => setImages((arr) => {
    const i = idx + dir; if (i < 0 || i >= arr.length) return arr; const copy = [...arr];
    const tmp = copy[idx]; copy[idx] = copy[i]; copy[i] = tmp; return copy;
  });

  const ensureModelsLoaded = async (brandId: Id|undefined) => {
    if (!brandId) return;
    const key = String(brandId);
    if (!modelsByBrand[key]) {
      const res = await fetch(endpoints.vehicleModels(brandId), { headers: { Accept: "application/json" } });
      const json = await res.json();
      const ext = (x:any) => Array.isArray(x.data) ? x.data : (Array.isArray(x)?x:(x?.data??[]));
      setModelsByBrand((m) => ({ ...m, [key]: ext(json) }));
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="details">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="references">References</TabsTrigger>
          <TabsTrigger value="fitments">Fitments</TabsTrigger>
        </TabsList>

        {/* Details */}
        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select category"/></SelectTrigger>
                <SelectContent>
                  {cats.map(c => <SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Select value={form.manufacturer_id} onValueChange={(v) => setForm({ ...form, manufacturer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {mans.map(m => <SelectItem key={String(m.id)} value={String(m.id)}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="internal ref (optional)"/>
            </div>
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Designation"/>
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <textarea className="w-full border rounded-md p-2 min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Package Qty</Label>
              <Input type="number" min={1} value={form.package_qty} onChange={(e) => setForm({ ...form, package_qty: Number(e.target.value)||1 })}/>
            </div>
            <div>
              <Label>Min Order Qty</Label>
              <Input type="number" min={1} value={form.min_order_qty} onChange={(e) => setForm({ ...form, min_order_qty: Number(e.target.value)||1 })}/>
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}/>
            </div>
            <div>
              <Label>Base Price</Label>
              <Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })}/>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })}/>
              <Label>Active</Label>
            </div>
          </div>
        </TabsContent>

        {/* Images */}
        <TabsContent value="images">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setImages((x) => [...x, { url: "", sort_order: x.length }])}><Plus className="h-4 w-4 mr-1"/>Add Image</Button>
            </div>
            <div className="space-y-2">
              {images.length===0 && <div className="text-sm text-muted-foreground">No images. Add URLs; backend will persist & order by index.</div>}
              {images.map((img, idx) => (
                <div key={idx} className="flex items-center gap-2 border rounded-md p-2">
                  <Input className="flex-1" placeholder="https://..." value={img.url} onChange={(e) => setImages((arr)=> arr.map((r,i)=> i===idx?{...r, url:e.target.value}:r))} />
                  <Button variant="outline" size="icon" onClick={()=>moveImage(idx,-1)} disabled={idx===0}><ArrowUp className="h-4 w-4"/></Button>
                  <Button variant="outline" size="icon" onClick={()=>moveImage(idx,1)} disabled={idx===images.length-1}><ArrowDown className="h-4 w-4"/></Button>
                  <Button variant="destructive" size="icon" onClick={()=> setImages((arr)=> arr.filter((_,i)=> i!==idx))}><Trash className="h-4 w-4"/></Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* References */}
        <TabsContent value="references">
          <div className="space-y-3">
            <Button size="sm" variant="outline" onClick={() => setRefs((r)=> [...r, { part_reference_type_id: refTypes[0]?.id ?? "", reference_code: "", source_brand: "" }])}><Plus className="h-4 w-4 mr-1"/>Add Reference</Button>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Type</TableHead>
                    <TableHead>Reference Code</TableHead>
                    <TableHead className="w-[220px]">Source Brand</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refs.length===0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No references</TableCell></TableRow>
                  )}
                  {refs.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select value={String(r.part_reference_type_id)} onValueChange={(v)=> setRefs((arr)=> arr.map((x,i)=> i===idx?{...x, part_reference_type_id: v}:x))}>
                          <SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger>
                          <SelectContent>
                            {refTypes.map(rt => <SelectItem key={rt.id} value={String(rt.id)}>{rt.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={r.reference_code} onChange={(e)=> setRefs((arr)=> arr.map((x,i)=> i===idx?{...x, reference_code:e.target.value}:x))} placeholder="e.g. OEM: 1K0615301"/>
                      </TableCell>
                      <TableCell>
                        <Input value={r.source_brand} onChange={(e)=> setRefs((arr)=> arr.map((x,i)=> i===idx?{...x, source_brand:e.target.value}:x))} placeholder="e.g. VW / Bosch"/>
                      </TableCell>
                      <TableCell>
                        <Button variant="destructive" size="icon" onClick={()=> setRefs((arr)=> arr.filter((_,i)=> i!==idx))}><Trash className="h-4 w-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Fitments */}
        <TabsContent value="fitments">
          <div className="space-y-3">
            <Button size="sm" variant="outline" onClick={() => setFitments((f)=> [...f, { vehicle_brand_id: undefined, vehicle_model_id: undefined, engine_code: "", notes: "" }])}><Plus className="h-4 w-4 mr-1"/>Add Fitment</Button>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Brand</TableHead>
                    <TableHead className="w-[260px]">Model</TableHead>
                    <TableHead className="w-[160px]">Engine Code</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fitments.length===0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No fitments</TableCell></TableRow>
                  )}
                  {fitments.map((f, idx) => {
                    const brandId = f.vehicle_brand_id ? String(f.vehicle_brand_id) : "";
                    const models = brandId ? (modelsByBrand[brandId] || []) : [];
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select value={brandId} onValueChange={async (v)=>{
                            const vNum = v; // string id
                            const newState = { ...f, vehicle_brand_id: vNum, vehicle_model_id: undefined };
                            setFitments((arr)=> arr.map((x,i)=> i===idx? newState : x));
                            await ensureModelsLoaded(vNum);
                          }}>
                            <SelectTrigger><SelectValue placeholder="Select brand"/></SelectTrigger>
                            <SelectContent>
                              {brands.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={f.vehicle_model_id ? String(f.vehicle_model_id) : ""} onValueChange={(v)=> setFitments((arr)=> arr.map((x,i)=> i===idx?{...x, vehicle_model_id: v}:x))}>
                            <SelectTrigger><SelectValue placeholder={brandId?"Select model":"Select brand first"}/></SelectTrigger>
                            <SelectContent>
                              {models.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}{m.year_from?` (${m.year_from}${m.year_to?`–${m.year_to}`:""})`:""}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input value={f.engine_code || ""} onChange={(e)=> setFitments((arr)=> arr.map((x,i)=> i===idx?{...x, engine_code:e.target.value}:x))} placeholder="e.g. 1.9 TDI AXR"/>
                        </TableCell>
                        <TableCell>
                          <Input value={f.notes || ""} onChange={(e)=> setFitments((arr)=> arr.map((x,i)=> i===idx?{...x, notes:e.target.value}:x))} placeholder="Notes"/>
                        </TableCell>
                        <TableCell>
                          <Button variant="destructive" size="icon" onClick={()=> setFitments((arr)=> arr.filter((_,i)=> i!==idx))}><Trash className="h-4 w-4"/></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSaveAll}>Save</Button>
      </DialogFooter>
    </div>
  );
}
