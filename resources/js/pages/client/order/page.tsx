import { useEffect, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { ClientLayout } from "../layout/client-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Truck } from "lucide-react";

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
};

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
  orderShow: (id: Id) => route("shop.api.orders.show", { order: id }),
  backToCatalog: route("client.parts.page"),
};

export default function OrderPage() {
  const { props } = usePage<{ orderId: number }>();
  const orderId = props.orderId;

  const [order, setOrder] = useState<OrderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await http.get(endpoints.orderShow(orderId));
      if (!res.ok) {
        const js = await res.json().catch(() => null);
        setErr(js?.message ?? "Échec du chargement de la commande.");
      } else {
        const js = await res.json();
        setOrder(js as OrderPayload);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Échec du chargement de la commande.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [orderId]);

  const statusLabel = (s: OrderPayload["status"]) => {
    switch (s) {
      case "cart": return "Panier";
      case "pending": return "En attente";
      case "confirmed": return "Confirmé";
      case "preparing": return "Préparation";
      case "shipped": return "Expédié";
      case "completed": return "Terminé";
      case "canceled": return "Annulé";
      default: return s;
    }
  };

  return (
    <ClientLayout title={`Commande n°${orderId}`} >
      <div className="p-6 pt-0">
        <Head title={`Commande n°${orderId}`} />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button className="cursor-pointer" size={'icon'} variant="outline" onClick={() => router.get(window.history.back() as any)}>
              <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-semibold">Commande n°{orderId}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refresh}>Actualiser</Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-4">Chargement…</Card>
        ) : err ? (
          <Card className="p-4 text-red-600">{err}</Card>
        ) : !order ? (
          <Card className="p-4">Commande introuvable.</Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Items */}
            <Card className="p-4 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold">Articles</div>
                <span className="text-sm text-muted-foreground">{order.items_count} Article(s)</span>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">SKU</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead className="w-[160px]">Fabricant</TableHead>
                      <TableHead className="w-[120px]">Qté</TableHead>
                      <TableHead className="w-[140px]">Unité</TableHead>
                      <TableHead className="w-[140px]">Total</TableHead>
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
                <div className="font-semibold mb-0">Statut</div>
                <div className="text-sm">
                  {/* <div className="mb-2">
                    <span className="px-2 py-1 rounded bg-muted">{statusLabel(order.status)}</span>
                  </div> */}
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
              </Card>

              <Card className="p-4 gap-2">
                <div className="font-semibold mb-1">Récapitulatif</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Sous-total</span>
                    <span>{order.subtotal.toFixed(2)} {order.currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Remise</span>
                    <span>- {order.discount_total.toFixed(2)} {order.currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Livraison</span>
                    <span>{order.shipping_total.toFixed(2)} {order.currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tax</span>
                    <span>{order.tax_total.toFixed(2)} {order.currency}</span>
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between">
                    <span className="font-semibold">Total général</span>
                    <span className="font-semibold">{order.grand_total.toFixed(2)} {order.currency}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 gap-2">
                <div className="font-semibold mb-1">Contact et livraison</div>
                <div className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">Méthode :</span> {order.delivery_method ?? '—'}</div>
                  <div><span className="text-muted-foreground">Nom :</span> {order.ship_to.name ?? '—'}</div>
                  <div><span className="text-muted-foreground">Téléphone :</span> {order.ship_to.phone ?? '—'}</div>
                  <div><span className="text-muted-foreground">Adresse :</span> {order.ship_to.address ?? '—'}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                  <Truck className="h-3 w-3" /> Mise à jour : {order.updated_at ? new Date(order.updated_at).toLocaleString() : '—'}
                </p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
