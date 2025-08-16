import { useState } from 'react'
import { router } from '@inertiajs/react'

type Tier = { id: number; code: string; label: string }

export default function PartsImport({ priceTiers }: { priceTiers: Tier[] }) {
  const [file, setFile] = useState<File | null>(null)
  const [delimiter, setDelimiter] = useState<string>('auto')
  const [tierId, setTierId] = useState<number>(priceTiers?.[0]?.id ?? 1)
  const [dryRun, setDryRun] = useState<boolean>(true)
  const [preview, setPreview] = useState<any | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const upload = async (url: string, body: FormData) => {
    const csrf =
      (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

    const resp = await fetch(url, {
      method: 'POST',
      body,
      credentials: 'same-origin', // <-- send session cookies
      headers: {
        'X-CSRF-TOKEN': csrf,        // <-- CSRF token from meta
        'X-Requested-With': 'XMLHttpRequest',
        // DO NOT set Content-Type; let the browser set multipart/form-data boundary
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text);
    }
    return resp.json();
  };

  const onPreview = async () => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    if (delimiter !== 'auto') fd.append('delimiter', delimiter)
    const res = await upload(route('imports.parts.preview'), fd)
    setPreview(res)
    setMapping(res.mapping || {})
  }

  const onRun = async () => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    if (delimiter !== 'auto') fd.append('delimiter', delimiter)
    fd.append('price_tier_id', String(tierId))
    fd.append('dryRun', String(dryRun ? 1 : 0))
    fd.append('mapping', JSON.stringify(mapping)); // plain string field
    const res = await upload(route('imports.parts.run'), fd)
    alert((res.ok ? 'OK' : 'ERROR') + '\n' + JSON.stringify(res.stats, null, 2))
  }

  const targets = [
    ['', '(ignore)'],
    ['reference', 'Reference'],
    ['name', 'Name / Designation'],
    ['price', 'Price'],
    ['vehicle_brand', 'Vehicle Brand'],
    ['vehicle_model', 'Vehicle Model / Affectation'],
    ['manufacturer', 'Manufacturer'],
    ['category', 'Category'],
    ['sku', 'SKU'],
  ]

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Import Parts (CSV)</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium">CSV File</label>
          <input type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Delimiter</label>
          <select className="border rounded px-2 py-1 w-full" value={delimiter} onChange={e => setDelimiter(e.target.value)}>
            <option value="auto">Auto</option>
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
            <option value="\t">Tab</option>
            <option value="|">Pipe (|)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Price Tier</label>
          <select className="border rounded px-2 py-1 w-full" value={tierId} onChange={e => setTierId(Number(e.target.value))}>
            {priceTiers.map(t => <option key={t.id} value={t.id}>{t.code} — {t.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input id="dry" type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
          <label htmlFor="dry">Dry run (no DB writes)</label>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onPreview} className="bg-gray-800 text-white px-4 py-2 rounded">Preview</button>
        <button onClick={onRun} className="bg-green-600 text-white px-4 py-2 rounded">Import</button>
      </div>

      {preview && (
        <div className="space-y-4">
          <div className="text-sm text-gray-700">Detected delimiter: <b>{preview.detectedDelimiter}</b></div>

          <div>
            <h2 className="font-medium mb-2">Column Mapping</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="">
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">Header</th>
                    <th className="p-2 border">Normalized</th>
                    <th className="p-2 border">Map To</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.headers.map((h: string, i: number) => (
                    <tr key={i}>
                      <td className="p-2 border">{i}</td>
                      <td className="p-2 border">{h}</td>
                      <td className="p-2 border text-gray-500">{preview.normalizedHeaders[i]}</td>
                      <td className="p-2 border">
                        <select
                          className="border rounded px-2 py-1"
                          value={mapping[i] ?? ''}
                          onChange={e => setMapping({ ...mapping, [i]: e.target.value })}
                        >
                          {targets.map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="font-medium mb-2">Preview (first 50 rows)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border">
                <thead>
                  <tr>
                    {preview.headers.map((h: string, i: number) => <th key={i} className="p-2 border">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((r: string[], idx: number) => (
                    <tr key={idx}>
                      {r.map((c: string, j: number) => <td key={j} className="p-2 border">{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
