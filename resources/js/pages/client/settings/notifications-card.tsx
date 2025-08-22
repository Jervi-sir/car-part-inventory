import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";

export function NotificationsCard() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(route("client.notifications.telegram.status"));
      setLinked(data.linked);
      setConnectUrl(data.link);
    } catch (e) {
      console.error("Failed to fetch telegram status", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    try {
      const { data } = await api.post(route("client.notifications.telegram.connect"));
      if (data.link) {
        setConnectUrl(data.link);
        window.open(data.link, "_blank"); // open Telegram deep link
      }
    } catch (e) {
      console.error("Failed to connect", e);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Se déconnecter de Telegram ?")) return;
    try {
      await api.delete(route("client.notifications.telegram.disconnect"));
      setLinked(false);
      setConnectUrl(null);
    } catch (e) {
      console.error("Failed to disconnect", e);
    }
  };

  return (
    <Card>

      <CardContent className="flex flex-col lg:flex-row w-full justify-between gap-4">
        <div>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Recevez les mises à jour de vos commandes directement sur Telegram.</CardDescription>
        </div>
        <div className="flex gap-2 justify-end">
          {linked === null ? (
            <p className="text-sm text-gray-500">Chargement du statut…</p>
          ) : linked ? (
            <div className="flex gap-2">
              <Button
                onClick={handleDisconnect}
                variant={'destructive'}
                disabled={loading}
              >
                Désactiver
              </Button>
            </div>
          ) : (
            <React.Fragment>
              <Button
                onClick={handleConnect}
                disabled={loading}
              >
                Se connecter à Telegram
              </Button>
              {connectUrl && (
                <Button
                  onClick={fetchStatus}
                  variant={'secondary'}
                >
                  <RefreshCwIcon />
                </Button>
              )}
            </React.Fragment>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
