
// =============================================================================================================
// file: app/admin/fitments/page.tsx (Power-user matrix, single file)
"use client";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminLayout } from "../layout/admin-layout";

interface Brand { id: number | string; name: string }
interface Model { id: number | string; name: string; vehicle_brand_id: number | string; year_from: number | null; year_to: number | null }

const brandsEndpoint = "/api/vehicle-brands";
const modelsEndpoint = "/api/vehicle-models";
const fitmentsEndpoint = "/api/part-fitments"; // GET ?part_id=, POST {part_id, vehicle_model_id, engine_code?}, DELETE {part_id, vehicle_model_id, engine_code?}

export default function FitmentMatrixPage() {
  const [partId, setPartId] = useState("");
  const [engineCode, setEngineCode] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());

  const loadBrands = async () => {
    const res = await fetch(`${brandsEndpoint}?page=1&per_page=999`, { headers: { Accept: "application/json" } });
    const json = await res.json();
    setBrands(Array.isArray(json) ? json : json.data);
  };

  const loadModels = async () => {
    const params = new URLSearchParams({ page: "1", per_page: "2000" });
    if (brandId) params.set("vehicle_brand_id", brandId);
    const res = await fetch(`${modelsEndpoint}?${params.toString()}`, { headers: { Accept: "application/json" } });
    const json = await res.json();
    setModels(Array.isArray(json) ? json : json.data);
  };

  const loadLinks = async () => {
    if (!partId) { setLinkedIds(new Set()); return; }
    const res = await fetch(`${fitmentsEndpoint}?part_id=${encodeURIComponent(partId)}`, { headers: { Accept: "application/json" } });
    const json = await res.json();
    const ids: string[] = (json || []).map((r: any) => String(r.vehicle_model_id));
    setLinkedIds(new Set(ids));
  };

  useEffect(() => { loadBrands(); }, []);
  useEffect(() => { loadModels(); }, [brandId]);
  useEffect(() => { loadLinks(); }, [partId]);

  const toggle = async (modelId: string) => {
    if (!partId) return;
    const has = linkedIds.has(modelId);
    if (has) {
      await fetch(fitmentsEndpoint, { method: "DELETE", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ part_id: partId, vehicle_model_id: modelId, engine_code: engineCode || null }) });
      const next = new Set(linkedIds); next.delete(modelId); setLinkedIds(next);
    } else {
      await fetch(fitmentsEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ part_id: partId, vehicle_model_id: modelId, engine_code: engineCode || null }) });
      const next = new Set(linkedIds); next.add(modelId); setLinkedIds(next);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <div className="text-2xl font-semibold">Fitment Matrix</div>
        <Card>
          <CardHeader><CardTitle>Link Part ↔ Vehicle Models</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1"><label className="text-sm">Part ID</label><Input value={partId} onChange={(e) => setPartId(e.target.value)} placeholder="e.g. 123" /></div>
              <div className="space-y-1">
                <label className="text-sm">Brand filter</label>
                <select className="border rounded px-3 py-2 text-sm w-full" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  <option value="">All brands</option>
                  {brands.map((b) => (<option key={String(b.id)} value={String(b.id)}>{b.name}</option>))}
                </select>
              </div>
              <div className="space-y-1"><label className="text-sm">Engine code (optional)</label><Input value={engineCode} onChange={(e) => setEngineCode(e.target.value)} placeholder="e.g. 1.9TDI ALH" /></div>
              <div className="flex items-end"><Button type="button" onClick={loadLinks}>Refresh Links</Button></div>
            </div>

            <div className="rounded border divide-y max-h-[65vh] overflow-auto">
              {models.length === 0 && <div className="p-4 text-sm text-muted-foreground">No models</div>}
              {models.map((m) => {
                const label = `${m.name} (${m.year_from ?? "?"}–${m.year_to ?? "?"})`;
                const checked = linkedIds.has(String(m.id));
                return (
                  <div key={String(m.id)} className="flex items-center gap-3 p-3">
                    <Checkbox checked={checked} onCheckedChange={() => toggle(String(m.id))} />
                    <div className="font-medium">{label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
