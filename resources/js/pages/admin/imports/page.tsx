import { useEffect, useState } from "react";
import { Head, useForm, usePage } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AdminLayout } from "../layout/admin-layout";
import ImportPartsController from "@/actions/App/Http/Controllers/Admin/ImportPartsController";

declare const route: (name: string, params?: any) => string;
type OptionItem = { id: number; name: string };

const TARGET_FIELDS = [
  { v: "", label: "— Ignore —" },
  // identifiers
  { v: "sku", label: "UGS" },
  { v: "reference", label: "Référence" },
  { v: "barcode", label: "Code-barres (EAN/UPC)" },
  // name/desc
  { v: "name", label: "Nom / Désignation" },
  { v: "description", label: "Description" },
  // manufacturer
  { v: "manufacturer", label: "Fabricant" },
  // pricing TTC + TVA
  { v: "price_retail_ttc", label: "Prix de vente TTC" },
  { v: "price_wholesale_ttc", label: "Prix de gros TTC" },
  { v: "tva_rate", label: "TVA %" },
  // stock (global)
  { v: "stock_real", label: "Stock réel" },
  { v: "stock_available", label: "Stock disponible" },
  // fitment
  { v: "vehicle_brand", label: "Marque du véhicule" },
  { v: "vehicle_model", label: "Modèle du véhicule" },
  { v: "year_from", label: "Année de fabrication" },
  { v: "year_to", label: "Année de fabrication" },
  { v: "engine_code", label: "Code moteur" },
];

export default function ImportParts() {
  const { props }: any = usePage();
  const guessMap = props.guessMap || {};
  const manufacturers = props.manufacturers || [];

  const flashParsed = props.flash?.parsed;
  const flashResult = props.flash?.result;

  // 1) Upload form
  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<string>("");
  const [hasHeader, setHasHeader] = useState<boolean>(true);

  const uploadForm = useForm({
    file: null as any,
    delimiter: "",
    has_header: true,
  });

  const onParse = () => {
    if (!file) return;
    uploadForm.data.file = file;
    uploadForm.data.delimiter = delimiter;
    // @ts-ignore
    uploadForm.data.has_header = hasHeader;
    uploadForm.post(ImportPartsController.parse().url, { forceFormData: true });
  };

  // 2) Mapping state
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const parsed = flashParsed || null;

  useEffect(() => {
    if (parsed?.autoMap) setMapping(parsed.autoMap);
    else setMapping({});
  }, [parsed?.autoMap]);

  const headers: string[] = parsed?.headers || [];
  const rows: string[][] = parsed?.rows || [];

  const changeMap = (idx: number, value: string) => {
    setMapping((m) => ({ ...m, [idx]: value || "" }));
  };

  // 3) Commit form (schema-aligned options)
  const commitForm = useForm({
    uploaded: parsed
      ? {
          headers: parsed.headers,
          rows: parsed.rows,
          delimiter: parsed.delimiter,
          hasHeader: parsed.hasHeader,
        }
      : null,
    mapping: mapping,
    options: {
      default_manufacturer: "",
      tva_rate_default: "", // optional fallback (e.g. 19.00)
    },
  });

  useEffect(() => {
    if (parsed) {
      commitForm.setData("uploaded", {
        headers: parsed.headers,
        rows: parsed.rows,
        delimiter: parsed.delimiter,
        hasHeader: parsed.hasHeader,
      });
      commitForm.setData("mapping", mapping);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, mapping]);

  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>("");
  useEffect(() => {
    if (commitForm?.data?.options?.default_manufacturer && manufacturers.length) {
      const match = manufacturers.find((m: OptionItem) => m.name === commitForm.data.options.default_manufacturer);
      if (match) setSelectedManufacturerId(String(match.id));
    }
  }, [manufacturers]);

  const onCommit = () => {
    commitForm.post(ImportPartsController.commit().url);
  };

  return (
    <AdminLayout>
      <Head title="Import Parts CSV" />
      <div className="p-6 pt-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Importer un fichier CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fichier CSV</Label>
                <Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-2">
                <Label>Délimiteur</Label>
                <Select value={delimiter} onValueChange={setDelimiter}>
                  <SelectTrigger><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Détection automatique</SelectItem>
                    <SelectItem value=",">Virgule (,)</SelectItem>
                    <SelectItem value=";">Point-virgule (;)</SelectItem>
                    <SelectItem value="\t">Tabulation</SelectItem>
                    <SelectItem value="|">Tuyau (|)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label className="block">A une ligne d'en-tête</Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={hasHeader} onCheckedChange={setHasHeader} />
                    <span className="text-sm">{hasHeader ? 'Oui' : 'Non'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={onParse} disabled={!file || uploadForm.processing}>Analyse et aperçu</Button>
            </div>

            {uploadForm.errors.file && <p className="text-red-600 text-sm">{uploadForm.errors.file}</p>}
          </CardContent>
        </Card>

        {parsed && (
          <Card>
            <CardHeader>
              <CardTitle>Aperçu et mappage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="min-w-[220px]">
                          <div className="space-y-2">
                            <div className="font-medium">{h}</div>
                            <Select value={mapping[i] ?? ""} onValueChange={(v) => changeMap(i, v)}>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Map to…" />
                              </SelectTrigger>
                              <SelectContent>
                                {TARGET_FIELDS.map(f => (
                                  <SelectItem key={f.v} value={f.v}>{f.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="text-[11px] text-muted-foreground">Détecté : {parsed.normalizedHeaders?.[i]}</div>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 10).map((r, ri) => (
                      <TableRow key={ri}>
                        {headers.map((_, ci) => (
                          <TableCell key={ci} className="text-sm">{r[ci] ?? ''}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Fabricant par défaut (si manquant)</Label>
                  <Select
                    value={selectedManufacturerId}
                    onValueChange={(v) => {
                      setSelectedManufacturerId(v);
                      const name = v ? (manufacturers.find((m: OptionItem) => String(m.id) === v)?.name ?? "") : "";
                      commitForm.setData("options", { ...commitForm.data.options, default_manufacturer: name });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="— none —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Aucun —</SelectItem>
                      {manufacturers.map((m: OptionItem) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    Enverra : {commitForm.data.options.default_manufacturer || "— none —"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>% TVA par défaut (si colonne manquante)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 19.00"
                    value={commitForm.data.options.tva_rate_default}
                    onChange={(e) =>
                      commitForm.setData('options', { ...commitForm.data.options, tva_rate_default: e.target.value })
                    }
                  />
                  <div className="text-xs text-muted-foreground">
                    Utilisé uniquement si le fichier CSV ne contient pas de colonne TVA.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={onCommit} disabled={commitForm.processing}>
                  Valider l'importation
                </Button>
              </div>

              {commitForm.errors && Object.keys(commitForm.errors).length > 0 && (
                <div className="text-red-600 text-sm">
                  {Object.values(commitForm.errors).map((e: any, i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {flashResult && (
          <Card>
            <CardHeader><CardTitle>Résultat de l'importation</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <div>Créé: <b>{flashResult.created}</b></div>
                <div>Mis à jour: <b>{flashResult.updated}</b></div>
              </div>
              {flashResult.errors?.length > 0 && (
                <div className="text-sm">
                  <div className="font-semibold mb-1">Erreurs ({flashResult.errors.length}):</div>
                  <div className="max-h-60 overflow-auto border rounded p-2">
                    {flashResult.errors.map((er: any, i: number) => (
                      <div key={i} className="mb-1">
                        Ligne {er.row}: {er.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
