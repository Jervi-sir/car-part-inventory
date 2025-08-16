<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\{Category, Manufacturer, Part, PartReference, PartReferenceType, PartPrice, PriceTier, VehicleBrand, VehicleModel};
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PartImportController extends Controller
{
    public function create()
    {
        return Inertia::render('admin/imports/page', [
            'priceTiers' => PriceTier::orderBy('id')->get(['id', 'code', 'label']),
        ]);
    }

    public function preview(Request $req)
    {
        $data = $this->readCsv($req);
        [$rows, $headers] = $data;

        // Try to normalize headers to predictable keys
        $norm = array_map(fn($h) => $this->normHeader($h), $headers);

        // Guess mapping for known keys in both samples
        $mapping = $this->guessMapping($norm);

        // Show first 50 rows for preview
        $sample = array_slice($rows, 0, 50);

        return response()->json([
            'headers' => $headers,
            'normalizedHeaders' => $norm,
            'mapping' => $mapping,
            'sample' => $sample,
            'detectedDelimiter' => $req->input('delimiter') ?? $this->detectDelimiterSample($req),
        ]);
    }

    public function run(Request $req)
    {
        $validated = $req->validate([
            'price_tier_id' => ['required', 'exists:price_tiers,id'],
            'dryRun' => ['boolean'],
            'mapping' => ['nullable'],
        ]);

        $dry   = (bool)($validated['dryRun'] ?? false);
        $tierId = (int)$validated['price_tier_id'];
        // mapping could be a JSON string or null
        $mapping = [];
        if ($req->filled('mapping')) {
            $raw = $req->input('mapping');
            if (is_array($raw)) {
                $mapping = $raw;
            } else {
                $decoded = json_decode($raw, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $mapping = $decoded;
                }
            }
        }

        [$rows, $headers] = $this->readCsv($req);
        $norm = array_map(fn($h) => $this->normHeader($h), $headers);
        if (empty($mapping)) $mapping = $this->guessMapping($norm);

        // Ensure reference type OEM exists
        $oemType = PartReferenceType::firstOrCreate(['code' => 'OEM'], ['label' => 'OEM']);

        $stats = [
            'parts_created' => 0,
            'parts_updated' => 0,
            'manufacturers_created' => 0,
            'brands_created' => 0,
            'models_created' => 0,
            'references_created' => 0,
            'prices_created' => 0,
            'skipped' => 0,
            'errors' => 0,
            'messages' => [],
        ];

        DB::beginTransaction();
        try {
            foreach ($rows as $i => $row) {
                $row = $this->trimRow($row);
                if ($this->isEmptyRow($row)) {
                    $stats['skipped']++;
                    continue;
                }

                // Extract using mapping
                $val = fn($key) => $this->getMapped($row, $mapping, $norm, $key);

                $reference = $val('reference');        // Référence
                $designation = $val('name');           // Désignation -> parts.name
                $priceStr = $val('price');             // Pu Vente or Gros TTC
                $brandName = $val('vehicle_brand');    // Vehicle brand (from "Affectation véhicule" parsing or "Marque")
                $modelName = $val('vehicle_model');    // Vehicle model (optional)
                $manufacturerName = $val('manufacturer'); // Manufacturer
                $categoryName = $val('category');      // Category (optional)

                if (!$reference && !$designation) {
                    $stats['skipped']++;
                    $stats['messages'][] = "Row " . ($i + 2) . ": missing reference and name";
                    continue;
                }

                $price = $this->parsePrice($priceStr);

                // Upsert category if provided
                $categoryId = null;
                if ($categoryName) {
                    $cat = Category::firstOrCreate(['name' => $categoryName]);
                    if ($cat->wasRecentlyCreated) $stats['messages'][] = "Created category: {$cat->name}";
                    $categoryId = $cat->id;
                } else {
                    // fallback default category
                    $categoryId = Category::firstOrCreate(['name' => 'UNCLASSIFIED'])->id;
                }

                // Upsert manufacturer if provided
                $manufacturerId = null;
                if ($manufacturerName) {
                    $man = Manufacturer::firstOrCreate(['name' => $manufacturerName]);
                    if ($man->wasRecentlyCreated) {
                        $stats['manufacturers_created']++;
                    }
                    $manufacturerId = $man->id;
                }

                // Upsert vehicle brand/model if provided
                $vehicleModelId = null;
                if ($brandName) {
                    $vBrand = VehicleBrand::firstOrCreate(['name' => $brandName]);
                    if ($vBrand->wasRecentlyCreated) {
                        $stats['brands_created']++;
                    }
                    if ($modelName) {
                        $vModel = VehicleModel::firstOrCreate([
                            'vehicle_brand_id' => $vBrand->id,
                            'name' => $modelName,
                            'year_from' => null,
                            'year_to' => null,
                        ]);
                        if ($vModel->wasRecentlyCreated) {
                            $stats['models_created']++;
                        }
                        $vehicleModelId = $vModel->id;
                    }
                }

                // Upsert part by (sku? or name+manufacturer+category?)
                // Use reference as SKU if SKU is empty and reference looks unique.
                $sku = $val('sku') ?: $reference;
                $part = Part::where('sku', $sku)->first();
                if (!$part) {
                    $part = new Part();
                    $part->sku = $sku;
                    $part->name = $designation ?: $sku;
                    $part->category_id = $categoryId;
                    $part->manufacturer_id = $manufacturerId;
                    $part->is_active = true;
                    if (!$dry) $part->save();
                    $stats['parts_created']++;
                } else {
                    $dirty = false;
                    if ($designation && $part->name !== $designation) {
                        $part->name = $designation;
                        $dirty = true;
                    }
                    if ($manufacturerId && $part->manufacturer_id !== $manufacturerId) {
                        $part->manufacturer_id = $manufacturerId;
                        $dirty = true;
                    }
                    if ($categoryId && $part->category_id !== $categoryId) {
                        $part->category_id = $categoryId;
                        $dirty = true;
                    }
                    if ($dirty && !$dry) {
                        $part->save();
                        $stats['parts_updated']++;
                    }
                }

                // Reference (OEM) unique per part+type+reference_code
                if ($reference) {
                    $exists = PartReference::where([
                        'part_id' => $part->id,
                        'part_reference_type_id' => $oemType->id,
                        'reference_code' => $reference,
                    ])->exists();
                    if (!$exists) {
                        if (!$dry) {
                            PartReference::create([
                                'part_id' => $part->id,
                                'part_reference_type_id' => $oemType->id,
                                'ref_type_id' => $oemType->id,
                                'reference_code' => $reference,
                                'source_brand' => $manufacturerName ?: $brandName,
                            ]);
                        }
                        $stats['references_created']++;
                    }
                }

                // Price
                if ($price !== null) {
                    $exists = PartPrice::where([
                        'part_id' => $part->id,
                        'tier_id' => $tierId,
                        'min_qty' => 1,
                    ])->exists();
                    if (!$exists) {
                        if (!$dry) {
                            PartPrice::create([
                                'part_id' => $part->id,
                                'price_tier_id' => $tierId,
                                'tier_id' => $tierId,
                                'min_qty' => 1,
                                'price' => $price,
                                'currency' => 'DZD',
                            ]);
                        }
                        $stats['prices_created']++;
                    }
                }

                // Optional: create fitment if we have a model
                if ($vehicleModelId) {
                    $exists = DB::table('part_fitments')->where([
                        'part_id' => $part->id,
                        'vehicle_model_id' => $vehicleModelId,
                        'engine_code' => null,
                    ])->exists();
                    if (!$exists && !$dry) {
                        DB::table('part_fitments')->insert([
                            'part_id' => $part->id,
                            'vehicle_model_id' => $vehicleModelId,
                            'engine_code' => null,
                            'notes' => null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }

            if ($dry) DB::rollBack();
            else DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            $stats['errors']++;
            $stats['messages'][] = 'Fatal: ' . $e->getMessage();
            return response()->json(['ok' => false, 'stats' => $stats], 500);
        }

        return response()->json(['ok' => true, 'stats' => $stats]);
    }

    // ---------- Helpers ----------

    private function readCsv(Request $req): array
    {
        $req->validate([
            'file' => ['required', 'file'],
            'delimiter' => ['nullable', 'string'],
            'encoding' => ['nullable', 'string'],
        ]);

        $path = $req->file('file')->getRealPath();
        $delimiter = $req->input('delimiter') ?: $this->detectDelimiter($path);
        $encoding = $req->input('encoding') ?: 'UTF-8';

        $fh = fopen($path, 'r');
        if (!$fh) abort(422, 'Unable to open CSV');

        $rows = [];
        $headers = null;

        while (($line = fgetcsv($fh, 0, $delimiter)) !== false) {
            // convert encoding & trim BOM
            $line = array_map(function ($v) use ($encoding) {
                $v = is_string($v) ? $v : '';
                $v = preg_replace('/^\xEF\xBB\xBF/', '', $v);
                return trim(mb_convert_encoding($v, 'UTF-8', $encoding));
            }, $line);

            if ($headers === null) {
                $headers = $line;
                continue;
            }
            // Skip entirely empty rows
            if (count(array_filter($line, fn($x) => $x !== '')) === 0) continue;

            // Pad to headers length
            if (count($line) < count($headers)) {
                $line = array_pad($line, count($headers), '');
            }

            $rows[] = $line;
        }
        fclose($fh);

        return [$rows, $headers ?? []];
    }

    private function detectDelimiter(string $path): string
    {
        $sample = file_get_contents($path, false, null, 0, 5000) ?: '';
        $candidates = [',', ';', '\t', '|'];
        $best = ',';
        $bestScore = -1;
        foreach ($candidates as $d) {
            $lines = preg_split('/\R/', $sample);
            $counts = [];
            foreach (array_slice($lines, 0, 10) as $l) {
                $counts[] = substr_count($l, $d);
            }
            $score = count(array_unique($counts));
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $d;
            }
        }
        return $best;
    }

    private function detectDelimiterSample(Request $req): string
    {
        if (!$req->hasFile('file')) return ',';
        return $this->detectDelimiter($req->file('file')->getRealPath());
    }

    private function normHeader(?string $h): string
    {
        $h = mb_strtolower($h ?? '');
        $h = str_replace(['é', 'è', 'ê', 'ë'], 'e', $h);
        $h = str_replace(['à', 'â'], 'a', $h);
        $h = preg_replace('/[^a-z0-9]+/', '_', $h);
        $h = trim($h, '_');
        return $h;
    }

    private function guessMapping(array $norm): array
    {
        // target keys: reference, name, price, vehicle_brand, vehicle_model, manufacturer, category, sku
        $map = [];

        foreach ($norm as $i => $h) {
            if (in_array($h, ['reference', 'reference_code', 'ref', 'reference_', 'reference__'])) $map[$i] = 'reference';
            if (in_array($h, ['designation', 'designation_', 'designation__', 'designation___', 'designation____', 'designation_____', 'designation______', 'designation_______', 'designation________'])) $map[$i] = 'name';
            if (in_array($h, ['pu_vente', 'gros_ttc', 'prix', 'price'])) $map[$i] = 'price';
            if (in_array($h, ['marque', 'brand', 'vehicle_brand'])) $map[$i] = 'vehicle_brand';
            if (in_array($h, ['affectation_vehicule', 'vehicule', 'model', 'vehicle_model'])) $map[$i] = 'vehicle_model';
            if (in_array($h, ['manufacturer', 'fabricant'])) $map[$i] = 'manufacturer';
            if (in_array($h, ['categorie', 'category'])) $map[$i] = 'category';
            if (in_array($h, ['sku', 'code_interne'])) $map[$i] = 'sku';
            // Some files put a short word (e.g., "BRAS") in a free column → treat unknown all-caps word as category
        }

        return $map;
    }

    private function trimRow(array $row): array
    {
        return array_map(fn($v) => is_string($v) ? trim($v) : $v, $row);
    }

    private function isEmptyRow(array $row): bool
    {
        return count(array_filter($row, fn($v) => $v !== '')) === 0;
    }

    private function getMapped(array $row, array $mapping, array $normHeaders, string $target): ?string
    {
        // Primary: explicit mapping
        foreach ($mapping as $idx => $tgt) {
            if ($tgt === $target && isset($row[$idx])) return trim((string)$row[$idx]);
        }

        // Secondary: heuristic by header name
        $want = [
            'reference'      => ['reference', 'reference_code', 'ref'],
            'name'           => ['designation', 'name', 'libelle', 'des'],
            'price'          => ['pu_vente', 'gros_ttc', 'prix', 'price'],
            'vehicle_brand'  => ['marque', 'brand', 'vehicle_brand'],
            'vehicle_model'  => ['affectation_vehicule', 'vehicule', 'model', 'vehicle_model'],
            'manufacturer'   => ['manufacturer', 'fabricant'],
            'category'       => ['categorie', 'category'],
            'sku'            => ['sku', 'code_interne'],
        ][$target] ?? [];

        foreach ($normHeaders as $i => $h) {
            if (in_array($h, $want) && isset($row[$i])) return trim((string)$row[$i]);
        }

        // Tertiary: special cases
        if ($target === 'category') {
            // pick any cell with ALL CAPS short word (like BRAS) if no category field
            foreach ($row as $cell) {
                $c = trim((string)$cell);
                if ($c && mb_strtoupper($c) === $c && mb_strlen($c) <= 12 && preg_match('/[A-Z]/', $c)) {
                    return $c;
                }
            }
        }
        if ($target === 'vehicle_brand' || $target === 'vehicle_model') {
            // Try to split "Affectation véhicule" style like "X5 E53" → brand from separate "Marque" if available
            $aff = $this->getMapped($row, $mapping, $normHeaders, 'vehicle_model');
            if ($aff) {
                // naive split: first token is model family, keep as model, brand comes from 'marque'
                $brand = $this->getMapped($row, $mapping, $normHeaders, 'vehicle_brand');
                if ($target === 'vehicle_brand') return $brand;
                return $aff;
            }
        }

        return null;
    }

    private function parsePrice(?string $s): ?float
    {
        if ($s === null) return null;
        $s = trim($s);
        if ($s === '') return null;

        // Normalize: remove spaces/thin spaces, swap comma to dot if decimal
        $s = str_replace(["\xC2\xA0", ' '], '', $s); // NBSP + spaces
        $s = str_replace(['DZD', 'DA', 'dz', 'dzd'], '', mb_strtolower($s));
        // cases: "5 200.00", "0,00", "5200,5"
        if (preg_match('/,\d{1,2}$/', $s)) $s = str_replace(',', '.', $s);
        else $s = str_replace(',', '', $s);

        if (!is_numeric($s)) return null;
        return round((float)$s, 2);
    }
}
