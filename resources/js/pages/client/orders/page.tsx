import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head } from "@inertiajs/react";
import { ClientLayout } from "../layout/client-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChevronDown } from "lucide-react";

declare const route: (name: string, params?: any) => string;

type Id = number | string;

type BriefItem = {
  sku?: string | null;
  name?: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
};

type OrderRow = {
  id: number;
  status: "cart" | "pending" | "confirmed" | "preparing" | "shipped" | "completed" | "canceled";
  delivery_method: "pickup" | "courier" | "post" | null;
  currency: string;
  items_count: number;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  items_brief: BriefItem[];
};

type Page<T> = { data: T[]; total: number; page: number; per_page: number };

const csrf =
  (typeof document !== "undefined" &&
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content) ||
  "";

const baseHeaders = (json = true) => ({
  Accept: "application/json",
  ...(json ? { "Content-Type": "application/json" } : {}),
  "X-CSRF-TOKEN": csrf,
  "X-Requested-With": "XMLHttpRequest",
});
const http = {
  get: (url: string) => fetch(url, { method: "GET", headers: baseHeaders(false), credentials: "same-origin" }),
};

const endpoints = {
  list: route("shop.api.orders.index"),
  view: (id: Id) => route("client.order.page", { order: id }),
};

const statusOptions = ["all", "cart", "pending", "confirmed", "preparing", "shipped", "completed", "canceled"] as const;
const methodOptions = ["all", "pickup", "courier", "post"] as const;
const sortOptions = [
  { value: "created_at", label: "Date" },
  { value: "grand_total", label: "Amount" },
  { value: "status", label: "Status" },
] as const;

export default function OrdersPage() {
  const [filters, setFilters] = useState({
    q: "",
    status: "all",
    delivery_method: "all",
    from: "",
    to: "",
    sort_by: "created_at",
    sort_dir: "desc",
  });
  const [pageData, setPageData] = useState<Page<OrderRow>>({ data: [], total: 0, page: 1, per_page: 12 });
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);
  const reqRef = useRef(0);

  const refresh = async (page = 1) => {
    const myReq = ++reqRef.current;
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(pageData.per_page),
      q: filters.q,
      status: filters.status,
      delivery_method: filters.delivery_method,
      from: filters.from,
      to: filters.to,
      sort_by: filters.sort_by,
      sort_dir: filters.sort_dir,
    });
    const res = await http.get(`${endpoints.list}?${params.toString()}`);
    const js = await res.json();
    if (myReq !== reqRef.current) return;
    setPageData(js);
  };

  useEffect(() => { refresh(1); }, []); // initial
  useEffect(() => { refresh(1); }, [filters.q, filters.status, filters.delivery_method, filters.from, filters.to, filters.sort_by, filters.sort_dir]);

  const briefText = (row: OrderRow) => {
    const arr = row.items_brief || [];
    if (!arr.length) return "—";
    const first = arr.slice(0, 3).map(i => {
      const title = i.name || i.sku || "Item";
      return `${title} ×${i.qty} (${i.line_total.toFixed(2)} ${row.currency})`;
    });
    const extra = arr.length > 3 ? ` +${arr.length - 3} more` : "";
    return first.join(", ") + extra;
    // You can show brand/model later if needed by expanding the payload
  };

  const money = (n: number, c: string) => `${Number(n).toFixed(2)} ${c}`;
  const statusBadge = (s: OrderRow["status"]) => {
    const label = s[0].toUpperCase() + s.slice(1);
    return <span className="px-2 py-1 rounded bg-muted text-xs">{label}</span>;
  };

  return (
    <ClientLayout title="Orders">
      <div className="p-6 pt-0">
        <Head title="My Orders" />
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">My Orders</h1>
        </div>
        {/* Filters */}
        <Card className="p-4 mb-4">
          <div className="flex flex-row flex-wrap gap-3">
            <div className="w-[180px] md:col-span-2 space-y-2">
              <Label>Search</Label>
              <div className="flex gap-2">
                <Input
                  className="w-full"
                  placeholder="Order #, item name, SKU, reference…"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                />
                {/* <Button variant="outline" onClick={() => refresh(1)}>
                  <Search className="h-4 w-4" />
                </Button> */}
              </div>
            </div>

            <div className="w-[120px] space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[120px] space-y-2">
              <Label>Method</Label>
              <Select value={filters.delivery_method} onValueChange={(v) => setFilters({ ...filters, delivery_method: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {methodOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[150px] space-y-2">
              <Label>From</Label>
              <Input className="w-full" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </div>

            <div className="w-[150px] space-y-2">
              <Label>To</Label>
              <Input className="w-full" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </div>

            <div className="w-[240px] space-y-2">
              <Label>Sort</Label>
              <div className="flex gap-2">
                <Select value={filters.sort_by} onValueChange={(v) => setFilters({ ...filters, sort_by: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.sort_dir} onValueChange={(v) => setFilters({ ...filters, sort_dir: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Desc</SelectItem>
                    <SelectItem value="asc">Asc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-end">
              <Button variant="ghost" onClick={() => { setFilters({ q: "", status: "all", delivery_method: "all", from: "", to: "", sort_by: "created_at", sort_dir: "desc" }); }}>
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Order #</TableHead>
                <TableHead className="w-[160px]">Date</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead>Items (brief)</TableHead>
                <TableHead className="w-[90px]">Count</TableHead>
                <TableHead className="w-[130px]">Subtotal</TableHead>
                <TableHead className="w-[110px]">Ship</TableHead>
                <TableHead className="w-[140px]">Total</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                pageData.data.map(o => {
                  const expanded = expandedRows[o.id] || false;

                  return (
                    <React.Fragment key={o.id}>
                      <TableRow>
                        <TableCell>
                          <button
                            className="flex items-center gap-1"
                            onClick={() =>
                              setExpandedRows(prev => ({
                                ...prev,
                                [o.id]: !expanded
                              }))
                            }
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            #{o.id}
                          </button>
                        </TableCell>
                        <TableCell>{new Date(o.created_at).toLocaleString()}</TableCell>
                        <TableCell>{statusBadge(o.status)}</TableCell>
                        <TableCell className="text-xs">{briefText(o)}</TableCell>
                        <TableCell>{o.items_count}</TableCell>
                        <TableCell>{money(o.subtotal, o.currency)}</TableCell>
                        <TableCell>{money(o.shipping_total, o.currency)}</TableCell>
                        <TableCell className="font-semibold">
                          {money(o.grand_total, o.currency)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => (window.location.href = endpoints.view(o.id))}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>

                      {expanded && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/40">
                            <div className="p-3 space-y-2 text-sm">
                              <div className="font-semibold">Items</div>
                              <ul className="list-disc pl-6">
                                {o.items_brief.map((i, idx) => (
                                  <li key={idx}>
                                    {i.name || i.sku || "Item"} ×{i.qty} (
                                    {i.line_total.toFixed(2)} {o.currency})
                                  </li>
                                ))}
                              </ul>
                              <div className="flex gap-6 text-muted-foreground">
                                <span>Discount: {money(o.discount_total, o.currency)}</span>
                                <span>Tax: {money(o.tax_total, o.currency)}</span>
                                <span>Updated: {new Date(o.updated_at).toLocaleString()}</span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>


          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {pageData.total ? `${(pageData.page - 1) * pageData.per_page + 1}-${Math.min(pageData.total, pageData.page * pageData.per_page)} of ${pageData.total}` : "0"}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="per">Per page</Label>
              <Select value={String(pageData.per_page)} onValueChange={(v) => setPageData((p) => ({ ...p, per_page: Number(v) }))}>
                <SelectTrigger className="w-[84px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 12, 20, 30, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refresh(1)}>Apply</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refresh(Math.max(1, pageData.page - 1))} disabled={pageData.page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">Page {pageData.page} / {maxPage}</div>
              <Button variant="outline" size="icon" onClick={() => refresh(Math.min(maxPage, pageData.page + 1))} disabled={pageData.page >= maxPage}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
