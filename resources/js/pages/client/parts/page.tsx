// file: resources/js/Pages/Parts/Catalog.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminLayout } from "@/pages/admin/layout/admin-layout";
interface PageProps {
  initialData: {
    per_page: number;
    current_page: number;
  };
}
interface VehicleBrand { id: number; name: string }
interface VehicleModel { id: number; name: string; vehicle_brand_id: number; year_from?: number; year_to?: number }
interface Category { id: number; name: string }
interface Part {
  id: number;
  name: string;
  sku?: string;
  description?: string;
  base_price?: number;
  currency: string;
  category: Category;
  images: { url: string; sort_order: number }[];
  vehicleModels: VehicleModel[];
}
interface PageData { data: Part[]; total: number; current_page: number; per_page: number }

export default function PartsCatalog() {
  //@ts-ignore
  const { props } = usePage<PageProps<{ initialData: { per_page: number; current_page: number } }>>();
  const [pageData, setPageData] = useState<PageData>({
    data: [],
    total: 0,
    current_page: props.initialData.current_page,
    per_page: props.initialData.per_page,
  });
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);

  // Fetch parts
  const fetchParts = async (page = 1) => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(pageData.per_page),
      ...(search && { search }),
      ...(brandId && { brand_id: brandId }),
      ...(modelId && { model_id: modelId }),
      ...(categoryId && { category_id: categoryId }),
    });
    const res = await fetch(`/api/customer/parts?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    setPageData(data);
    setIsLoading(false);
  };

  // Fetch brands
  const fetchBrands = async () => {
    if (brands.length > 0) return; // Cache brands
    const res = await fetch("/api/customer/brands", { headers: { Accept: "application/json" } });
    const data = await res.json();
    setBrands(data);
  };

  // Fetch models (filtered by brand_id if selected)
  const fetchModels = async () => {
    const params = brandId ? `?brand_id=${brandId}` : "";
    const res = await fetch(`/api/customer/models${params}`, { headers: { Accept: "application/json" } });
    const data = await res.json();
    setModels(data);
  };

  // Fetch categories
  const fetchCategories = async () => {
    if (categories.length > 0) return; // Cache categories
    const res = await fetch("/api/customer/categories", { headers: { Accept: "application/json" } });
    const data = await res.json();
    setCategories(data);
  };

  // Fetch parts when filters change
  useEffect(() => {
    fetchParts(1);
  }, [search, brandId, modelId, categoryId]);

  // Reset modelId when brandId changes
  useEffect(() => {
    setModelId("");
    if (brandId) fetchModels();
  }, [brandId]);

  return (
    <AdminLayout>

      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Parts Catalog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64"
                disabled={isLoading}
              />
              <Select value={brandId} onValueChange={setBrandId} onOpenChange={(open) => open && fetchBrands()}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={String(brand.id)}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={modelId} onValueChange={setModelId} disabled={!brandId || isLoading} onOpenChange={(open) => open && fetchModels()}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={String(model.id)}>
                      {model.name} {model.year_from ? `(${model.year_from}-${model.year_to || "Present"})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryId} onValueChange={setCategoryId} onOpenChange={(open) => open && fetchCategories()}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Compatible Models</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && pageData.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No parts found
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && pageData.data.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>
                        <img
                          src={part.images[0]?.url || "/placeholder.jpg"}
                          alt={part.name}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      </TableCell>
                      <TableCell>{part.name}</TableCell>
                      <TableCell>{part.sku || "N/A"}</TableCell>
                      <TableCell>{part.category.name}</TableCell>
                      <TableCell>
                        {part.vehicleModels?.map((m) => m.name).join(", ") || "Various models"}
                      </TableCell>
                      <TableCell>
                        {part.base_price ? `${part.base_price} ${part.currency}` : "Price on request"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                {pageData.total
                  ? `${(pageData.current_page - 1) * pageData.per_page + 1}-${Math.min(
                    pageData.total,
                    pageData.current_page * pageData.per_page
                  )} of ${pageData.total}`
                  : "0"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchParts(Math.max(1, pageData.current_page - 1))}
                  disabled={isLoading || pageData.current_page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm">Page {pageData.current_page} / {maxPage}</div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchParts(Math.min(maxPage, pageData.current_page + 1))}
                  disabled={isLoading || pageData.current_page >= maxPage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}