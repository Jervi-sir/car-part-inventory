<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

use App\Models\Manufacturer;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\Part;

class ImportPartsController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/imports/page', [
            'guessMap' => $this->guessingDictionary(),
            'manufacturers' => Manufacturer::select('id', 'name')->orderBy('name')->get(),
            'flash' => [
                'parsed' => session('parsed'),
                'result' => session('result'),
            ],
        ]);
    }

    public function parse(Request $request)
    {
        $request->validate([
            'file'       => ['required', 'file'],
            'delimiter'  => ['nullable', 'in:,;|\t'],
            'encoding'   => ['nullable', 'string'],
            'has_header' => ['nullable', 'boolean'],
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
            'mapping'  => ['required', 'array'], // columnIndex => targetField

            // options
            'options.default_manufacturer' => ['nullable', 'string', 'max:120'],
            'options.tva_rate_default'     => ['nullable', 'numeric'], // allows overriding if CSV lacks it
        ]);

        $uploaded = $request->input('uploaded');
        $mapping  = $request->input('mapping');
        $options  = $request->input('options', []);

        $rows = $uploaded['rows'] ?? [];

        $defaultManufacturerName = trim((string)($options['default_manufacturer'] ?? ''));
        $defaultManufacturerId   = $defaultManufacturerName
            ? Manufacturer::firstOrCreate(['name' => $defaultManufacturerName])->id
            : null;

        $tvaDefault = $this->toMoney($options['tva_rate_default'] ?? null); // e.g. 19.00

        $created = 0;
        $updated = 0;
        $errors  = [];

        DB::transaction(function () use (
            $rows,
            $mapping,
            $defaultManufacturerId,
            $tvaDefault,
            &$created,
            &$updated,
            &$errors
        ) {
            foreach ($rows as $i => $row) {
                try {
                    $data = $this->applyMapping($row, $mapping);

                    // Core identifiers / fields
                    $reference = $data['reference'] ?? null;
                    $sku       = $data['sku'] ?? null;
                    $barcode   = $data['barcode'] ?? null;
                    $name      = $data['name'] ?? null;
                    $desc      = $data['description'] ?? null;

                    // Manufacturer
                    $manufacturerName = $data['manufacturer'] ?? null;
                    $manufacturerId   = $defaultManufacturerId;
                    if ($manufacturerName) {
                        $manufacturerId = Manufacturer::firstOrCreate(['name' => trim($manufacturerName)])->id;
                    }

                    // Prices / VAT
                    $priceRetailTtc    = $this->toMoney($data['price_retail_ttc'] ?? $data['price_retail'] ?? null);
                    $priceWholesaleTtc = $this->toMoney($data['price_wholesale_ttc'] ?? $data['price_gros'] ?? null);
                    $tvaRate           = $this->toMoney($data['tva_rate'] ?? $data['tva'] ?? null);
                    if (is_null($tvaRate) && !is_null($tvaDefault)) {
                        $tvaRate = $tvaDefault; // fallback option
                    }

                    // Stock (single-site global)
                    $stockReal       = $this->toInt($data['stock_real'] ?? $data['qty'] ?? $data['stock_qty'] ?? null) ?? 0;
                    $stockAvailable  = $this->toInt($data['stock_available'] ?? null);
                    if (is_null($stockAvailable)) {
                        // default to stock_real if not provided
                        $stockAvailable = $stockReal;
                    }

                    // Vehicle fitment (optional)
                    $vehicleBrandName = $data['vehicle_brand'] ?? $data['marque_vehicule'] ?? null;
                    $vehicleModelRaw  = $data['vehicle_model'] ?? $data['model'] ?? null;
                    $yearFrom         = $this->toInt($data['year_from'] ?? null);
                    $yearTo           = $this->toInt($data['year_to'] ?? null);
                    $engineCode       = $data['engine_code'] ?? null;

                    // Upsert Part:
                    // Priority: by unique SKU if present, else by (reference + manufacturer) as a pragmatic fallback,
                    // else create new.
                    $part = null;
                    if ($sku) {
                        $part = Part::where('sku', $sku)->first();
                    }
                    if (!$part && $reference) {
                        $q = Part::query()->where('reference', $reference);
                        if ($manufacturerId) $q->where('manufacturer_id', $manufacturerId);
                        $part = $q->first();
                    }

                    if (!$part) {
                        $part = new Part();
                        $part->reference          = $reference;
                        $part->sku                = $sku;
                        $part->barcode            = $barcode;
                        $part->name               = $name ?: ($sku ?: $reference ?: 'Unnamed Part');
                        $part->description        = $desc;
                        $part->manufacturer_id    = $manufacturerId;
                        $part->price_retail_ttc   = $priceRetailTtc;
                        $part->price_wholesale_ttc= $priceWholesaleTtc;
                        $part->tva_rate           = $tvaRate;
                        $part->stock_real         = $stockReal;
                        $part->stock_available    = $stockAvailable;
                        $part->is_active          = true;
                        $part->save();
                        $created++;
                    } else {
                        $dirty = false;
                        $assign = function($field, $val) use ($part, &$dirty) {
                            if (!is_null($val) && $part->{$field} !== $val) {
                                $part->{$field} = $val;
                                $dirty = true;
                            }
                        };

                        $assign('reference', $reference);
                        $assign('barcode', $barcode);
                        $assign('name', $name);
                        $assign('description', $desc);
                        if ($manufacturerId && $part->manufacturer_id !== $manufacturerId) {
                            $part->manufacturer_id = $manufacturerId; $dirty = true;
                        }
                        $assign('price_retail_ttc', $priceRetailTtc);
                        $assign('price_wholesale_ttc', $priceWholesaleTtc);
                        if (!is_null($tvaRate)) $assign('tva_rate', $tvaRate);
                        $assign('stock_real', $stockReal);
                        $assign('stock_available', $stockAvailable);

                        if ($dirty) {
                            $part->save();
                            $updated++;
                        }
                    }

                    // Fitment (optional)
                    $vehicleModelName = $vehicleModelRaw ? trim(preg_replace('/\s+/', ' ', $vehicleModelRaw)) : null;
                    $vehicleModelNotes = null;
                    if ($vehicleModelName && mb_strlen($vehicleModelName) > 120) {
                        $vehicleModelNotes = $vehicleModelName;
                        $vehicleModelName  = mb_substr($vehicleModelName, 0, 120);
                    }

                    if ($vehicleBrandName && $vehicleModelName) {
                        $vb = VehicleBrand::firstOrCreate(['name' => trim($vehicleBrandName)]);
                        $vm = VehicleModel::firstOrCreate([
                            'vehicle_brand_id' => $vb->id,
                            'name'             => $vehicleModelName,
                            'year_from'        => $yearFrom,
                            'year_to'          => $yearTo,
                        ]);

                        DB::table('part_fitments')->updateOrInsert(
                            [
                                'part_id'          => $part->id,
                                'vehicle_model_id' => $vm->id,
                                'engine_code'      => $engineCode,
                            ],
                            [
                                'notes'      => $vehicleModelNotes,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]
                        );
                    }
                } catch (\Throwable $e) {
                    $errors[] = [
                        'row'     => $i + 1,
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
        $h = str_replace(['°','é','è','ê','à','â','î','ï','ô','ö','û','ü'], ['o','e','e','e','a','a','i','i','o','o','u','u'], $h);
        $h = preg_replace('/\s+/', ' ', $h);
        $h = str_replace(['/', '\\', '-', '.', ',', ':'], ' ', $h);
        return trim($h);
    }

    private function guessingDictionary(): array
    {
        // normalized header => target field (schema-aligned)
        return [
            // identifiers
            'sku' => 'sku',
            'reference' => 'reference',
            'référence' => 'reference',
            'barcode' => 'barcode',
            'ean' => 'barcode',
            'ean upc' => 'barcode',
            'upc' => 'barcode',

            // name/description
            'name' => 'name',
            'designation' => 'name',
            'désignation' => 'name',
            'libelle' => 'name',
            'description' => 'description',
            'desc' => 'description',

            // manufacturer
            'manufacturer' => 'manufacturer',
            'marque fabriquant' => 'manufacturer',
            'marque_fabriquant' => 'manufacturer',
            'marque fabricant' => 'manufacturer',

            // pricing TTC
            'price retail ttc' => 'price_retail_ttc',
            'pu vente' => 'price_retail_ttc',
            'prix ttc' => 'price_retail_ttc',
            'prix' => 'price_retail_ttc',
            'price wholesale ttc' => 'price_wholesale_ttc',
            'gros ttc' => 'price_wholesale_ttc',
            'prix_g' => 'price_wholesale_ttc',

            // tva
            'tva' => 'tva_rate',
            'tva rate' => 'tva_rate',
            'vat' => 'tva_rate',

            // stock (global)
            'stock reel' => 'stock_real',
            'stock réel' => 'stock_real',
            'stock' => 'stock_real',
            'qte' => 'stock_real',
            'quantite' => 'stock_real',
            'quantité' => 'stock_real',
            'stock disponible' => 'stock_available',
            'stock dispo' => 'stock_available',

            // vehicle / fitment
            'marque' => 'vehicle_brand',
            'marque_vehicule' => 'vehicle_brand',
            'vehicle brand' => 'vehicle_brand',
            'model' => 'vehicle_model',
            'modele' => 'vehicle_model',
            'affectation vehicule' => 'vehicle_model',
            'affectation véhicule' => 'vehicle_model',
            'annee de' => 'year_from',
            'annee a' => 'year_to',
            'year from' => 'year_from',
            'year to'   => 'year_to',
            'engine' => 'engine_code',
            'engine code' => 'engine_code',
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
        $s = trim((string)$raw);
        if (preg_match('/^\d{1,3}(\.\d{3})+,\d{2}$/', $s)) {
            $s = str_replace('.', '', $s);
            $s = str_replace(',', '.', $s);
        } else {
            $s = str_replace([' '], '', $s);
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
}
