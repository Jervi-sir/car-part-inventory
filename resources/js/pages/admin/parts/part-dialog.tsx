// file: app/admin/parts/page.tsx (only PartDialog component updated)
import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X } from "lucide-react";

type Id = number | string;
interface Category { id: Id; name: string }
interface Manufacturer { id: Id; name: string }
interface VehicleBrand { id: Id; name: string }
interface VehicleModel { id: Id; name: string; vehicle_brand_id: Id }
interface PartPrice {
  id: Id;
  price_tier_id: Id;
  min_qty: number;
  price: number;
  currency: string;
}
interface Part {
  id: Id;
  category_id: Id;
  manufacturer_id: Id | null;
  sku: string | null;
  name: string;
  description: string | null;
  package_qty: number;
  min_order_qty: number;
  currency: string;
  base_price: number | null;
  is_active: boolean;
  prices: PartPrice[];
  vehicle_models: VehicleModel[];
}

export function PartDialog({
  open,
  onOpenChange,
  categories,
  manufacturers,
  vehicleBrands,
  vehicleModels,
  priceTiers = [],
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  manufacturers: Manufacturer[];
  vehicleBrands: VehicleBrand[];
  vehicleModels: VehicleModel[];
  priceTiers?: { id: Id; code: string; label: string }[];
  initial?: Part;
  onSave: (payload: {
    category_id: string;
    manufacturer_id: string | undefined;
    sku?: string;
    name: string;
    description?: string;
    package_qty: string;
    min_order_qty: string;
    currency: string;
    base_price?: string;
    is_active: boolean;
    prices: { price_tier_id: string; min_qty: string; price: string; currency: string }[];
    vehicle_model_ids: string[];
  }) => void | Promise<void>;
}) {
  const [categoryId, setCategoryId] = useState(String(initial?.category_id || ""));
  const [manufacturerId, setManufacturerId] = useState(
    initial?.manufacturer_id ? String(initial.manufacturer_id) : "none"
  );
  const [sku, setSku] = useState(initial?.sku || "");
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [packageQty, setPackageQty] = useState(String(initial?.package_qty ?? 1));
  const [minOrderQty, setMinOrderQty] = useState(String(initial?.min_order_qty ?? 1));
  const [currency, setCurrency] = useState(initial?.currency || "DZD");
  const [basePrice, setBasePrice] = useState(initial?.base_price ? String(initial.base_price) : "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [prices, setPrices] = useState<
    { price_tier_id: string; min_qty: string; price: string; currency: string }[]
  >(
    initial?.prices
      ? initial.prices.map((p) => ({
          price_tier_id: String(p.price_tier_id),
          min_qty: String(p.min_qty),
          price: String(p.price),
          currency: p.currency,
        }))
      : priceTiers.length > 0
      ? priceTiers.map((tier) => ({
          price_tier_id: String(tier.id),
          min_qty: "1",
          price: "",
          currency: "DZD",
        }))
      : []
  );
  const [vehicleSelections, setVehicleSelections] = useState<
    { brandId: string; modelIds: string[] }[]
  >(
    initial?.vehicle_models
      ? Object.values(
          initial.vehicle_models.reduce((acc, model) => {
            const brandId = String(model.vehicle_brand_id);
            if (!acc[brandId]) acc[brandId] = { brandId, modelIds: [] };
            acc[brandId].modelIds.push(String(model.id));
            return acc;
          }, {} as Record<string, { brandId: string; modelIds: string[] }>)
        )
      : []
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCategoryId(String(initial?.category_id || ""));
      setManufacturerId(initial?.manufacturer_id ? String(initial.manufacturer_id) : "none");
      setSku(initial?.sku || "");
      setName(initial?.name || "");
      setDescription(initial?.description || "");
      setPackageQty(String(initial?.package_qty ?? 1));
      setMinOrderQty(String(initial?.min_order_qty ?? 1));
      setCurrency(initial?.currency || "DZD");
      setBasePrice(initial?.base_price ? String(initial.base_price) : "");
      setIsActive(initial?.is_active ?? true);
      setPrices(
        initial?.prices
          ? initial.prices.map((p) => ({
              price_tier_id: String(p.price_tier_id),
              min_qty: String(p.min_qty),
              price: String(p.price),
              currency: p.currency,
            }))
          : priceTiers.length > 0
          ? priceTiers.map((tier) => ({
              price_tier_id: String(tier.id),
              min_qty: "1",
              price: "",
              currency: "DZD",
            }))
          : []
      );
      setVehicleSelections(
        initial?.vehicle_models
          ? Object.values(
              initial.vehicle_models.reduce((acc, model) => {
                const brandId = String(model.vehicle_brand_id);
                if (!acc[brandId]) acc[brandId] = { brandId, modelIds: [] };
                acc[brandId].modelIds.push(String(model.id));
                return acc;
              }, {} as Record<string, { brandId: string; modelIds: string[] }>)
            )
          : []
      );
    }
  }, [open, initial, priceTiers]);

  const handlePriceChange = (index: number, field: string, value: string) => {
    const newPrices = [...prices];
    newPrices[index] = { ...newPrices[index], [field]: value };
    setPrices(newPrices);
  };

  const addVehicleSelection = () => {
    setVehicleSelections([...vehicleSelections, { brandId: "", modelIds: [] }]);
  };

  const updateVehicleSelection = (index: number, field: "brandId" | "modelIds", value: string | string[]) => {
    const newSelections = [...vehicleSelections];
    if (field === "brandId") {
      newSelections[index] = { brandId: value as string, modelIds: [] }; // Reset modelIds when brand changes
    } else {
      newSelections[index] = { ...newSelections[index], modelIds: value as string[] };
    }
    setVehicleSelections(newSelections);
  };

  const removeVehicleSelection = (index: number) => {
    setVehicleSelections(vehicleSelections.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (!name.trim() || !categoryId) return;
    setSubmitting(true);
    try {
      const vehicleModelIds = Array.from(
        new Set(vehicleSelections.flatMap((selection) => selection.modelIds).filter((id) => id !== ""))
      ); // Deduplicate model IDs
      await onSave({
        category_id: categoryId,
        manufacturer_id: manufacturerId === "none" ? undefined : manufacturerId,
        sku: sku || undefined,
        name,
        description: description || undefined,
        package_qty: packageQty,
        min_order_qty: minOrderQty,
        currency,
        base_price: basePrice || undefined,
        is_active: isActive,
        prices: prices.filter((p) => p.price.trim() !== ""),
        vehicle_model_ids: vehicleModelIds,
      });
    } catch (error) {
      console.error("Error saving part:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Part" : "New Part"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[500px] rounded-md border">
          <div className="p-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="quantities">Quantities</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="vehicles">Vehicle Models</TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={String(c.id)} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Manufacturer (optional)</label>
                  <Select value={manufacturerId} onValueChange={setManufacturerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manufacturer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {manufacturers.map((m) => (
                        <SelectItem key={String(m.id)} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">SKU (optional)</label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. ABC-123" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brake Pad Set" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Description (optional)</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed description..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="is_active" checked={isActive} onCheckedChange={(checked) => setIsActive(!!checked)} />
                  <label htmlFor="is_active" className="text-sm font-medium">Active</label>
                </div>
              </TabsContent>
              <TabsContent value="quantities" className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Package Qty</label>
                    <Input
                      type="number"
                      value={packageQty}
                      onChange={(e) => setPackageQty(e.target.value)}
                      min="1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Min Order Qty</label>
                    <Input
                      type="number"
                      value={minOrderQty}
                      onChange={(e) => setMinOrderQty(e.target.value)}
                      min="1"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Currency</label>
                    <Input
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      placeholder="DZD"
                      maxLength={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Base Price (optional)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="100.00"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Price Tiers</label>
                  {priceTiers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Loading price tiers...</div>
                  ) : (
                    priceTiers.map((tier, index) => (
                      <div key={tier.id} className="grid grid-cols-3 gap-3 mb-2">
                        <div className="space-y-1">
                          <label className="text-sm">{tier.label}</label>
                          <Input value={tier.label} disabled />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm">Min Qty</label>
                          <Input
                            type="number"
                            value={prices[index]?.min_qty || "1"}
                            onChange={(e) => handlePriceChange(index, "min_qty", e.target.value)}
                            min="1"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm">Price</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={prices[index]?.price || ""}
                            onChange={(e) => handlePriceChange(index, "price", e.target.value)}
                            placeholder="100.00"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
              <TabsContent value="vehicles" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Compatible Vehicle Models (optional)</label>
                  {vehicleBrands.length === 0 || vehicleModels.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Loading vehicle brands and models...</div>
                  ) : (
                    <div className="space-y-3">
                      {vehicleSelections.map((selection, index) => (
                        <div key={index} className="flex items-center gap-3 border p-3 rounded-md">
                          <div className="flex-1 space-y-1">
                            <label className="text-sm">Vehicle Brand</label>
                            <Select
                              value={selection.brandId}
                              onValueChange={(value) => updateVehicleSelection(index, "brandId", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a brand" />
                              </SelectTrigger>
                              <SelectContent>
                                {vehicleBrands.map((brand) => (
                                  <SelectItem key={String(brand.id)} value={String(brand.id)}>
                                    {brand.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1 space-y-1">
                            <label className="text-sm">Vehicle Models</label>
                            <div className="border rounded p-2 max-h-40 overflow-y-auto">
                              {selection.brandId ? (
                                vehicleModels
                                  .filter((model) => String(model.vehicle_brand_id) === selection.brandId)
                                  .map((model) => (
                                    <div key={String(model.id)} className="flex items-center space-x-2 py-1">
                                      <Checkbox
                                        id={`model-${index}-${model.id}`}
                                        checked={selection.modelIds.includes(String(model.id))}
                                        onCheckedChange={() =>
                                          updateVehicleSelection(index, "modelIds", [
                                            ...selection.modelIds,
                                            String(model.id),
                                          ].filter((id) =>
                                            selection.modelIds.includes(id)
                                              ? id !== String(model.id)
                                              : id === String(model.id)
                                          ))
                                        }
                                      />
                                      <label htmlFor={`model-${index}-${model.id}`} className="text-sm">
                                        {model.name}
                                      </label>
                                    </div>
                                  ))
                              ) : (
                                <div className="text-sm text-muted-foreground">Select a brand first</div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVehicleSelection(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={addVehicleSelection}
                        className="w-full"
                        disabled={vehicleBrands.length === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Vehicle Compatibility
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !name.trim() || !categoryId}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}