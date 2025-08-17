import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ClientLayout } from "../layout/client-layout";
import api from "@/lib/api";

type User = {
  id: number;
  name: string;
  full_name?: string | null;
  email: string;
  birthdate?: string | null;
};

type Address = {
  id: number;
  label?: string | null;
  recipient_name?: string | null;
  phone?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state?: string | null;
  postal_code?: string | null;
  country: string;
  is_default: boolean;
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Address dialog state
  const [addrDialogOpen, setAddrDialogOpen] = useState(false);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null); // if null => create

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(route("client.settings.api"));
      setUser(data.user);

      // Prefer a single fetch to index
      const { data: addrResp } = await api.get(
        route("client.settings.api.shipping-addresses.crud")
      );
      const list = (addrResp?.data ?? addrResp) as Address[];
      setAddresses(list ?? []);
    } catch (error) {
      console.error("Failed fetching settings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const saveUser = async () => {
    if (!user) return;
    try {
      await api.put(route("client.settings.api"), user);
      // optional: show toast instead of alert
      alert("Profile updated!");
    } catch (err) {
      console.error("Failed updating profile", err);
    }
  };

  const openCreateDialog = () => {
    setEditingAddr(null);
    setAddrDialogOpen(true);
  };

  const openEditDialog = (addr: Address) => {
    setEditingAddr(addr);
    setAddrDialogOpen(true);
  };

  const onDeleteAddress = async (addr: Address) => {
    if (!confirm("Delete this address?")) return;
    try {
      await api.delete(route("client.settings.api.shipping-addresses.crud") + `/${addr.id}`);
      setAddresses((prev) => prev.filter((a) => a.id !== addr.id));
    } catch (e) {
      console.error("Failed deleting address", e);
    }
  };

  const onSavedAddress = (saved: Address) => {
    // merge into list (create vs update)
    setAddresses((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        // if this is default, ensure others flip to false
        if (saved.is_default) {
          return next.map((a) => (a.id === saved.id ? saved : { ...a, is_default: false }));
        }
        return next;
      }
      // New
      const next = [saved, ...prev];
      if (saved.is_default) {
        return next.map((a) => (a.id === saved.id ? saved : { ...a, is_default: false }));
      }
      return next;
    });
  };

  const hasAddresses = useMemo(() => addresses.length > 0, [addresses]);

  return (
    <ClientLayout title="Settings">
      <div className="p-6 pt-0 space-y-4">
        <h1 className="text-2xl font-semibold">User Settings</h1>
        <div className="grid grid-cols-2 items-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Addresses</CardTitle>
              <CardDescription>Manage addresses used for delivery.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

              {!loading && !hasAddresses && (
                <div className="text-sm text-muted-foreground">No addresses yet.</div>
              )}

              {!loading &&
                addresses.map((addr) => (
                  <Card
                    key={addr.id}
                    className={`border ${addr.is_default ? "ring-1 ring-primary/40" : ""}`}
                  >
                    <CardContent >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {addr.label || "Address"}{" "}
                            {addr.is_default && (
                              <span className="ml-2 text-xs rounded bg-primary/10 text-primary px-2 py-0.5">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {addr.recipient_name ? `${addr.recipient_name} • ` : ""}
                            {addr.phone || ""}
                          </div>
                          <div className="text-sm">
                            {addr.address_line1}
                            {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                            , {addr.city}
                            {addr.state ? `, ${addr.state}` : ""}
                            {addr.postal_code ? ` ${addr.postal_code}` : ""} • {addr.country}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(addr)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDeleteAddress(addr)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={openCreateDialog}>Add Address</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your basic profile information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {user && (
                <>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={user.name}
                      onChange={(e) => setUser({ ...user, name: e.target.value })}
                      placeholder="Username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={user.full_name ?? ""}
                      onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                      placeholder="Full Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={user.email}
                      onChange={(e) => setUser({ ...user, email: e.target.value })}
                      placeholder="Email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Birthdate</Label>
                    <Input
                      type="date"
                      value={user.birthdate ?? ""}
                      onChange={(e) => setUser({ ...user, birthdate: e.target.value })}
                    />
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={saveUser} disabled={!user}>
                Save Profile
              </Button>
            </CardFooter>
          </Card>

        </div>

        {/* Create/Edit Dialog */}
        <AddressDialog
          open={addrDialogOpen}
          onOpenChange={setAddrDialogOpen}
          initial={editingAddr}
          onSaved={onSavedAddress}
        />
      </div>
    </ClientLayout>
  );
}

/** -------------------------------------------
 * Address Create/Edit Dialog
 * ------------------------------------------*/
function AddressDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Address | null;
  onSaved: (addr: Address) => void;
}) {
  const isEdit = !!initial;

  const [form, setForm] = useState<Partial<Address>>({
    label: "",
    recipient_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "DZ",
    is_default: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({ ...initial });
    } else {
      setForm({
        label: "",
        recipient_name: "",
        phone: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "DZ",
        is_default: false,
      });
    }
  }, [initial, open]);

  const onChange = (k: keyof Address, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        const { data } = await api.put(
          route("client.settings.api.shipping-addresses.crud") + `/${initial!.id}`,
          payload(form)
        );
        onSaved(data.data);
      } else {
        const { data } = await api.post(
          route("client.settings.api.shipping-addresses.crud"),
          payload(form)
        );
        onSaved(data.data);
      }
      onOpenChange(false);
    } catch (e) {
      console.error("Failed saving address", e);
    } finally {
      setSaving(false);
    }
  };

  const requiredOk = !!form.address_line1 && !!form.city && !!form.country;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Address" : "New Address"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Label</Label>
            <Input
              placeholder="Home, Work..."
              value={form.label ?? ""}
              onChange={(e) => onChange("label", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Recipient Name</Label>
            <Input
              value={form.recipient_name ?? ""}
              onChange={(e) => onChange("recipient_name", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.phone ?? ""} onChange={(e) => onChange("phone", e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Address Line 1</Label>
            <Input
              value={form.address_line1 ?? ""}
              onChange={(e) => onChange("address_line1", e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Address Line 2</Label>
            <Input
              value={form.address_line2 ?? ""}
              onChange={(e) => onChange("address_line2", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>City</Label>
            <Input value={form.city ?? ""} onChange={(e) => onChange("city", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>State</Label>
            <Input value={form.state ?? ""} onChange={(e) => onChange("state", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Postal Code</Label>
            <Input
              value={form.postal_code ?? ""}
              onChange={(e) => onChange("postal_code", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Country</Label>
            <Input
              value={form.country ?? "DZ"}
              maxLength={2}
              onChange={(e) => onChange("country", e.target.value.toUpperCase())}
            />
          </div>

          <div className="flex items-center gap-3 md:col-span-2">
            <Switch
              id="is_default"
              checked={!!form.is_default}
              onCheckedChange={(v) => onChange("is_default", v)}
            />
            <Label htmlFor="is_default">Set as default</Label>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !requiredOk}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function payload(form: Partial<Address>) {
  // Keep only fields your validator accepts
  return {
    label: form.label ?? null,
    recipient_name: form.recipient_name ?? null,
    phone: form.phone ?? null,
    address_line1: form.address_line1 ?? "",
    address_line2: form.address_line2 ?? null,
    city: form.city ?? "",
    state: form.state ?? null,
    postal_code: form.postal_code ?? null,
    country: form.country ?? "DZ",
    is_default: !!form.is_default,
  };
}
