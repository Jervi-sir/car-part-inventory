import { useEffect, useState } from "react";
import { Address } from "./types";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function AddressDialog({
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
          <DialogTitle>{isEdit ? "Modifier l'adresse" : "Nouvelle adresse"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Libellé</Label>
            <Input
              placeholder="Domicile, Travail..."
              value={form.label ?? ""}
              onChange={(e) => onChange("label", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Nom du destinataire</Label>
            <Input
              value={form.recipient_name ?? ""}
              onChange={(e) => onChange("recipient_name", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Téléphone</Label>
            <Input value={form.phone ?? ""} onChange={(e) => onChange("phone", e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Ligne d'adresse 1</Label>
            <Input
              value={form.address_line1 ?? ""}
              onChange={(e) => onChange("address_line1", e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Ligne d'adresse 2</Label>
            <Input
              value={form.address_line2 ?? ""}
              onChange={(e) => onChange("address_line2", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Ville</Label>
            <Input value={form.city ?? ""} onChange={(e) => onChange("city", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>État/Province</Label>
            <Input value={form.state ?? ""} onChange={(e) => onChange("state", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Code postal</Label>
            <Input
              value={form.postal_code ?? ""}
              onChange={(e) => onChange("postal_code", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Pays</Label>
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
            <Label htmlFor="is_default">Définir par défaut</Label>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving || !requiredOk}>
            {saving ? "Enregistrement..." : "Enregistrer"}
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
