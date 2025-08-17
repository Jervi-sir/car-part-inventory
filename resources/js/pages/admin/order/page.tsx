// resources/js/pages/admin/order.tsx
import { useEffect, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { AdminLayout } from "../layout/admin-layout"; // change if you have an AdminLayout
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Truck } from "lucide-react";
import api from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // if you have it

declare const route: (name: string, params?: any) => string;

type Id = number | string;
type Mini = { id: Id; name: string };
type Ref = { type: string; code: string; source_brand?: string | null };

type OrderItem = {
  id: number;
  sku?: string | null;
  name: string;
  image?: string | null;
  manufacturer?: Mini | null;
  category?: Mini | null;

  min_order_qty: number;
  min_qty_gros: number;
  price_retail?: number | null;
  price_demi_gros?: number | null;
  price_gros?: number | null;

  fitment_models: string[];
  fitment_brands: string[];
  references: Ref[];

  qty: number;
  unit_price: number;
  line_total: number;
};

type OrderPayload = {
  id: number;
  status: 'cart' | 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'completed' | 'canceled';
  status_steps: string[];
  status_index: number;
  delivery_method: 'pickup' | 'courier' | 'post' | null;
  ship_to: { name?: string | null; phone?: string | null; address?: string | null };
  currency: string;
  items: OrderItem[];
  items_count: number;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  created_at?: string | null;
  updated_at?: string | null;
  notes?: string | null;
  user?: { id: number; name: string; email: string | null } | null;
};

const endpoints = {
  orderShow: (id: Id) => route("admin.order.api.show", { order: id }),
  backToList: route("admin.orders.page"),
  updateStatus: (id: Id) => route("admin.api.orders.status", { order: id }),
  updateShipping: (id: Id) => route("admin.api.orders.shipping", { order: id }),
  addNote: (id: Id) => route("admin.api.orders.notes", { order: id }), // reuse name, but it's PATCH now
};

export default function OrderPage() {
  const { props } = usePage<{ orderId: number }>();
  const orderId = props.orderId;

  const [order, setOrder] = useState<OrderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [shipName, setShipName] = useState(order?.ship_to.name ?? "");
  const [shipPhone, setShipPhone] = useState(order?.ship_to.phone ?? "");
  const [shipAddress, setShipAddress] = useState(order?.ship_to.address ?? "");
  const [note, setNote] = useState("");

  const refresh = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await api.get(endpoints.orderShow(orderId));
      setOrder(res.data as OrderPayload);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load order.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [orderId]);
  useEffect(() => {
    if (order) {
      setShipName(order.ship_to.name ?? "");
      setShipPhone(order.ship_to.phone ?? "");
      setShipAddress(order.ship_to.address ?? "");
      setNote(order.notes ?? "");
    }
  }, [order]);

  const statusLabel = (s: OrderPayload["status"]) => {
    switch (s) {
      case "cart": return "Cart";
      case "pending": return "Pending";
      case "confirmed": return "Confirmed";
      case "preparing": return "Preparing";
      case "shipped": return "Shipped";
      case "completed": return "Completed";
      case "canceled": return "Canceled";
      default: return s;
    }
  };

  return (
    <AdminLayout title={`Order #${orderId}`} >
      <div className="p-6 pt-0">
        <Head title={`Order #${orderId}`} />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              className="cursor-pointer"
              size={'icon'}
              variant="outline"
              onClick={() => (window.location.href = endpoints.backToList)}
              title="Back to Orders"
            >
              <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-semibold">Order #{orderId}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refresh}>Refresh</Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-4">Loading…</Card>
        ) : err ? (
          <Card className="p-4 text-red-600">{err}</Card>
        ) : !order ? (
          <Card className="p-4">Order not found.</Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Items */}
            <Card className="p-4 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold">Items</div>
                <span className="text-sm text-muted-foreground">{order.items_count} item(s)</span>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[160px]">Manufacturer</TableHead>
                      <TableHead className="w-[120px]">Qty</TableHead>
                      <TableHead className="w-[140px]">Unit</TableHead>
                      <TableHead className="w-[140px]">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-mono text-xs">{it.sku || "—"}</TableCell>
                        <TableCell className="font-medium">{it.name}</TableCell>
                        <TableCell>{it.manufacturer?.name || "—"}</TableCell>
                        <TableCell>{it.qty}</TableCell>
                        <TableCell>{it.unit_price.toFixed(2)} {order.currency}</TableCell>
                        <TableCell className="font-semibold">{it.line_total.toFixed(2)} {order.currency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Right: Status + Summary + Shipping */}
            <div className="space-y-6">
              <Card className="p-4 gap-2">
                <div className="font-semibold mb-0">Status</div>
                <div className="text-sm">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {order.status_steps.map((s, idx) => (
                      <span
                        key={s}
                        className={`px-2 py-1 rounded border ${idx <= order.status_index ? 'bg-primary/10 border-primary text-primary' : 'text-muted-foreground'}`}
                      >
                        {statusLabel(s as any)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 👉 ADD THIS: action buttons */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {['confirmed', 'preparing', 'shipped', 'completed', 'canceled'].map((target) => (
                    <Button
                      key={target}
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await api.patch(endpoints.updateStatus(order.id), { status: target });
                          await refresh();
                        } catch (e: any) {
                          alert(e?.response?.data?.message || e.message);
                        }
                      }}
                    >
                      Set {statusLabel(target as any)}
                    </Button>
                  ))}
                </div>
              </Card>


              <Card className="p-4 gap-2">
                <div className="font-semibold mb-1">Summary</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{order.subtotal.toFixed(2)} {order.currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Discount</span>
                    <span>- {order.discount_total.toFixed(2)} {order.currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping</span>
                    <span>{order.shipping_total.toFixed(2)} {order.currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tax</span>
                    <span>{order.tax_total.toFixed(2)} {order.currency}</span>
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between">
                    <span className="font-semibold">Grand Total</span>
                    <span className="font-semibold">{order.grand_total.toFixed(2)} {order.currency}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 gap-2">
                <div className="font-semibold mb-1">Contact & Shipping</div>
                <div className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">Method:</span> {order.delivery_method ?? '—'}</div>
                  <div><span className="text-muted-foreground">Name:</span> {order.ship_to.name ?? '—'}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {order.ship_to.phone ?? '—'}</div>
                  <div><span className="text-muted-foreground">Address:</span> {order.ship_to.address ?? '—'}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                  <Truck className="h-3 w-3" /> Updated: {order.updated_at ? new Date(order.updated_at).toLocaleString() : '—'}
                </p>
              </Card>

              <Card className="p-4 gap-2">
                <Label className="font-semibold">Edit Shipping</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Recipient name"
                    value={shipName}
                    onChange={(e) => setShipName(e.target.value)}
                  />
                  <Input
                    placeholder="Phone"
                    value={shipPhone}
                    onChange={(e) => setShipPhone(e.target.value)}
                  />
                  <Input
                    placeholder="Address"
                    value={shipAddress}
                    onChange={(e) => setShipAddress(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="self-end"
                    onClick={async () => {
                      try {
                        await api.patch(endpoints.updateShipping(order!.id), {
                          ship_to_name: shipName,
                          ship_to_phone: shipPhone,
                          ship_to_address: shipAddress,
                        });
                        // await refresh();
                      } catch (e: any) {
                        alert(e?.response?.data?.message || e.message);
                      }
                    }}
                  >
                    Save Shipping
                  </Button>
                </div>
              </Card>


              <Card className="p-4 gap-2">
                <Label className="font-semibold">Notes</Label>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Internal notes…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                  />
                  <div className="flex flex-row justify-end">
                    <Button
                      size="sm"
                      className="self-end"
                      onClick={async () => {
                        try {
                          await api.patch(endpoints.addNote(order!.id), { notes: note });
                          await refresh();
                        } catch (e: any) {
                          alert(e?.response?.data?.message || e.message);
                        }
                      }}
                    >
                      Save Note
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-4 gap-2">
                <div className="font-semibold mb-1">Customer</div>
                {order.user ? (
                  <div className="text-sm space-y-1">
                    <div><span className="text-muted-foreground">Name:</span> {order.user.name}</div>
                    <div><span className="text-muted-foreground">Email:</span> {order.user.email ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">User ID: {order.user.id}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </Card>


            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
