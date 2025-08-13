// file: app/admin/parts/page.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Pencil, Trash, Plus, X } from "lucide-react";
import { AdminLayout } from "../layout/admin-layout";
import { PartDialog } from "./part-dialog";

type Id = number | string;
interface Category { id: Id; name: string }
interface Manufacturer { id: Id; name: string }
interface VehicleBrand { id: Id; name: string }
interface VehicleModel { id: Id; name: string; vehicle_brand_id: Id }
interface PartPrice {
  id: Id;
  price_tier_id: Id;
  tier_id: number;
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
interface Page<T> {
  data: T[];
  current_page: number;
  previous_page: number | null;
  next_page: number | null;
  total_pages: number;
  total: number;
}

const endpointCategories = "/api/categories";
const endpointManufacturers = "/api/manufacturers";
const endpointVehicleBrands = "/api/vehicle-brands";
const endpointVehicleModels = "/api/vehicle-models";
const endpointParts = "/api/parts";

export default function PartsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [priceTiers, setPriceTiers] = useState<{ id: Id; code: string; label: string }[]>([]);
  const [pageData, setPageData] = useState<Page<Part>>({
    data: [],
    current_page: 1,
    previous_page: null,
    next_page: null,
    total_pages: 1,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const maxPage = useMemo(() => Math.max(1, pageData.total_pages), [pageData.total_pages]);

  const loadCategories = async () => {
    try {
      const res = await fetch(`${endpointCategories}?page=1&per_page=999`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Failed to fetch categories");
      const json = await res.json();
      setCategories(Array.isArray(json) ? json : json.data);
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategories([]);
    }
  };

  const loadManufacturers = async () => {
    try {
      const res = await fetch(`${endpointManufacturers}?page=1&per_page=999`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Failed to fetch manufacturers");
      const json = await res.json();
      setManufacturers(Array.isArray(json) ? json : json.data);
    } catch (error) {
      console.error("Error loading manufacturers:", error);
      setManufacturers([]);
    }
  };

  const loadVehicleBrands = async () => {
    try {
      const res = await fetch(`${endpointVehicleBrands}?page=1&per_page=999`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Failed to fetch vehicle brands");
      const json = await res.json();
      setVehicleBrands(Array.isArray(json) ? json : json.data);
    } catch (error) {
      console.error("Error loading vehicle brands:", error);
      setVehicleBrands([]);
    }
  };

  const loadVehicleModels = async () => {
    try {
      const res = await fetch(`${endpointVehicleModels}?page=1&per_page=999`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Failed to fetch vehicle models");
      const json = await res.json();
      setVehicleModels(Array.isArray(json) ? json : json.data);
    } catch (error) {
      console.error("Error loading vehicle models:", error);
      setVehicleModels([]);
    }
  };

  const loadPriceTiers = async () => {
    try {
      const res = await fetch("/api/price-tiers?page=1&per_page=999", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Failed to fetch price tiers");
      const json = await res.json();
      setPriceTiers(Array.isArray(json) ? json : json.data);
    } catch (error) {
      console.error("Error loading price tiers:", error);
      setPriceTiers([]);
    }
  };

  const fetchData = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "10" });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category_id", categoryFilter);
      if (manufacturerFilter) params.set("manufacturer_id", manufacturerFilter);
      const res = await fetch(`${endpointParts}?${params.toString()}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Failed to fetch parts");
      const json = await res.json();
      const normalized: Page<Part> = {
        data: Array.isArray(json.data) ? json.data : [],
        current_page: json.current_page || 1,
        previous_page: json.previous_page || null,
        next_page: json.next_page || null,
        total_pages: json.total_pages || 1,
        total: json.total || 0,
      };
      setPageData(normalized);
    } catch (error) {
      console.error("Error fetching parts:", error);
      setPageData({
        data: [],
        current_page: 1,
        previous_page: null,
        next_page: null,
        total_pages: 1,
        total: 0,
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadCategories(), loadManufacturers(), loadVehicleBrands(), loadVehicleModels(), loadPriceTiers()]);
      await fetchData(1);
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchData(1);
    }
  }, [search, categoryFilter, manufacturerFilter, isLoading]);

  const openCreate = () => {
    if (!isLoading) {
      setEditing(null);
      setOpen(true);
    }
  };

  const openEdit = (row: Part) => {
    if (!isLoading) {
      setEditing(row);
      setOpen(true);
    }
  };

  const save = async (payload: {
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
  }) => {
    try {
      const body = JSON.stringify({
        category_id: parseInt(payload.category_id),
        manufacturer_id: payload.manufacturer_id ? parseInt(payload.manufacturer_id) : null,
        sku: payload.sku?.trim() || null,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        package_qty: parseInt(payload.package_qty),
        min_order_qty: parseInt(payload.min_order_qty),
        currency: payload.currency.trim(),
        base_price: payload.base_price ? parseFloat(payload.base_price) : null,
        is_active: payload.is_active,
        prices: payload.prices.map((p) => ({
          price_tier_id: parseInt(p.price_tier_id),
          tier_id: parseInt(p.price_tier_id),
          min_qty: parseInt(p.min_qty),
          price: parseFloat(p.price),
          currency: p.currency,
        })),
        vehicle_model_ids: payload.vehicle_model_ids.map((id) => parseInt(id)),
      });
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (!editing) {
        await fetch(endpointParts, { method: "POST", headers, body });
      } else {
        await fetch(`${endpointParts}/${editing.id}`, { method: "PUT", headers, body });
      }
      setOpen(false);
      await fetchData(pageData.current_page);
    } catch (error) {
      console.error("Error saving part:", error);
    }
  };

  const remove = async (row: Part) => {
    if (!confirm(`Delete part "${row.name}"?`)) return;
    try {
      await fetch(`${endpointParts}/${row.id}`, { method: "DELETE", headers: { Accept: "application/json" } });
      await fetchData(pageData.current_page);
    } catch (error) {
      console.error("Error deleting part:", error);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading...</div>
        ) : (
          <>
            <div className="text-2xl font-semibold">Parts</div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search parts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={String(category.id)} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={manufacturerFilter}
                onValueChange={(value) => setManufacturerFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All manufacturers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {manufacturers.map((manufacturer) => (
                    <SelectItem key={String(manufacturer.id)} value={String(manufacturer.id)}>
                      {manufacturer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button size="sm" onClick={openCreate} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-1" />New Part
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">ID</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Pkg Qty</TableHead>
                    <TableHead>Min Qty</TableHead>
                    <TableHead>Retail Price</TableHead>
                    <TableHead>Bulk Price</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground">
                        No data
                      </TableCell>
                    </TableRow>
                  )}
                  {pageData.data.map((row) => {
                    const retailPrice = row.prices.find((p) => p.tier_id === 1);
                    const bulkPrice = row.prices.find((p) => p.tier_id === 3);
                    return (
                      <TableRow key={String(row.id)}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>
                          {categories.find((c) => String(c.id) === String(row.category_id))?.name ||
                            row.category_id}
                        </TableCell>
                        <TableCell>
                          {row.manufacturer_id
                            ? manufacturers.find((m) => String(m.id) === String(row.manufacturer_id))?.name ||
                            row.manufacturer_id
                            : ""}
                        </TableCell>
                        <TableCell>{row.sku ?? ""}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.package_qty}</TableCell>
                        <TableCell>{row.min_order_qty}</TableCell>
                        <TableCell>
                          {retailPrice ? `${retailPrice.price} ${retailPrice.currency}` : "-"}
                        </TableCell>
                        <TableCell>
                          {bulkPrice ? `${bulkPrice.price} ${bulkPrice.currency}` : "-"}
                        </TableCell>
                        <TableCell>{row.is_active ? "Yes" : "No"}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => remove(row)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {pageData.total
                  ? `${(pageData.current_page - 1) * 10 + 1}-${Math.min(
                    pageData.total,
                    pageData.current_page * 10
                  )} of ${pageData.total}`
                  : "0"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => pageData.previous_page && fetchData(pageData.previous_page)}
                  disabled={!pageData.previous_page}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm">Page {pageData.current_page} / {maxPage}</div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => pageData.next_page && fetchData(pageData.next_page)}
                  disabled={!pageData.next_page}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <PartDialog
              open={open}
              onOpenChange={setOpen}
              categories={categories}
              manufacturers={manufacturers}
              vehicleBrands={vehicleBrands}
              vehicleModels={vehicleModels}
              priceTiers={priceTiers}
              initial={editing || undefined}
              onSave={save}
            />
          </>
        )}
      </div>
    </AdminLayout>
  );
}