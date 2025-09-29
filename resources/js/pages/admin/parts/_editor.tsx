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
import PartController from "@/actions/App/Http/Controllers/Admin/PartController";
import LookupController from "@/actions/App/Http/Controllers/LookupController";

type Id = number | string;

interface Manufacturer { id: Id; name: string }
interface VehicleBrand { id: number; name: string }
interface VehicleModel { id: number; name: string; year_from?: number | null; year_to?: number | null }

const endpoints = {
  parts: PartController.index().url,
  part: (id: Id) => `${PartController.index().url}/${id}`,
  partImages: (partId: Id) => `${PartController.index().url}/${partId}/images`,
  partFitments: (partId: Id) => `${PartController.index().url}/${partId}/fitments`,
  // single lookup entrypoint
  lookup: LookupController.index().url, // ?include=manufacturers,vehicle_brands or include=vehicle_models&vehicle_brand_id=...
};

const NONE = "none";

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
    manufacturer_id: NONE,
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

  type FitmentRow = {
    id?: Id;
    vehicle_brand_id?: string;   // stringified id or "none"
    vehicle_model_id?: string;   // stringified id or "none"
    engine_code?: string;
    notes?: string;
  };
  const [fitments, setFitments] = useState<FitmentRow[]>([]);

  const loadLookups = async () => {
    const { data } = await api.get(endpoints.lookup, {
      params: { include: "manufacturers,vehicle_brands" },
    });
    const payload = data?.data || {};
    setMans(Array.isArray(payload.manufacturers) ? payload.manufacturers : []);
    setBrands(Array.isArray(payload.vehicle_brands) ? payload.vehicle_brands : []);
  };

  const ensureModelsLoaded = async (brandId: Id | string | undefined) => {
    if (!brandId || brandId === NONE) return;
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

  const loadPart = async () => {
    if (partId == null) return;
    const { data: json } = await api.get(endpoints.part(partId));
    const p = json.part ?? json;

    setForm({
      manufacturer_id: p.manufacturer_id ? String(p.manufacturer_id) : NONE,
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
        vehicle_brand_id: f.vehicle_brand_id ? String(f.vehicle_brand_id) : NONE,
        vehicle_model_id: f.vehicle_model_id ? String(f.vehicle_model_id) : NONE,
        engine_code: f.engine_code || "",
        notes: f.notes || "",
      }))
    );
  };

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => { loadPart(); }, [partId]);

  const onSaveAll = async () => {
    if (!form.name.trim()) {
      alert("Nom requis");
      return;
    }

    const payload = {
      manufacturer_id: form.manufacturer_id !== NONE ? Number(form.manufacturer_id) : null,
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
        .filter(f => f.vehicle_model_id && f.vehicle_model_id !== NONE)
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

  return (
    <div className="space-y-3 px-6">
      {/* Core fields */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Détails</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fabricant</Label>
            <Select
              value={form.manufacturer_id}
              onValueChange={(v) => setForm({ ...form, manufacturer_id: v })}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Facultatif" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Aucun —</SelectItem>
                {mans.map((m) => <SelectItem key={String(m.id)} value={String(m.id)}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Référence</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. 1K0615301" />
          </div>
          <div className="space-y-2">
            <Label>Code-barres</Label>
            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="EAN/UPC (facultatif)" />
          </div>
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Référence interne (facultatif)" />
          </div>
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Désignation" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Description</Label>
            <Textarea className="w-full border rounded-md p-2 min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Prix de vente au détail</Label>
            <Input type="number" step="0.01" value={form.price_retail_ttc} onChange={(e) => setForm({ ...form, price_retail_ttc: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Prix de vente en gros</Label>
            <Input type="number" step="0.01" value={form.price_wholesale_ttc} onChange={(e) => setForm({ ...form, price_wholesale_ttc: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>TVA %</Label>
            <Input type="number" step="0.01" value={form.tva_rate} onChange={(e) => setForm({ ...form, tva_rate: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Stock réel</Label>
            <Input type="number" value={form.stock_real} onChange={(e) => setForm({ ...form, stock_real: Number(e.target.value) || 0 })} />
          </div>
          <div className="space-y-2">
            <Label>Stock disponible</Label>
            <Input type="number" value={form.stock_available} onChange={(e) => setForm({ ...form, stock_available: Number(e.target.value) || 0 })} />
          </div>

          <div className="flex items-end gap-4 pb-3">
            <Label>Actif</Label>
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
            <Plus className="h-4 w-4 mr-1" /> Ajouter une image
          </Button>
        </div>
        <div className="space-y-2">
          {images.length === 0 && <div className="text-sm text-muted-foreground">Aucune image. Ajouter des URL ; l'ordre est conservé.</div>}
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
        <h3 className="text-lg font-semibold">Compatibilités</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFitments((f) => [...f, { vehicle_brand_id: NONE, vehicle_model_id: NONE, engine_code: "", notes: "" }])}
        >
          <Plus className="h-4 w-4 mr-1" /> Ajouter une compatibilité
        </Button>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Marque</TableHead>
                <TableHead className="w-[260px]">Modèle</TableHead>
                <TableHead className="w-[160px]">Code moteur</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fitments.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Aucune compatibilité</TableCell></TableRow>
              )}
              {fitments.map((f, idx) => {
                const brandId = f.vehicle_brand_id ?? NONE;
                const models = brandId !== NONE ? (modelsByBrand[brandId] || []) : [];
                return (
                  <React.Fragment key={idx}>
                    <TableRow className="border-b-0">
                      <TableCell>
                        <Select
                          value={brandId}
                          onValueChange={async (v) => {
                            const newState: FitmentRow = { ...f, vehicle_brand_id: v, vehicle_model_id: NONE };
                            setFitments((arr) => arr.map((x, i) => (i === idx ? newState : x)));
                            await ensureModelsLoaded(v);
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner la marque" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>— Choisir —</SelectItem>
                            {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={f.vehicle_model_id ?? NONE}
                          onValueChange={(v) => setFitments((arr) => arr.map((x, i) => (i === idx ? { ...x, vehicle_model_id: v } : x)))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={brandId !== NONE ? "Sélectionner le modèle" : "Sélectionner la marque en premier"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>— Choisir —</SelectItem>
                            {models.map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>
                                {m.name}{m.year_from ? ` (${m.year_from}${m.year_to ? `–${m.year_to}` : ""})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={f.engine_code || ""}
                          onChange={(e) => setFitments((arr) => arr.map((x, i) => (i === idx ? { ...x, engine_code: e.target.value } : x)))}
                          placeholder="e.g. 1.9 TDI AXR"
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="destructive" size="icon" onClick={() => setFitments((arr) => arr.filter((_, i) => i !== idx))}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Input
                          value={f.notes || ""}
                          onChange={(e) => setFitments((arr) => arr.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))}
                          placeholder="Remarques"
                        />
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
        <Button variant="outline" onClick={onCancel}>Fermer</Button>
        <Button onClick={onSaveAll}>Enregistrer</Button>
      </div>
    </div>
  );
}
