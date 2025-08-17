// resources/js/Pages/Parts/_editor.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash, ArrowUp, ArrowDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";

type Id = number | string;

interface Category { id: Id; name: string }
interface Manufacturer { id: Id; name: string }
interface VehicleBrand { id: number; name: string }
interface VehicleModel { id: number; name: string; year_from?: number | null; year_to?: number | null }

// If TypeScript complains about global `route()`, uncomment:
// declare const route: (name: string, params?: any) => string;

const endpoints = {
  parts: route("admin.parts.api.crud"),
  part: (id: Id) => `${route("admin.parts.api.crud")}/${id}`,
  categories: route("lookup.api.categories"),
  manufacturers: route("lookup.api.manufacturers"),

  // keep images as a dedicated endpoint
  partImages: (partId: Id) => `${route("admin.parts.api.crud")}/${partId}/images`,

  // NEW merged endpoint for references + fitments
  partRelations: (partId: Id) => `${route("admin.parts.api.crud")}/${partId}/relations`,

  vehicleBrands: route("lookup.api.vehicle-brands"),
  vehicleModels: (brandId: Id) => `${route("lookup.api.vehicle-models")}?vehicle_brand_id=${brandId}`,
};

export default function Editor({
  partId,
  onSaved,
  onCancel,
}: {
  partId: Id | null;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [cats, setCats] = useState<Category[]>([]);
  const [mans, setMans] = useState<Manufacturer[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [modelsByBrand, setModelsByBrand] = useState<Record<string, VehicleModel[]>>({});

  const [form, setForm] = useState({
    category_id: "",
    manufacturer_id: "",
    sku: "",
    name: "",
    description: "",
    package_qty: 1,
    min_order_qty: 1,
    price_retail: "",
    price_demi_gros: "",
    price_gros: "",
    min_qty_gros: 1,
    is_active: true,
  });

  // images
  const [images, setImages] = useState<{ url: string; sort_order: number }[]>([]);

  // merged relations state
  const [refs, setRefs] = useState<{ id?: Id; type: "OEM" | "AFTERMARKET" | "SUPPLIER" | "EAN_UPC" | "OTHER"; code: string; source_brand?: string }[]>([]);
  const [fitments, setFitments] = useState<{ id?: Id; vehicle_brand_id?: string; vehicle_model_id?: string; engine_code?: string; notes?: string }[]>([]);

  const loadLookups = async () => {
    const [{ data: cJson }, { data: mJson }, { data: bJson }] = await Promise.all([
      api.get(endpoints.categories),
      api.get(endpoints.manufacturers),
      api.get(endpoints.vehicleBrands),
    ]);
    const ext = (x: any) => (Array.isArray(x?.data) ? x.data : Array.isArray(x) ? x : x?.data ?? []);
    setCats(ext(cJson));
    setMans(ext(mJson));
    setBrands(ext(bJson));
  };

  const loadPart = async () => {
    if (partId == null) return;
    const { data: json } = await api.get(endpoints.part(partId));
    const p = json.part ?? json;

    setForm({
      category_id: String(p.category_id ?? ""),
      manufacturer_id: p.manufacturer_id ? String(p.manufacturer_id) : "",
      sku: p.sku ?? "",
      name: p.name ?? "",
      description: p.description ?? "",
      package_qty: p.package_qty ?? 1,
      min_order_qty: p.min_order_qty ?? 1,
      price_retail: p.price_retail ?? "",
      price_demi_gros: p.price_demi_gros ?? "",
      price_gros: p.price_gros ?? "",
      min_qty_gros: p.min_qty_gros ?? 1,
      is_active: !!p.is_active,
    });

    setImages((p.images ?? []).map((x: any, i: number) => ({ url: x.url ?? x, sort_order: x.sort_order ?? i })));

    // if your show endpoint already returns references & fitments, keep using it:
    setRefs((json.references ?? []).map((r: any) => ({ id: r.id, type: r.type, code: r.code, source_brand: r.source_brand || "" })));
    const rawFits: any[] = json.fitments ?? [];
    const brandIds = Array.from(
      new Set(
        rawFits
          .map(f => f.vehicle_brand_id)
          .filter((v: any) => v != null)
          .map((v: any) => String(v))
      )
    );
    await Promise.all(brandIds.map((bid) => ensureModelsLoaded(bid)));
    setFitments(
      rawFits.map((f: any) => ({
        id: f.id,
        vehicle_brand_id: f.vehicle_brand_id ? String(f.vehicle_brand_id) : undefined,
        vehicle_model_id: f.vehicle_model_id ? String(f.vehicle_model_id) : undefined,
        engine_code: f.engine_code || "",
        notes: f.notes || "",
      }))
    );
  };

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => { loadPart(); }, [partId]);

  const onSaveAll = async () => {
    if (!form.name.trim() || !form.category_id) {
      alert("Name and Category are required");
      return;
    }

    const payload = {
      // core
      category_id: form.category_id ? Number(form.category_id) : null,
      manufacturer_id: form.manufacturer_id ? Number(form.manufacturer_id) : null,
      sku: form.sku || null,
      name: form.name,
      description: form.description || null,
      package_qty: Number(form.package_qty) || 1,
      min_order_qty: Number(form.min_order_qty) || 1,
      price_retail: form.price_retail === "" ? null : Number(form.price_retail),
      price_demi_gros: form.price_demi_gros === "" ? null : Number(form.price_demi_gros),
      price_gros: form.price_gros === "" ? null : Number(form.price_gros),
      min_qty_gros: Number(form.min_qty_gros) || 1,
      is_active: !!form.is_active,

      // images
      images: images.map((img, i) => ({ url: img.url, sort_order: i })),

      // references
      references: refs.map(r => ({
        id: r.id ?? null,
        type: r.type,
        code: r.code,
        source_brand: r.source_brand || null,
      })),

      // fitments
      fitments: fitments
        .filter(f => f.vehicle_model_id)
        .map(f => ({
          id: f.id ?? null,
          vehicle_model_id: Number(f.vehicle_model_id),
          engine_code: f.engine_code || null,
          notes: f.notes || null,
        })),
    };

    if (partId == null) {
      await api.post(endpoints.parts, payload);
    } else {
      await api.put(endpoints.part(partId), payload);
    }
    await onSaved();
  };


  const moveImage = (idx: number, dir: -1 | 1) =>
    setImages((arr) => {
      const i = idx + dir;
      if (i < 0 || i >= arr.length) return arr;
      const copy = [...arr];
      const tmp = copy[idx];
      copy[idx] = copy[i];
      copy[i] = tmp;
      return copy;
    });

  const ensureModelsLoaded = async (brandId: Id | undefined) => {
    if (!brandId) return;
    const key = String(brandId);
    if (!modelsByBrand[key]) {
      const { data: json } = await api.get(endpoints.vehicleModels(brandId));
      const ext = (x: any) => (Array.isArray(x.data) ? x.data : Array.isArray(x) ? x : x?.data ?? []);
      setModelsByBrand((m) => ({ ...m, [key]: ext(json) }));
    }
  };

  return (
    <div className="space-y-3 px-6">
      {/* Core fields */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Manufacturer</Label>
            <Select value={form.manufacturer_id} onValueChange={(v) => setForm({ ...form, manufacturer_id: v })}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">— None —</SelectItem>
                {mans.map((m) => <SelectItem key={String(m.id)} value={String(m.id)}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="internal ref (optional)" />
          </div>
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Designation" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Description</Label>
            <Textarea className="w-full border rounded-md p-2 min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Package Qty</Label>
            <Input type="number" min={1} value={form.package_qty} onChange={(e) => setForm({ ...form, package_qty: Number(e.target.value) || 1 })} />
          </div>
          <div className="space-y-2">
            <Label>Min Order Qty</Label>
            <Input type="number" min={1} value={form.min_order_qty} onChange={(e) => setForm({ ...form, min_order_qty: Number(e.target.value) || 1 })} />
          </div>
          <div className="space-y-2">
            <Label>Retail Price</Label>
            <Input type="number" step="0.01" value={form.price_retail} onChange={(e) => setForm({ ...form, price_retail: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Demi-gros Price</Label>
            <Input type="number" step="0.01" value={form.price_demi_gros} onChange={(e) => setForm({ ...form, price_demi_gros: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Gros Price</Label>
            <Input type="number" step="0.01" value={form.price_gros} onChange={(e) => setForm({ ...form, price_gros: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Min Qty (Gros)</Label>
            <Input type="number" min={1} value={form.min_qty_gros} onChange={(e) => setForm({ ...form, min_qty_gros: Number(e.target.value) || 1 })} />
          </div>
          <div className="flex items-center gap-4">
            <Label>Active</Label>
            <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
        </div>
      </section>
      <Separator />
      {/* Images */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Images</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setImages((x) => [...x, { url: "", sort_order: x.length }])}>
            <Plus className="h-4 w-4 mr-1" /> Add Image
          </Button>
        </div>
        <div className="space-y-2">
          {images.length === 0 && <div className="text-sm text-muted-foreground">No images. Add URLs; order is preserved.</div>}
          {images.map((img, idx) => (
            <div key={idx} className="flex items-center gap-2 border rounded-md p-2">
              <Input className="flex-1" placeholder="https://..." value={img.url} onChange={(e) => setImages((arr) => arr.map((r, i) => (i === idx ? { ...r, url: e.target.value } : r)))} />
              <Button variant="outline" size="icon" onClick={() => moveImage(idx, -1)} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1}><ArrowDown className="h-4 w-4" /></Button>
              <Button variant="destructive" size="icon" onClick={() => setImages((arr) => arr.filter((_, i) => i !== idx))}><Trash className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </section>
      <Separator />
      {/* References */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">References</h3>
        <Button size="sm" variant="outline" onClick={() => setRefs((r) => [...r, { type: "OTHER", code: "", source_brand: "" }])}>
          <Plus className="h-4 w-4 mr-1" /> Add Reference
        </Button>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Type</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="w-[220px]">Source Brand</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refs.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No references</TableCell></TableRow>
              )}
              {refs.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Select value={String(r.type)} onValueChange={(v: any) => setRefs((arr) => arr.map((x, i) => (i === idx ? { ...x, type: v } : x)))}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {["OEM", "AFTERMARKET", "SUPPLIER", "EAN_UPC", "OTHER"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input value={r.code} onChange={(e) => setRefs((arr) => arr.map((x, i) => (i === idx ? { ...x, code: e.target.value } : x)))} placeholder="e.g. 1K0615301" />
                  </TableCell>
                  <TableCell>
                    <Input value={r.source_brand || ""} onChange={(e) => setRefs((arr) => arr.map((x, i) => (i === idx ? { ...x, source_brand: e.target.value } : x)))} placeholder="e.g. VW / Bosch" />
                  </TableCell>
                  <TableCell>
                    <Button variant="destructive" size="icon" onClick={() => setRefs((arr) => arr.filter((_, i) => i !== idx))}><Trash className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
      <Separator />
      {/* Fitments */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Fitments</h3>
        <Button size="sm" variant="outline" onClick={() => setFitments((f) => [...f, { vehicle_brand_id: undefined, vehicle_model_id: undefined, engine_code: "", notes: "" }])}>
          <Plus className="h-4 w-4 mr-1" /> Add Fitment
        </Button>
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
              {fitments.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No fitments</TableCell></TableRow>
              )}
              {fitments.map((f, idx) => {
                const brandId = f.vehicle_brand_id ? String(f.vehicle_brand_id) : "";
                const models = brandId ? (modelsByBrand[brandId] || []) : [];
                return (
                  <TableRow key={idx}>
                    <TableCell>
                      <Select
                        value={brandId}
                        onValueChange={async (v) => {
                          const newState = { ...f, vehicle_brand_id: v, vehicle_model_id: undefined };
                          setFitments((arr) => arr.map((x, i) => (i === idx ? newState : x)));
                          await ensureModelsLoaded(v);
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                        <SelectContent>
                          {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={f.vehicle_model_id ? String(f.vehicle_model_id) : ""}
                        onValueChange={(v) => setFitments((arr) => arr.map((x, i) => (i === idx ? { ...x, vehicle_model_id: v } : x)))}
                      >
                        <SelectTrigger><SelectValue placeholder={brandId ? "Select model" : "Select brand first"} /></SelectTrigger>
                        <SelectContent>
                          {models.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.name}{m.year_from ? ` (${m.year_from}${m.year_to ? `–${m.year_to}` : ""})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input value={f.engine_code || ""} onChange={(e) => setFitments((arr) => arr.map((x, i) => (i === idx ? { ...x, engine_code: e.target.value } : x)))} placeholder="e.g. 1.9 TDI AXR" />
                    </TableCell>
                    <TableCell>
                      <Input value={f.notes || ""} onChange={(e) => setFitments((arr) => arr.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))} placeholder="Notes" />
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="icon" onClick={() => setFitments((arr) => arr.filter((_, i) => i !== idx))}><Trash className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Close</Button>
        <Button onClick={onSaveAll}>Save</Button>
      </div>
    </div>
  );
}
