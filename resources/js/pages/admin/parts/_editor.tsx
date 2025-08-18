import React, { useEffect, useState } from "react";
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

interface Manufacturer { id: Id; name: string }
interface VehicleBrand { id: number; name: string }
interface VehicleModel { id: number; name: string; year_from?: number | null; year_to?: number | null }

const endpoints = {
  parts: route("admin.parts.api.crud"),
  part: (id: Id) => `${route("admin.parts.api.crud")}/${id}`,
  // images remain
  partImages: (partId: Id) => `${route("admin.parts.api.crud")}/${partId}/images`,
  // fitments remain
  partFitments: (partId: Id) => `${route("admin.parts.api.crud")}/${partId}/fitments`,
  manufacturers: route("lookup.api.manufacturers"),
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
  const [mans, setMans] = useState<Manufacturer[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [modelsByBrand, setModelsByBrand] = useState<Record<string, VehicleModel[]>>({});

  const [form, setForm] = useState({
    manufacturer_id: "",
    reference: "",
    barcode: "",
    sku: "",
    name: "",
    description: "",
    price_retail_ttc: "",
    price_wholesale_ttc: "",
    tva_rate: "",
    stock_real: 0,
    stock_available: 0,
    is_active: true,
  });

  const [images, setImages] = useState<{ url: string; sort_order: number }[]>([]);

  const [fitments, setFitments] = useState<{ id?: Id; vehicle_brand_id?: string; vehicle_model_id?: string; engine_code?: string; notes?: string }[]>([]);

  const loadLookups = async () => {
    const [{ data: mJson }, { data: bJson }] = await Promise.all([
      api.get(endpoints.manufacturers),
      api.get(endpoints.vehicleBrands),
    ]);
    const ext = (x: any) => (Array.isArray(x?.data) ? x.data : Array.isArray(x) ? x : x?.data ?? []);
    setMans(ext(mJson));
    setBrands(ext(bJson));
  };

  const loadPart = async () => {
    if (partId == null) return;
    const { data: json } = await api.get(endpoints.part(partId));
    const p = json.part ?? json;

    setForm({
      manufacturer_id: p.manufacturer_id ? String(p.manufacturer_id) : "",
      reference: p.reference ?? "",
      barcode: p.barcode ?? "",
      sku: p.sku ?? "",
      name: p.name ?? "",
      description: p.description ?? "",
      price_retail_ttc: p.price_retail_ttc ?? "",
      price_wholesale_ttc: p.price_wholesale_ttc ?? "",
      tva_rate: p.tva_rate ?? "",
      stock_real: p.stock_real ?? 0,
      stock_available: p.stock_available ?? 0,
      is_active: !!p.is_active,
    });

    setImages((p.images ?? []).map((x: any, i: number) => ({ url: x.url ?? x, sort_order: x.sort_order ?? i })));

    const rawFits: any[] = json.fitments ?? [];
    const brandIds = Array.from(new Set(rawFits.map(f => f.vehicle_brand_id).filter((v: any) => v != null).map((v: any) => String(v))));
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
    if (!form.name.trim()) {
      alert("Name is required");
      return;
    }

    const payload = {
      manufacturer_id: form.manufacturer_id ? Number(form.manufacturer_id) : null,
      reference: form.reference || null,
      barcode: form.barcode || null,
      sku: form.sku || null,
      name: form.name,
      description: form.description || null,
      price_retail_ttc: form.price_retail_ttc === "" ? null : Number(form.price_retail_ttc),
      price_wholesale_ttc: form.price_wholesale_ttc === "" ? null : Number(form.price_wholesale_ttc),
      tva_rate: form.tva_rate === "" ? null : Number(form.tva_rate),
      stock_real: Number(form.stock_real) || 0,
      stock_available: Number(form.stock_available) || 0,
      is_active: !!form.is_active,

      images: images.map((img, i) => ({ url: img.url, sort_order: i })),

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
            <Label>Manufacturer</Label>
            <Select value={form.manufacturer_id} onValueChange={(v) => setForm({ ...form, manufacturer_id: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {mans.map((m) => <SelectItem key={String(m.id)} value={String(m.id)}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reference</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. 1K0615301" />
          </div>
          <div className="space-y-2">
            <Label>Barcode</Label>
            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="EAN/UPC (optional)" />
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
            <Label>Retail TTC</Label>
            <Input type="number" step="0.01" value={form.price_retail_ttc} onChange={(e) => setForm({ ...form, price_retail_ttc: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Wholesale TTC</Label>
            <Input type="number" step="0.01" value={form.price_wholesale_ttc} onChange={(e) => setForm({ ...form, price_wholesale_ttc: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>TVA %</Label>
            <Input type="number" step="0.01" value={form.tva_rate} onChange={(e) => setForm({ ...form, tva_rate: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Stock Real</Label>
            <Input type="number" value={form.stock_real} onChange={(e) => setForm({ ...form, stock_real: Number(e.target.value) || 0 })} />
          </div>
          <div className="space-y-2">
            <Label>Stock Available</Label>
            <Input type="number" value={form.stock_available} onChange={(e) => setForm({ ...form, stock_available: Number(e.target.value) || 0 })} />
          </div>

          <div className="flex items-end gap-4 pb-3">
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
                  <React.Fragment key={idx}>
                    <TableRow className="border-b-0">
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
                        <Button variant="destructive" size="icon" onClick={() => setFitments((arr) => arr.filter((_, i) => i !== idx))}><Trash className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                    <TableRow key={idx}>
                       <TableCell colSpan={3}>
                        <Input value={f.notes || ""} onChange={(e) => setFitments((arr) => arr.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))} placeholder="Notes" />
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
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
