// resources/js/Pages/admin/ads/creatives-page.tsx
import React from "react";
import { Head } from "@inertiajs/react";
import api from "@/lib/api";
import { AdminLayout } from "../layout/admin-layout";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { fromDateTimeLocalToSql, normalizeDateTime, toDateTimeLocal } from "@/lib/utils";

declare const route: (name: string, params?: any) => string;

// ---- Adjust this list to your allowed placement values ----
type Placement = "hero" | "grid" | "sticky" | "inline" | "generic";
const PLACEMENTS: Placement[] = ["hero", "grid", "sticky", "inline", "generic"];

type Creative = {
  id: number;
  placement: Placement;
  title?: string | null;
  subtitle?: string | null;
  image_path: string;
  image_alt?: string | null;
  target_url?: string | null;
  weight: number;
  status: "active" | "paused";
  starts_at?: string | null;
  ends_at?: string | null;
};

export default function CreativesIndex() {
  const [rows, setRows] = React.useState<Creative[]>([]);
  const [meta, setMeta] = React.useState({ total: 0, current_page: 1, per_page: 15 });
  const [search, setSearch] = React.useState("");
  const [filterPlacement, setFilterPlacement] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Creative | null>(null);
  const [file, setFile] = React.useState<File | null>(null);

  const [form, setForm] = React.useState<Partial<Creative>>({
    placement: "hero",
    title: "",
    subtitle: "",
    image_alt: "",
    target_url: "",
    weight: 1,
    status: "active",
    starts_at: "",
    ends_at: "",
  });

  const fetchRows = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(route("admin.ads.creatives.index"), {
        params: {
          page,
          per_page: meta.per_page,
          search: search || undefined,
          placement: filterPlacement || undefined,
        },
      });

      // Expected backend shape is Laravel paginator
      setRows(data.data);
      setMeta({
        total: data.total,
        current_page: data.current_page,
        per_page: data.per_page,
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRows(1);
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => fetchRows(1), 350);
    return () => clearTimeout(t);
  }, [search, filterPlacement]);

  const startCreate = () => {
    setEditing(null);
    setForm({
      placement: PLACEMENTS[0],
      title: "",
      subtitle: "",
      image_alt: "",
      target_url: "",
      weight: 1,
      status: "active",
      starts_at: "",
      ends_at: "",
    });
    setFile(null);
    setOpen(true);
  };

  const startEdit = (cr: Creative) => {
    setEditing(cr);
    setForm({
      placement: cr.placement,
      title: cr.title ?? "",
      subtitle: cr.subtitle ?? "",
      image_alt: cr.image_alt ?? "",
      target_url: cr.target_url ?? "",
      weight: cr.weight,
      status: cr.status,
      starts_at: toDateTimeLocal(cr.starts_at ?? ""),
      ends_at: toDateTimeLocal(cr.ends_at ?? ""),
    });
    setFile(null);
    setOpen(true);
  };

  const save = async () => {
    try {
      if (!form.placement) { toast("Placement is required."); return; }
      if (!editing && !file) { toast("Image is required for new creatives."); return; }

      const fd = new FormData();
      fd.append("placement", String(form.placement));
      if (file) fd.append("image", file);
      if (form.title) fd.append("title", form.title);
      if (form.subtitle) fd.append("subtitle", form.subtitle);
      if (form.image_alt) fd.append("image_alt", form.image_alt);
      if (form.target_url) fd.append("target_url", form.target_url);
      fd.append("weight", String(form.weight ?? 1));
      fd.append("status", form.status ?? "active");

      const starts = normalizeDateTime(form.starts_at);
      const ends   = normalizeDateTime(form.ends_at);
      if (starts) fd.append("starts_at", starts);
      if (ends)   fd.append("ends_at", ends);

      if (editing) {
        await api.post(route("admin.ads.creatives.update", { id: editing.id }), fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast("Creative updated.");
      } else {
        await api.post(route("admin.ads.creatives.store"), fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast("Creative created.");
      }

      setOpen(false);
      fetchRows(meta.current_page);
    } catch (e: any) {
      toast(e?.response?.data?.message || "Save failed.");
    }
  };


  const remove = async (cr: Creative) => {
    if (!confirm("Delete this creative?")) return;
    await api.delete(route("admin.ads.creatives.destroy", { id: cr.id }));
    toast("Creative deleted.");
    fetchRows(1);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <Head title="Ad Creatives" />
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Ad Creatives</h1>
          <Button onClick={startCreate}>New Creative</Button>
        </div>

        <Card className="p-3 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              placeholder="Search title/subtitle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Label>Placement</Label>
              <Select value={filterPlacement} onValueChange={setFilterPlacement}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {PLACEMENTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => fetchRows(1)}>
              Search
            </Button>
          </div>
        </Card>

        <div className="rounded border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>
                    <div className="w-32 h-14 bg-muted/30 rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          r.image_path?.startsWith("http")
                            ? r.image_path
                            : `/storage/${r.image_path}`
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.placement}</TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="font-medium truncate">{r.title || "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.subtitle || "—"}
                    </div>
                  </TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.weight}</TableCell>
                  <TableCell>{r.starts_at ? new Date(r.starts_at).toLocaleString() : "—"}</TableCell>
                  <TableCell>{r.ends_at ? new Date(r.ends_at).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(r)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    {loading ? "Loading…" : "No results"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {meta.total
              ? `${(meta.current_page - 1) * meta.per_page + 1}-${Math.min(
                meta.total,
                meta.current_page * meta.per_page
              )} of ${meta.total}`
              : "0"}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page <= 1}
              onClick={() => fetchRows(meta.current_page - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page * meta.per_page >= meta.total}
              onClick={() => fetchRows(meta.current_page + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Create/Edit Modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Creative" : "New Creative"}</DialogTitle>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Placement</Label>
                  <Select
                    value={String(form.placement ?? "")}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, placement: v as Placement }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a placement" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLACEMENTS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>Title</Label>
                  <Input
                    value={form.title ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label>Subtitle</Label>
                  <Input
                    value={form.subtitle ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label>Image alt</Label>
                  <Input
                    value={form.image_alt ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, image_alt: e.target.value }))}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label>Target URL</Label>
                  <Input
                    value={form.target_url ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, target_url: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Image {editing ? "(leave empty to keep)" : ""}</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Weight</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={form.weight ?? 1}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, weight: Number(e.target.value) || 1 }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={form.status ?? "active"}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, status: v as "active" | "paused" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">active</SelectItem>
                        <SelectItem value="paused">paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>Starts at</Label>
                    <Input
                      type="datetime-local"
                      value={form.starts_at ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Ends at</Label>
                    <Input
                      type="datetime-local"
                      value={form.ends_at ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
