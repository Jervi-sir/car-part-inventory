// resources/js/pages/admin/user.tsx
import { useEffect, useRef, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import { AdminLayout } from "../layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";

declare const route: (name: string, params?: any) => string;

type Id = number | string;
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
};

type OrdersPage = { data: OrderRow[]; total: number; page: number; per_page: number };

type UserPayload = {
  id: number;
  name: string;
  full_name?: string | null;
  email: string;
  created_at?: string | null;
};

const endpoints = {
  back: route("admin.users.page"),
  show: (id: Id) => route("admin.api.users.show", { user: id }),
  viewOrder: (id: Id) => route("admin.order.page", { order: id }),
};

export default function UserPage() {
  const { props } = usePage<{ userId: number }>();
  const userId = props.userId;

  const [user, setUser] = useState<UserPayload | null>(null);
  const [orders, setOrders] = useState<OrdersPage>({ data: [], total: 0, page: 1, per_page: 10 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const reqRef = useRef(0);

  const refresh = async (page = 1) => {
    const my = ++reqRef.current;
    setLoading(true); setErr(null);
    try {
      const { data } = await api.get(endpoints.show(userId), {
        params: { page, per_page: orders.per_page, sort_by: sortBy, sort_dir: sortDir }
      });
      if (my !== reqRef.current) return;
      setUser(data.user as UserPayload);
      setOrders(data.orders as OrdersPage);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load user.");
    } finally {
      if (my === reqRef.current) setLoading(false);
    }
  };

  useEffect(()=>{ refresh(1); }, [userId]);
  useEffect(()=>{ refresh(1); }, [sortBy, sortDir]);

  const money = (n: number, c: string) => `${Number(n).toFixed(2)} ${c}`;

  return (
    <AdminLayout title={`Utilisateur #${userId}`}>
      <div className="p-6 pt-0">
        <Head title={`Utilisateur #${userId}`} />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" onClick={()=> (window.location.href = endpoints.back)} title="Retour aux utilisateurs">
              <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-semibold">Utilisateur #{userId}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={()=>refresh(orders.page)}>Actualiser</Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-4">Chargement…</Card>
        ) : err ? (
          <Card className="p-4 text-red-600">{err}</Card>
        ) : !user ? (
          <Card className="p-4">Utilisateur introuvable.</Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: user info */}
            <Card className="p-4">
              <div className="font-semibold mb-1">Client</div>
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Nom:</span> {user.full_name || user.name}</div>
                <div><span className="text-muted-foreground">E-mail:</span> {user.email}</div>
                <div className="text-xs text-muted-foreground">ID utilisateur: {user.id}</div>
                <div className="text-xs text-muted-foreground">Inscrit: {user.created_at ? new Date(user.created_at).toLocaleString() : "—"}</div>
              </div>
            </Card>

            {/* Right: orders table */}
            <Card className="p-4 lg:col-span-2">
              <div className="flex items-end justify-between gap-3 mb-3">
                <div className="font-semibold">Commandes</div>
                <div className="flex gap-2">
                  <Label>Tri</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px]"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date</SelectItem>
                      <SelectItem value="grand_total">Montant</SelectItem>
                      <SelectItem value="status">Statut</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortDir} onValueChange={setSortDir}>
                    <SelectTrigger className="w-[110px]"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Description</SelectItem>
                      <SelectItem value="asc">Ascension</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">Commande #</TableHead>
                      <TableHead className="w-[170px]">Date</TableHead>
                      <TableHead className="w-[120px]">Statut</TableHead>
                      <TableHead className="w-[90px]">Articles</TableHead>
                      <TableHead className="w-[140px]">Total</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.data.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucune commande</TableCell></TableRow>
                    ) : orders.data.map(o => (
                      <TableRow key={o.id}>
                        <TableCell>#{o.id}</TableCell>
                        <TableCell>{new Date(o.created_at).toLocaleString()}</TableCell>
                        <TableCell><span className="px-2 py-1 rounded bg-muted text-xs">{o.status[0].toUpperCase()+o.status.slice(1)}</span></TableCell>
                        <TableCell>{o.items_count}</TableCell>
                        <TableCell className="font-semibold">{money(o.grand_total, o.currency)}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={()=> (window.location.href = endpoints.viewOrder(o.id))}>
                            Vue
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-muted-foreground">
                  {orders.total ? `${(orders.page - 1) * orders.per_page + 1}-${Math.min(orders.total, orders.page * orders.per_page)} de ${orders.total}` : "0"}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={()=>refresh(Math.max(1, orders.page-1))} disabled={orders.page<=1}><ChevronLeft className="h-4 w-4"/></Button>
                  <div className="text-sm">Page {orders.page} / {Math.max(1, Math.ceil(orders.total / orders.per_page))}</div>
                  <Button variant="outline" size="icon" onClick={()=>refresh(Math.min(Math.max(1, Math.ceil(orders.total / orders.per_page)), orders.page+1))} disabled={orders.page >= Math.max(1, Math.ceil(orders.total / orders.per_page))}><ChevronRight className="h-4 w-4"/></Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
