<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

use App\Models\Category;
use App\Models\Manufacturer;
use App\Models\Warehouse;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\Part;
use App\Models\PartReference;
use App\Models\PartStock;

class ImportPartsController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/imports/page', [
            'guessMap'   => $this->guessingDictionary(),
            'warehouses' => Warehouse::select('id', 'name')->orderBy('name')->get(),
            'flash'      => [
                'parsed' => session('parsed'),
                'result' => session('result'),
            ],
        ]);
    }

    public function parse(Request $request)
    {
        $request->validate([
            'file'        => ['required', 'file'],
            'delimiter'   => ['nullable', 'in:,;|\t'],
            'encoding'    => ['nullable', 'string'],
            'has_header'  => ['nullable', 'boolean'],
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();

        $delimiter = $request->input('delimiter') ?: $this->detectDelimiter($path);
        $hasHeader = filter_var($request->input('has_header', true), FILTER_VALIDATE_BOOL);

        [$headers, $rows] = $this->readCsv($path, $delimiter, $hasHeader, 100);
        $normalized = array_map(fn($h) => $this->normalizeHeader($h), $headers);
        $autoMap = $this->autoMap($normalized);

        return redirect()
            ->route('admin.import.parts.index')
            ->with('parsed', [
                'headers'           => $headers,
                'normalizedHeaders' => $normalized,
                'rows'              => $rows,
                'delimiter'         => $delimiter,
                'hasHeader'         => $hasHeader,
                'autoMap'           => $autoMap,
            ]);
    }


    public function commit(Request $request)
    {
        $request->validate([
            'uploaded' => ['required', 'array'], // { headers, rows, delimiter, hasHeader }
            'mapping' => ['required', 'array'],  // columnIndex => targetField
            'options.default_category' => ['nullable', 'string', 'max:80'],
            'options.default_manufacturer' => ['nullable', 'string', 'max:120'],
            'options.reference_type' => ['nullable', 'in:OEM,AFTERMARKET,SUPPLIER,EAN_UPC,OTHER'],
            'options.create_missing_vehicle' => ['nullable', 'boolean'],
        ]);

        $uploaded = $request->input('uploaded');
        $mapping = $request->input('mapping');
        $options = $request->input('options', []);

        $headers = $uploaded['headers'] ?? [];
        $rows = $uploaded['rows'] ?? [];

        // Resolve defaults
        $defaultCategoryName = trim((string)($options['default_category'] ?? ''));
        $defaultManufacturerName = trim((string)($options['default_manufacturer'] ?? ''));
        $referenceType = $options['reference_type'] ?? 'OTHER';
        $createMissingVehicle = (bool)($options['create_missing_vehicle'] ?? true);

        $defaultCategoryId = $defaultCategoryName ? Category::firstOrCreate(['name' => $defaultCategoryName])->id : null;
        $defaultManufacturerId = $defaultManufacturerName ? Manufacturer::firstOrCreate(['name' => $defaultManufacturerName])->id : null;

        $created = 0;
        $updated = 0;
        $errors = [];

        DB::transaction(function () use (
            $rows,
            $mapping,
            $referenceType,
            $defaultCategoryId,
            $defaultManufacturerId,
            $createMissingVehicle,
            &$created,
            &$updated,
            &$errors
        ) {
            foreach ($rows as $i => $row) {
                try {
                    $data = $this->applyMapping($row, $mapping);

                    // Core fields
                    $sku = $data['sku'] ?? null;
                    $name = $data['name'] ?? null;
                    $categoryName = $data['category'] ?? null;
                    $manufacturerName = $data['manufacturer'] ?? null;

                    // Price/qty
                    $priceRetail = $this->toMoney($data['price_retail'] ?? $data['price_gros'] ?? null);
                    $priceDemi = $this->toMoney($data['price_demi_gros'] ?? null);
                    $priceGros = $this->toMoney($data['price_gros'] ?? null);
                    $qty = $this->toInt($data['qty'] ?? $data['stock_qty'] ?? null);

                    // References
                    $referenceCode = $data['reference_code'] ?? $data['oem_reference'] ?? null;
                    $refType = !empty($data['reference_type']) ? $data['reference_type'] : $referenceType;
                    $sourceBrand = $data['source_brand'] ?? null;

                    // Vehicle fitment (optional)
                    $vehicleBrandName = $data['vehicle_brand'] ?? $data['marque_vehicule'] ?? null;
                    $vehicleModelRaw  = $data['vehicle_model'] ?? $data['model'] ?? null;
                    $yearFrom = $this->toInt($data['year_from'] ?? null);
                    $yearTo = $this->toInt($data['year_to'] ?? null);
                    $engineCode = $data['engine_code'] ?? null;

                    // Category / Manufacturer
                    $categoryId = $defaultCategoryId;
                    if ($categoryName) {
                        $categoryId = Category::firstOrCreate(['name' => trim($categoryName)])->id;
                    }

                    $manufacturerId = $defaultManufacturerId;
                    if ($manufacturerName) {
                        $manufacturerId = Manufacturer::firstOrCreate(['name' => trim($manufacturerName)])->id;
                    }

                    // Upsert Part by SKU if present, else by (name, category)
                    $part = null;
                    if ($sku) {
                        $part = Part::where('sku', $sku)->first();
                    }
                    if (!$part && $name) {
                        $part = Part::where('name', $name)->where('category_id', $categoryId)->first();
                    }

                    if (!$part) {
                        $part = new Part();
                        $part->sku = $sku;
                        $part->category_id = $categoryId; // may be null
                        $part->manufacturer_id = $manufacturerId;
                        $part->name = $name ?: $sku ?: 'Unnamed Part';
                        $part->package_qty = !is_null($qty) ? $qty : 1; // <-- here
                        $part->min_order_qty = 1;
                        $part->price_retail = $priceRetail;
                        $part->price_demi_gros = $priceDemi;
                        $part->price_gros = $priceGros;
                        $part->is_active = true;
                        $part->save();
                        $created++;
                    } else {
                        $dirty = false;

                        if ($manufacturerId && $part->manufacturer_id !== $manufacturerId) {
                            $part->manufacturer_id = $manufacturerId;
                            $dirty = true;
                        }
                        if ($name && $part->name !== $name) {
                            $part->name = $name;
                            $dirty = true;
                        }
                        if (!is_null($priceRetail)) {
                            $part->price_retail = $priceRetail;
                            $dirty = true;
                        }
                        if (!is_null($priceDemi)) {
                            $part->price_demi_gros = $priceDemi;
                            $dirty = true;
                        }
                        if (!is_null($priceGros)) {
                            $part->price_gros = $priceGros;
                            $dirty = true;
                        }
                        if (!is_null($qty) && $part->package_qty !== $qty) { // <-- update package_qty if provided
                            $part->package_qty = $qty;
                            $dirty = true;
                        }

                        if ($dirty) {
                            $part->save();
                            $updated++;
                        }
                    }

                    // Reference
                    if ($referenceCode) {
                        PartReference::firstOrCreate([
                            'part_id' => $part->id,
                            'type' => $refType,
                            'code' => trim($referenceCode),
                        ], [
                            'source_brand' => $sourceBrand ? trim($sourceBrand) : null,
                        ]);
                    }
                    $vehicleModelName = $vehicleModelRaw ? trim(preg_replace('/\s+/', ' ', $vehicleModelRaw)) : null;
                    $vehicleModelNotes = null;
                    if ($vehicleModelName && mb_strlen($vehicleModelName) > 120) {
                        $vehicleModelNotes = $vehicleModelName;                  // keep full original for notes
                        $vehicleModelName  = mb_substr($vehicleModelName, 0, 120); // truncate to column limit
                    }

                    $yearFrom = $this->toInt($data['year_from'] ?? null);
                    $yearTo   = $this->toInt($data['year_to'] ?? null);
                    $engineCode = $data['engine_code'] ?? null;

                    // Fitment (optional)
                    if ($vehicleBrandName && $vehicleModelName && $createMissingVehicle) {
                        $vb = VehicleBrand::firstOrCreate(['name' => trim($vehicleBrandName)]);
                        $vm = VehicleModel::firstOrCreate([
                            'vehicle_brand_id' => $vb->id,
                            'name' => $vehicleModelName,
                            'year_from' => $yearFrom,
                            'year_to'   => $yearTo,
                        ]);

                        DB::table('part_fitments')->updateOrInsert(
                            [
                                'part_id' => $part->id,
                                'vehicle_model_id' => $vm->id,
                                'engine_code' => $engineCode,
                            ],
                            [
                                'notes' => $vehicleModelNotes, // store the full long string here if we truncated
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]
                        );
                    }
                } catch (\Throwable $e) {
                    $errors[] = [
                        'row' => $i + 1,
                        'message' => $e->getMessage(),
                    ];
                }
            }
        });

        return redirect()
            ->route('admin.import.parts.index')
            ->with('result', [
                'created' => $created,
                'updated' => $updated,
                'errors'  => $errors,
            ]);
    }

    /* -------------------- Helpers -------------------- */

    private function detectDelimiter(string $path): string
    {
        $sample = file($path, FILE_IGNORE_NEW_LINES);
        $line = $sample[0] ?? '';
        $candidates = [",", ";", "\t", "|"];
        $best = ',';
        $bestCount = 0;
        foreach ($candidates as $d) {
            $count = substr_count($line, $d);
            if ($count > $bestCount) {
                $best = $d;
                $bestCount = $count;
            }
        }
        return $best;
    }

    private function readCsv(string $path, string $delimiter, bool $hasHeader, int $limit = 100): array
    {
        $fh = fopen($path, 'r');
        if (!$fh) throw new \Exception('Cannot open CSV.');

        $headers = [];
        $rows = [];
        if ($hasHeader && ($h = fgetcsv($fh, 0, $delimiter))) {
            $headers = array_map(fn($x) => trim((string)$x), $h);
        }
        $i = 0;
        while (($r = fgetcsv($fh, 0, $delimiter)) !== false) {
            $rows[] = array_map(fn($x) => is_null($x) ? null : trim((string)$x), $r);
            if (++$i >= $limit) break;
        }
        fclose($fh);

        if (!$hasHeader) {
            $colCount = isset($rows[0]) ? count($rows[0]) : 0;
            $headers = array_map(fn($i) => "Col{$i}", range(1, $colCount));
        }

        return [$headers, $rows];
    }

    private function normalizeHeader(?string $h): string
    {
        $h = Str::lower(trim((string)$h));
        $h = str_replace(['°', 'é', 'è', 'ê', 'à', 'â', 'î', 'ï', 'ô', 'ö', 'û', 'ü'], ['o', 'e', 'e', 'e', 'a', 'a', 'i', 'i', 'o', 'o', 'u', 'u'], $h);
        $h = preg_replace('/\s+/', ' ', $h);
        $h = str_replace(['/', '\\', '-', '.', ',', ':'], ' ', $h);
        return trim($h);
    }

    private function guessingDictionary(): array
    {
        // normalized header => target field
        // target fields recognized by our importer
        return [
            // SKU / Reference
            'reference' => 'sku',
            'ref' => 'sku',
            'référence' => 'sku',
            'ref origine' => 'oem_reference',
            'oem' => 'oem_reference',

            // Name / Designation
            'designation' => 'name',
            'désignation' => 'name',
            'libelle' => 'name',
            'designation produit' => 'name',

            // Quantities
            'qte' => 'qty',
            'quantite' => 'qty',
            'quantité' => 'qty',
            'stock' => 'stock_qty',

            // Prices
            'pu vente' => 'price_retail',
            'prix' => 'price_retail',
            'gros ttc' => 'price_gros',
            'prix_g' => 'price_gros',
            'prix demi gros' => 'price_demi_gros',
            'prix_demi_gros' => 'price_demi_gros',

            // Category / Manufacturer
            'categorie' => 'category',
            'catégorie' => 'category',
            'marque fabriquant' => 'manufacturer',
            'marque_fabriquant' => 'manufacturer',
            'marque fabricant' => 'manufacturer',

            // Vehicle / Fitment
            'affectation vehicule' => 'vehicle_model',
            'affectation véhicule' => 'vehicle_model',
            'model' => 'vehicle_model',
            'modele' => 'vehicle_model',
            'marque' => 'vehicle_brand',
            'marque_vehicule' => 'vehicle_brand',
            'annee de' => 'year_from',
            'annee a' => 'year_to',
            'engine' => 'engine_code',
            'engine code' => 'engine_code',

            // Warehouse
            'entrepot' => 'warehouse',
            'warehouse' => 'warehouse',
        ];
    }

    private function autoMap(array $normalizedHeaders): array
    {
        $dict = $this->guessingDictionary();
        $mapping = [];
        foreach ($normalizedHeaders as $idx => $h) {
            $mapping[$idx] = $dict[$h] ?? null;
        }
        return $mapping;
    }

    private function applyMapping(array $row, array $mapping): array
    {
        $out = [];
        foreach ($mapping as $idx => $target) {
            if (!$target) continue;
            $out[$target] = $row[$idx] ?? null;
        }
        return $out;
    }

    private function toMoney($raw): ?float
    {
        if ($raw === null || $raw === '') return null;
        // Handle "6 500.00", "0,00", etc.
        $s = trim((string)$raw);
        // If comma as decimal and dot as thousand: "10.274,72"
        if (preg_match('/^\d{1,3}(\.\d{3})+,\d{2}$/', $s)) {
            $s = str_replace('.', '', $s);
            $s = str_replace(',', '.', $s);
        } else {
            // Remove spaces and thousands commas; keep last dot/comma as decimal
            $s = str_replace([' '], '', $s);
            // If there's a comma but no dot, assume comma decimal
            if (strpos($s, ',') !== false && strpos($s, '.') === false) {
                $s = str_replace(',', '.', $s);
            } else {
                $s = str_replace(',', '', $s);
            }
        }
        return is_numeric($s) ? round((float)$s, 2) : null;
    }

    private function toInt($raw): ?int
    {
        if ($raw === null || $raw === '') return null;
        $s = preg_replace('/[^\d\-]/', '', (string)$raw);
        if ($s === '' || $s === '-') return null;
        return (int)$s;
    }

    private function resolveWarehouseId(?string $nameOrId): ?int
    {
        if (!$nameOrId) return null;
        if (ctype_digit((string)$nameOrId)) {
            return Warehouse::where('id', (int)$nameOrId)->value('id');
        }
        $w = Warehouse::where('name', trim($nameOrId))->first();
        return $w?->id;
    }

    private function normalizeModelName(?string $raw, int $max = 120): array
    {
        if (!$raw) return [null, null];
        $name = trim(preg_replace('/\s+/', ' ', $raw));
        if ($name === '') return [null, null];
        if (mb_strlen($name) > $max) {
            return [mb_substr($name, 0, $max), $name]; // [short, full]
        }
        return [$name, null];
    }


}
