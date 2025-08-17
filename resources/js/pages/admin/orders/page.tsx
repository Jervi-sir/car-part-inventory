import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head } from "@inertiajs/react";
import { AdminLayout } from "../layout/admin-layout"; // change if you have an AdminLayout
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import api from "@/lib/api";

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
  user?: { id: number; name: string; email: string | null } | null; // 👈 add this
};

type Page<T> = { data: T[]; total: number; page: number; per_page: number };

// Extra data we lazy-load per order when expanded
type OrderExtra = {
  user?: { id: number; name: string; email: string | null } | null;
};

const endpoints = {
  list: route("admin.api.orders.index"),
  view: (id: Id) => route("admin.order.page", { order: id }),
  show: (id: Id) => route("admin.api.orders.show", { order: id }), // <-- added
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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // cache for extra per-order info (user)
  const [rowExtra, setRowExtra] = useState<Record<number, OrderExtra>>({});
  const [rowExtraLoading, setRowExtraLoading] = useState<Record<number, boolean>>({});

  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);
  const reqRef = useRef(0);

  const refresh = async (page = 1) => {
    const myReq = ++reqRef.current;
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get(endpoints.list, {
        params: {
          page,
          per_page: pageData.per_page,
          q: filters.q,
          status: filters.status,
          delivery_method: filters.delivery_method,
          from: filters.from,
          to: filters.to,
          sort_by: filters.sort_by,
          sort_dir: filters.sort_dir,
        },
      });
      if (myReq !== reqRef.current) return;
      setPageData(data as Page<OrderRow>);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load orders.");
    } finally {
      if (myReq === reqRef.current) setLoading(false);
    }
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
  };

  const money = (n: number, c: string) => `${Number(n).toFixed(2)} ${c}`;
  const statusBadge = (s: OrderRow["status"]) => {
    const label = s[0].toUpperCase() + s.slice(1);
    return <span className="px-2 py-1 rounded bg-muted text-xs">{label}</span>;
  };

  // Lazy-load extra info (user) when a row is expanded
  const loadExtra = async (orderId: number) => {
    if (rowExtra[orderId] || rowExtraLoading[orderId]) return;
    setRowExtraLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const { data } = await api.get(endpoints.show(orderId));
      // Expecting backend to include { user: { id, name, email }, ... }
      setRowExtra(prev => ({
        ...prev,
        [orderId]: {
          user: data?.user ?? null,
        },
      }));
    } catch (_) {
      setRowExtra(prev => ({ ...prev, [orderId]: { user: null } }));
    } finally {
      setRowExtraLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <AdminLayout title="Orders">
      <div className="p-6 pt-0">
        <Head title="Orders" />
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Orders</h1>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-4">
          <div className="flex flex-row flex-wrap gap-3">
            <div className="w-[220px] md:col-span-2 space-y-2">
              <Label>Search</Label>
              <Input
                className="w-full"
                placeholder="Order #, name, phone, SKU, reference…"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
            </div>

            <div className="w-[140px] space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px] space-y-2">
              <Label>Method</Label>
              <Select value={filters.delivery_method} onValueChange={(v) => setFilters({ ...filters, delivery_method: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  {methodOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[160px] space-y-2">
              <Label>From</Label>
              <Input className="w-full" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </div>

            <div className="w-[160px] space-y-2">
              <Label>To</Label>
              <Input className="w-full" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </div>

            <div className="w-[280px] space-y-2">
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

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => refresh(1)}
                disabled={loading}
              >
                {loading ? "Loading…" : "Apply"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setFilters({ q: "", status: "all", delivery_method: "all", from: "", to: "", sort_by: "created_at", sort_dir: "desc" });
                }}
              >
                Clear
              </Button>
            </div>
          </div>
          {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
        </Card>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Order #</TableHead>
                <TableHead className="w-[180px]">Date</TableHead>
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
              {pageData.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    {loading ? "Loading…" : "No orders found"}
                  </TableCell>
                </TableRow>
              ) : (
                pageData.data?.map(o => {
                  const expanded = expandedRows[o.id] || false;

                  return (
                    <React.Fragment key={o.id}>
                      <TableRow>
                        <TableCell>
                          <button
                            className="flex items-center gap-1"
                            onClick={() => {
                              const next = !expanded;
                              setExpandedRows(prev => ({ ...prev, [o.id]: next }));
                              if (next) loadExtra(o.id); // 🔹 fetch user when expanding
                            }}
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
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
                            <div className="p-3 space-y-3 text-sm">
                              {/* Items brief list (existing) */}
                              <div>
                                <div className="font-semibold">Items</div>
                                <ul className="list-disc pl-4">
                                  {o.items_brief.map((i, idx) => (
                                    <li key={idx}>
                                      {i.name || i.sku || "Item"} ×{i.qty} ({i.line_total.toFixed(2)} {o.currency})
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Totals mini-line */}
                              {/* <div className="flex gap-6 text-muted-foreground pt-1">
                                <span>Discount: {money(o.discount_total, o.currency)}</span>
                                <span>Tax: {money(o.tax_total, o.currency)}</span>
                              </div> */}
                              <div>

                                <div className="flex items-center justify-between flex-wrap gap-3">
                                  <div className="font-semibold">User</div>
                                  <div className="text-muted-foreground text-xs">
                                    Updated: {new Date(o.updated_at).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  {o.user ? (
                                    <div className="space-y-1">
                                      <div><span className="text-muted-foreground">Name:</span> {o.user.name}</div>
                                      <div><span className="text-muted-foreground">Email:</span> {o.user.email ?? "—"}</div>
                                      <div className="text-xs text-muted-foreground">User ID: {o.user.id}</div>
                                    </div>
                                  ) : (
                                    <div className="text-muted-foreground">—</div>
                                  )}
                                </div>
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
    </AdminLayout>
  );
}
