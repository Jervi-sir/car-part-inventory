import { useEffect, useMemo, useRef, useState } from "react";
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

declare const route: (name: string, params?: any) => string;
type OptionItem = { id: number; name: string };

const TARGET_FIELDS = [
  { v: "", label: "— Ignore —" },
  { v: "sku", label: "SKU / Référence" },
  { v: "oem_reference", label: "OEM Reference" },
  { v: "name", label: "Name / Désignation" },
  { v: "qty", label: "Quantity" },
  { v: "stock_qty", label: "Stock Qty" },
  { v: "price_retail", label: "Price (Retail / PU Vente)" },
  { v: "price_demi_gros", label: "Price (Demi-Gros)" },
  { v: "price_gros", label: "Price (Gros TTC)" },
  { v: "category", label: "Category" },
  { v: "manufacturer", label: "Manufacturer" },
  { v: "vehicle_brand", label: "Vehicle Brand / Marque" },
  { v: "vehicle_model", label: "Vehicle Model / Affectation" },
  { v: "year_from", label: "Year From" },
  { v: "year_to", label: "Year To" },
  { v: "engine_code", label: "Engine Code" },
  { v: "reference_type", label: "Reference Type (OEM/AFTERMARKET/...)" },
  { v: "source_brand", label: "Reference Source Brand" },
  { v: "warehouse", label: "Warehouse (name or id)" },
];

export default function ImportParts() {
  const { props }: any = usePage();
  const guessMap = props.guessMap || {};
  const warehouses = props.warehouses || [];

  const flashParsed = props.flash?.parsed;
  const flashResult = props.flash?.result;

  // 1) Upload form
  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<string>("");
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [catOptions, setCatOptions] = useState<OptionItem[]>([]);
  const [manOptions, setManOptions] = useState<OptionItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>("");

  // fetch on mount
  useEffect(() => {
    (async () => {
      try {
        const [catsRes, mansRes] = await Promise.all([
          fetch(route("lookup.api.categories")),
          fetch(route("lookup.api.manufacturers")),
        ]);
        const catsJson = await catsRes.json();
        const mansJson = await mansRes.json();
        setCatOptions(catsJson?.data ?? []);
        setManOptions(mansJson?.data ?? []);
      } catch (e) {
        console.error("Lookup fetch failed:", e);
      }
    })();
  }, []);

  // if page reloads with existing defaults (names), preselect matching ids
  useEffect(() => {
    if (commitForm?.data?.options?.default_category && catOptions.length) {
      const match = catOptions.find(c => c.name === commitForm.data.options.default_category);
      if (match) setSelectedCategoryId(String(match.id));
    }
  }, [catOptions]);

  useEffect(() => {
    if (commitForm?.data?.options?.default_manufacturer && manOptions.length) {
      const match = manOptions.find(m => m.name === commitForm.data.options.default_manufacturer);
      if (match) setSelectedManufacturerId(String(match.id));
    }
  }, [manOptions]);

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
    uploadForm.post(route("admin.import.parts.parse"), { forceFormData: true });
  };

  // 2) Mapping state
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const parsed = flashParsed || null;

  useEffect(() => {
    if (parsed?.autoMap) {
      setMapping(parsed.autoMap);
    } else {
      setMapping({});
    }
  }, [parsed?.autoMap]);

  const headers: string[] = parsed?.headers || [];
  const rows: string[][] = parsed?.rows || [];

  const changeMap = (idx: number, value: string) => {
    setMapping((m) => ({ ...m, [idx]: value || "" }));
  };

  // 3) Commit form
  const commitForm = useForm({
    uploaded: parsed ? {
      headers: parsed.headers,
      rows: parsed.rows,
      delimiter: parsed.delimiter,
      hasHeader: parsed.hasHeader,
    } : null,
    mapping: mapping,
    options: {
      default_category: "",
      default_manufacturer: "",
      reference_type: "OTHER",
      default_warehouse_id: "",
      create_missing_vehicle: true,
    }
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

  const onCommit = () => {
    commitForm.post(route("admin.import.parts.commit"));
  };

  return (
    <AdminLayout>
      <Head title="Import Parts CSV" />
      <div className="p-6 pt-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CSV File</Label>
                <Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-2">
                <Label>Delimiter</Label>
                <Select value={delimiter} onValueChange={setDelimiter}>
                  <SelectTrigger><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                  <SelectContent>
                    {/* empty string means auto-detect */}
                    <SelectItem value="">Auto-detect</SelectItem>
                    <SelectItem value=",">Comma (,)</SelectItem>
                    <SelectItem value=";">Semicolon (;)</SelectItem>
                    <SelectItem value="\t">Tab</SelectItem>
                    <SelectItem value="|">Pipe (|)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label className="block">Has Header Row</Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={hasHeader} onCheckedChange={setHasHeader} />
                    <span className="text-sm">{hasHeader ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={onParse} disabled={!file || uploadForm.processing}>Parse & Preview</Button>
            </div>

            {uploadForm.errors.file && <p className="text-red-600 text-sm">{uploadForm.errors.file}</p>}
          </CardContent>
        </Card>

        {parsed && (
          <Card>
            <CardHeader>
              <CardTitle>Preview & Mapping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="min-w-[220px]">
                          <div className="space-y-2">
                            {/* <div className="text-xs text-muted-foreground">CSV Header</div> */}
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
                            <div className="text-[11px] text-muted-foreground">Detected: {parsed.normalizedHeaders?.[i]}</div>
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
                  <Label>Default Category (if missing)</Label>
                  <Select
                    value={selectedCategoryId}
                    onValueChange={(v) => {
                      setSelectedCategoryId(v);
                      const name = v ? (catOptions.find(c => String(c.id) === v)?.name ?? "") : "";
                      commitForm.setData("options", { ...commitForm.data.options, default_category: name });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="— none —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— none —</SelectItem>
                      {catOptions.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Optional tiny helper showing what will be sent */}
                  <div className="text-xs text-muted-foreground">
                    Will send: {commitForm.data.options.default_category || "— none —"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Default Manufacturer (if missing)</Label>
                  <Select
                    value={selectedManufacturerId}
                    onValueChange={(v) => {
                      setSelectedManufacturerId(v);
                      const name = v ? (manOptions.find(m => String(m.id) === v)?.name ?? "") : "";
                      commitForm.setData("options", { ...commitForm.data.options, default_manufacturer: name });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="— none —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— none —</SelectItem>
                      {manOptions.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    Will send: {commitForm.data.options.default_manufacturer || "— none —"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reference Type</Label>
                  <Select
                    value={commitForm.data.options.reference_type}
                    onValueChange={(v) => commitForm.setData('options', { ...commitForm.data.options, reference_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OTHER">OTHER</SelectItem>
                      <SelectItem value="OEM">OEM</SelectItem>
                      <SelectItem value="AFTERMARKET">AFTERMARKET</SelectItem>
                      <SelectItem value="SUPPLIER">SUPPLIER</SelectItem>
                      <SelectItem value="EAN_UPC">EAN_UPC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Warehouse</Label>
                  <Select
                    value={String(commitForm.data.options.default_warehouse_id || '')}
                    onValueChange={(v) =>
                      commitForm.setData('options', { ...commitForm.data.options, default_warehouse_id: v ? Number(v) : '' })
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="— none —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— none —</SelectItem> {/* was "Auto" */}
                      {warehouses.map((w: any) => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                </div>
                <div className="flex items-end gap-2">
                  <div className="space-y-2">
                    <Label className="block">Create missing vehicle brands/models</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!commitForm.data.options.create_missing_vehicle}
                        onCheckedChange={(val) => commitForm.setData('options', { ...commitForm.data.options, create_missing_vehicle: val })}
                      />
                      <span className="text-sm">{commitForm.data.options.create_missing_vehicle ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={onCommit} disabled={commitForm.processing}>
                  Commit Import
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
            <CardHeader><CardTitle>Import Result</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <div>Created: <b>{flashResult.created}</b></div>
                <div>Updated: <b>{flashResult.updated}</b></div>
              </div>
              {flashResult.errors?.length > 0 && (
                <div className="text-sm">
                  <div className="font-semibold mb-1">Errors ({flashResult.errors.length}):</div>
                  <div className="max-h-60 overflow-auto border rounded p-2">
                    {flashResult.errors.map((er: any, i: number) => (
                      <div key={i} className="mb-1">
                        Row {er.row}: {er.message}
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
