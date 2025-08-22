import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Address } from "./types"


// @ts-ignore
export const ShippingAddressesCard = ({ loading, hasAddresses, addresses, openEditDialog, onDeleteAddress, openCreateDialog }) => {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Adresses de livraison</CardTitle>
          <CardDescription>Gérer les adresses utilisées pour la livraison.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Chargement…</div>}

          {!loading && !hasAddresses && (
            <div className="text-sm text-muted-foreground">Aucune adresse pour le moment.</div>
          )}

          {!loading &&
            addresses.map((addr: Address) => (
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
                            Par défaut
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
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeleteAddress(addr)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={openCreateDialog}>Ajouter une adresse</Button>
        </CardFooter>
      </Card>
    </>
  )
}