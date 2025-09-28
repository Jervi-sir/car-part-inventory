// resources/js/pages/admin/users.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head } from "@inertiajs/react";
import { AdminLayout } from "../layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";

declare const route: (name: string, params?: any) => string;

type Id = number | string;

type UserRow = {
  id: number;
  name: string;
  full_name?: string | null;
  email: string;
  orders_count: number;
  created_at: string;
};

type Page<T> = { data: T[]; total: number; page: number; per_page: number };

const endpoints = {
  list: route("admin.api.users.index"),
  view: (id: Id) => route("admin.user.page", { user: id }),
};

const sortOptions = [
  { value: "created_at", label: "Inscrit" },
  { value: "name", label: "Nom" },
  { value: "orders_count", label: "Commandes" },
] as const;

export default function UsersPage() {
  const [filters, setFilters] = useState({ q: "", sort_by: "created_at", sort_dir: "desc" });
  const [pageData, setPageData] = useState<Page<UserRow>>({ data: [], total: 0, page: 1, per_page: 12 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reqRef = useRef(0);

  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);

  const refresh = async (page = 1) => {
    const my = ++reqRef.current;
    setLoading(true); setErr(null);
    try {
      const { data } = await api.get(endpoints.list, {
        params: {
          page,
          per_page: pageData.per_page,
          q: filters.q,
          sort_by: filters.sort_by,
          sort_dir: filters.sort_dir,
        }
      });
      if (my !== reqRef.current) return;
      setPageData(data as Page<UserRow>);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load users.");
    } finally {
      if (my === reqRef.current) setLoading(false);
    }
  };

  useEffect(() => { refresh(1); }, []);
  useEffect(() => { refresh(1); }, [filters.q, filters.sort_by, filters.sort_dir]);

  return (
    <AdminLayout title="Users">
      <div className="p-6 pt-0">
        <Head title="Users" />
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Utilisateurs</h1>
        </div>

        <Card className="p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-[260px] space-y-2">
              <Label>Recherche</Label>
              <Input placeholder="Name, email, ID…" value={filters.q} onChange={(e)=>setFilters({...filters, q:e.target.value})} />
            </div>
            <div className="w-[240px] space-y-2">
              <Label>Trier</Label>
              <div className="flex gap-2">
                <Select value={filters.sort_by} onValueChange={(v)=>setFilters({...filters, sort_by:v})}>
                  <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.sort_dir} onValueChange={(v)=>setFilters({...filters, sort_dir:v})}>
                  <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Desc</SelectItem>
                    <SelectItem value="asc">Ascendant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" onClick={()=>refresh(1)} disabled={loading}>{loading ? "Loading…" : "Apply"}</Button>
            <Button variant="ghost" onClick={()=>setFilters({ q:"", sort_by:"created_at", sort_dir:"desc" })}>Effacer</Button>
          </div>
          {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
        </Card>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Utilisateur #</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="w-[120px]">Commandes</TableHead>
                <TableHead className="w-[180px]">Inscrit</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{loading ? "Chargement…" : "Aucun utilisateur trouvé"}</TableCell></TableRow>
              ) : pageData.data.map(u => (
                <TableRow key={u.id}>
                  <TableCell>#{u.id}</TableCell>
                  <TableCell className="font-medium">{u.full_name || u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.orders_count}</TableCell>
                  <TableCell>{new Date(u.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={()=> (window.location.href = endpoints.view(u.id))}>Aperçu</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {pageData.total ? `${(pageData.page - 1) * pageData.per_page + 1}-${Math.min(pageData.total, pageData.page * pageData.per_page)} de ${pageData.total}` : "0"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={()=>refresh(Math.max(1, pageData.page - 1))} disabled={pageData.page<=1}><ChevronLeft className="h-4 w-4"/></Button>
            <div className="text-sm">Page {pageData.page} / {Math.max(1, Math.ceil(pageData.total / pageData.per_page))}</div>
            <Button variant="outline" size="icon" onClick={()=>refresh(Math.min(Math.max(1, Math.ceil(pageData.total / pageData.per_page)), pageData.page + 1))} disabled={pageData.page >= Math.max(1, Math.ceil(pageData.total / pageData.per_page))}><ChevronRight className="h-4 w-4"/></Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
