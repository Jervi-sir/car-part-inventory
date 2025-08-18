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
import { Appearance, useAppearance } from "@/hooks/use-appearance";
import { LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddressDialog } from "./address-dialog";
import { ShippingAddressesCard } from "./shipping-addresses-card";
import { AppearanceCard } from "./appearance-card";
import { Address, User } from "./types";
import { ProfileCard } from "./profile-card";


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
          <ShippingAddressesCard
            addresses={addresses}
            hasAddresses={hasAddresses}
            loading={loading}
            onDeleteAddress={onDeleteAddress}
            openCreateDialog={openCreateDialog}
            openEditDialog={openEditDialog}
          />
          <ProfileCard 
            user={user} 
            setUser={setUser} 
            saveUser={saveUser} 
          />
          <div></div>
          <AppearanceCard />
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
