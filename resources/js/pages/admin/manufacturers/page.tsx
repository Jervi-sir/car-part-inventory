import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Pencil, Trash, Plus } from "lucide-react";
import { AdminLayout } from "../layout/admin-layout";
import { Head } from "@inertiajs/react";
import api from "@/lib/api";

type Id2 = number | string;
interface Manufacturer { id: Id2; name: string; created_at?: string; updated_at?: string }
interface Page2<T> { data: T[]; total: number; page: number; per_page: number }

const endpoint2 = route('admin.manufacturers.api.crud');

export default function ManufacturersPage() {
  const [pageData, setPageData] = useState<Page2<Manufacturer>>({ data: [], total: 0, page: 1, per_page: 10 });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [initialName, setInitialName] = useState<string>("");
  const [editingId, setEditingId] = useState<Id2 | null>(null);

  const maxPage = useMemo(() => Math.max(1, Math.ceil(pageData.total / pageData.per_page)), [pageData]);

  const fetchData = async (page = 1) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(pageData.per_page), search });
    const { data: json } = await api.get<Page2<Manufacturer> | Manufacturer[]>(endpoint2, { params });
    const normalized: Page2<Manufacturer> = Array.isArray(json) ? { data: json, page, per_page: 10, total: json.length } : json;
    setPageData(normalized);
  };

  useEffect(() => { fetchData(1); }, [search]);

  const openCreate = () => { setEditingId(null); setInitialName(""); setOpen(true); };
  const openEdit = (row: Manufacturer) => { setEditingId(row.id); setInitialName(row.name); setOpen(true); };

  const save = async (name: string) => {
    const payload = { name };
    if (editingId == null) {
      await api.post(endpoint2, payload);
    } else {
      await api.put(`${endpoint2}/${editingId}`, payload);
    }
    setOpen(false);
    await fetchData(pageData.page);
  };

  const remove = async (row: Manufacturer) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    await api.delete(`${endpoint2}/${row.id}`);
    await fetchData(pageData.page);
  };

  return (
    <AdminLayout>
      <Head title="Manufacturers" />
      <div className="p-6 space-y-4">
        <div className="text-2xl font-semibold">Manufacturers</div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <div className="flex-1" />
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />New Manufacturer</Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.data.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No data</TableCell></TableRow>
              )}
              {pageData.data.map((row) => (
                <TableRow key={String(row.id)}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" onClick={() => remove(row)}><Trash className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {pageData.total ? `${(pageData.page - 1) * pageData.per_page + 1}-${Math.min(pageData.total, pageData.page * pageData.per_page)} of ${pageData.total}` : "0"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchData(Math.max(1, pageData.page - 1))} disabled={pageData.page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-sm">Page {pageData.page} / {maxPage}</div>
            <Button variant="outline" size="icon" onClick={() => fetchData(Math.min(maxPage, pageData.page + 1))} disabled={pageData.page >= maxPage}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <NameDialog open={open} onOpenChange={setOpen} title={editingId == null ? "New Manufacturer" : "Edit Manufacturer"} initialName={initialName} onSave={save} />
      </div>
    </AdminLayout>
  );
}

function NameDialog({ open, onOpenChange, title, initialName, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; initialName: string; onSave: (name: string) => void | Promise<void> }) {
  const [name, setName] = useState(initialName);
  useEffect(() => setName(initialName), [initialName]);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => { if (!name.trim()) return; setSubmitting(true); await onSave(name.trim()); setSubmitting(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-2"><label className="text-sm">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bosch" /></div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
