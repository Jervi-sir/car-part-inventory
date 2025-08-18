import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api from "@/lib/api";

// Small helper: derive a browser preview URL for a File
function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

type FieldKey = "id_card_url" | "commercial_register_url";

// @ts-ignore
export const DocumentsCard = ({ user, setUser, saveUser }) => {
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [crFile, setCrFile] = useState<File | null>(null);

  // local previews for newly selected files
  const idCardLocal = useObjectUrl(idCardFile);
  const crLocal = useObjectUrl(crFile);

  // which image to show in fullscreen
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

  const idCardPreview = useMemo(
    () => idCardLocal ?? user?.id_card_url ?? null,
    [idCardLocal, user?.id_card_url]
  );
  const crPreview = useMemo(
    () => crLocal ?? user?.commercial_register_url ?? null,
    [crLocal, user?.commercial_register_url]
  );

  const openLightbox = (src: string, title: string) => {
    setLightboxSrc(src);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  const uploadFile = async (file: File, field: FieldKey) => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post(route("client.settings.api.upload"), formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    // assume API returns { url: "..." }
    setUser({ ...user, [field]: data.url });

    // clear local file so preview points to remote URL now
    if (field === "id_card_url") setIdCardFile(null);
    if (field === "commercial_register_url") setCrFile(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Verification Documents</CardTitle>
          <CardDescription>Upload your ID card and commercial register.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6 sm:grid-cols-2">
          {user && (
            <>
              {/* ID Card */}
              <div className="space-y-3">
                <Label>ID Card</Label>

                {/* Preview box */}
                <div
                  className="relative w-full h-40 rounded-md border bg-muted/20 flex items-center justify-center overflow-hidden"
                >
                  {idCardPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={idCardPreview}
                      alt="ID Card Preview"
                      className="h-full w-full object-cover cursor-zoom-in"
                      onClick={() => openLightbox(idCardPreview, "ID Card")}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">No image selected</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIdCardFile(e.target.files?.[0] ?? null)}
                  />
                  {idCardFile && (
                    <Button
                      variant="secondary"
                      onClick={() => uploadFile(idCardFile, "id_card_url")}
                    >
                      Upload
                    </Button>
                  )}
                </div>

                {user.id_card_url && (
                  <Button
                    type="button"
                    variant="link"
                    className="px-0"
                    onClick={() => openLightbox(user.id_card_url!, "ID Card")}
                  >
                    View current
                  </Button>
                )}
              </div>

              {/* Commercial Register */}
              <div className="space-y-3">
                <Label>Commercial Register</Label>

                {/* Preview box */}
                <div
                  className="relative w-full h-40 rounded-md border bg-muted/20 flex items-center justify-center overflow-hidden"
                >
                  {crPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={crPreview}
                      alt="Commercial Register Preview"
                      className="h-full w-full object-cover cursor-zoom-in"
                      onClick={() => openLightbox(crPreview, "Commercial Register")}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">No image selected</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCrFile(e.target.files?.[0] ?? null)}
                  />
                  {crFile && (
                    <Button
                      variant="secondary"
                      onClick={() => uploadFile(crFile, "commercial_register_url")}
                    >
                      Upload
                    </Button>
                  )}
                </div>

                {user.commercial_register_url && (
                  <Button
                    type="button"
                    variant="link"
                    className="px-0"
                    onClick={() =>
                      openLightbox(user.commercial_register_url!, "Commercial Register")
                    }
                  >
                    View current
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="justify-end">
          <Button onClick={saveUser} disabled={!user}>
            Save Documents
          </Button>
        </CardFooter>
      </Card>

      {/* Fullscreen Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[96vw] sm:max-w-[90vw] p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{lightboxTitle}</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            <div className="w-full max-h-[80vh] overflow-auto rounded-md border">
              {/* Use img (not Next Image) to avoid layout restrictions; object-contain keeps full image visible */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxSrc ?? ""}
                alt={lightboxTitle}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
