<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Part;
use App\Models\PartFitment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PartController extends Controller
{
    public function page()
    {
        return Inertia::render('admin/parts/page');
    }

    public function index(Request $req)
    {
        $perPage = (int)($req->integer('per_page') ?: 10);
        $page    = (int)($req->integer('page') ?: 1);

        $q = Part::query()
            ->with(['manufacturer:id,name', 'fitments.model.brand:id,name'])
            ->when($req->filled('manufacturer_id'), fn($x) => $x->where('manufacturer_id', $req->integer('manufacturer_id')))
            ->when(
                $req->filled('vehicle_model_id'),
                fn($x) =>
                $x->whereHas(
                    'models',
                    fn($m) =>
                    $m->where('vehicle_models.id', $req->integer('vehicle_model_id'))
                )
            )
            ->when(
                $req->filled('vehicle_brand_id'),
                fn($x) =>
                $x->whereHas(
                    'models.brand',
                    fn($b) =>
                    $b->where('vehicle_brands.id', $req->integer('vehicle_brand_id'))
                )
            )
            ->when($req->filled('is_active') && $req->is_active !== '', fn($x) => $x->where('is_active', (bool)$req->is_active))
            ->when($req->filled('sku'), fn($x) => $x->where('sku', 'ILIKE', '%' . $req->sku . '%'))
            ->when($req->filled('reference'), fn($x) => $x->where('reference', 'ILIKE', '%' . $req->reference . '%'))
            ->orderBy('id', 'desc');


        $total = (clone $q)->count();
        $rows  = $q->forPage($page, $perPage)->get();

        // normalize payload
        $data = $rows->map(function (Part $p) {
            // aggregate fitment brands/models for quick preview
            $brands = [];
            $models = [];
            foreach ($p->fitments as $f) {
                $b = $f->model?->brand?->name;
                $m = $f->model?->name;
                if ($b) $brands[$b] = true;
                if ($m) $models[$m] = true;
            }

            return [
                'id'                 => $p->id,
                'reference'          => $p->reference,
                'barcode'            => $p->barcode,
                'sku'                => $p->sku,
                'name'               => $p->name,
                'manufacturer'       => $p->relationLoaded('manufacturer') && $p->manufacturer ? ['id' => $p->manufacturer->id, 'name' => $p->manufacturer->name] : null,
                'price_retail_ttc'   => $p->price_retail_ttc,
                'is_active'          => (bool)$p->is_active,
                'stock_real'         => $p->stock_real,
                'stock_available'    => $p->stock_available,
                'fitment_brands'     => array_keys($brands),
                'fitment_models'     => array_keys($models),
            ];
        });

        return response()->json([
            'data'     => $data,
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
        ]);
    }

    public function store(Request $req)
    {
        $val = $this->validated($req);

        $part = Part::create($val);

        // handle images array (optional passthrough)
        if ($req->has('images')) {
            $part->images = $this->sortedImages($req->input('images', []));
            $part->save();
        }

        // handle fitments (optional)
        if ($req->has('fitments')) {
            $this->upsertFitments($part, $req->input('fitments', []));
        }

        return response()->json(['id' => $part->id], 201);
    }

    public function show(Part $part)
    {
        $part->load(['manufacturer:id,name', 'fitments.model.brand']);

        return response()->json([
            'part' => [
                'id'                  => $part->id,
                'manufacturer_id'     => $part->manufacturer_id,
                'reference'           => $part->reference,
                'barcode'             => $part->barcode,
                'sku'                 => $part->sku,
                'name'                => $part->name,
                'description'         => $part->description,
                'price_retail_ttc'    => $part->price_retail_ttc,
                'price_wholesale_ttc' => $part->price_wholesale_ttc,
                'tva_rate'            => $part->tva_rate,
                'stock_real'          => $part->stock_real,
                'stock_available'     => $part->stock_available,
                'images'              => $part->images ?? [],
                'is_active'           => (bool)$part->is_active,
            ],
            'fitments' => $part->fitments->map(function (PartFitment $f) {
                return [
                    'id'               => $f->id,
                    'vehicle_brand_id' => $f->model?->brand?->id, // for preloading models
                    'vehicle_model_id' => $f->model?->id,
                    'engine_code'      => $f->engine_code,
                    'notes'            => $f->notes,
                    'vehicle_brand'    => $f->model?->brand?->name,
                    'vehicle_model'    => $f->model?->name,
                    'year_from'        => $f->model?->year_from,
                    'year_to'          => $f->model?->year_to,
                ];
            }),
        ]);
    }

    public function update(Request $req, Part $part)
    {
        $val = $this->validated($req, $part->id);
        $part->update($val);

        if ($req->has('images')) {
            $part->images = $this->sortedImages($req->input('images', []));
            $part->save();
        }

        if ($req->has('fitments')) {
            $this->upsertFitments($part, $req->input('fitments', []));
        }

        return response()->json(['ok' => true]);
    }

    public function destroy(Part $part)
    {
        $part->delete();
        return response()->json(['ok' => true]);
    }

    public function bulkStatus(Request $req)
    {
        $data = $req->validate([
            'ids'       => ['required', 'array', 'min:1'],
            'ids.*'     => ['integer', 'exists:parts,id'],
            'is_active' => ['required', 'boolean'],
        ]);

        Part::whereIn('id', $data['ids'])->update(['is_active' => $data['is_active']]);

        return response()->json(['updated' => count($data['ids'])]);
    }

    public function updateImages(Request $req, Part $part)
    {
        $data = $req->validate([
            'images'              => ['required', 'array'],
            'images.*.url'        => ['required', 'string', 'max:1024'],
            'images.*.sort_order' => ['nullable', 'integer'],
        ]);

        $sorted = $this->sortedImages($data['images']);
        $part->images = $sorted;
        $part->save();

        return response()->json(['ok' => true, 'images' => $sorted]);
    }

    public function updateActive(Request $req, Part $part)
    {
        $req->validate(['is_active' => ['required', 'boolean']]);
        $part->is_active = (bool)$req->boolean('is_active');
        $part->save();
        return response()->json(['ok' => true]);
    }

    private function validated(Request $req, ?int $id = null): array
    {
        return $req->validate([
            'manufacturer_id'     => ['nullable', 'integer', 'exists:manufacturers,id'],
            'reference'           => ['nullable', 'string', 'max:120'],
            'barcode'             => ['nullable', 'string', 'max:64'],
            'sku'                 => ['nullable', 'string', 'max:80', Rule::unique('parts', 'sku')->ignore($id)],
            'name'                => ['required', 'string', 'max:255'],
            'description'         => ['nullable', 'string'],

            'price_retail_ttc'    => ['nullable', 'numeric', 'min:0'],
            'price_wholesale_ttc' => ['nullable', 'numeric', 'min:0'],
            'tva_rate'            => ['nullable', 'numeric', 'min:0'],

            'stock_real'          => ['nullable', 'integer'],
            'stock_available'     => ['nullable', 'integer'],

            'images'              => ['sometimes', 'array'],
            'is_active'           => ['required', 'boolean'],

            // fitments are handled separately, but allow passthrough
            'fitments'                     => ['sometimes', 'array'],
            'fitments.*.id'                => ['nullable', 'integer', 'exists:part_fitments,id'],
            'fitments.*.vehicle_model_id'  => ['required_with:fitments', 'integer', 'exists:vehicle_models,id'],
            'fitments.*.engine_code'       => ['nullable', 'string', 'max:64'],
            'fitments.*.notes'             => ['nullable', 'string', 'max:255'],
        ]);
    }

    private function sortedImages(array $images): array
    {
        return collect($images)
            ->map(fn($i) => ['url' => $i['url'], 'sort_order' => $i['sort_order'] ?? 0])
            ->sortBy('sort_order')
            ->values()
            ->all();
    }

    private function upsertFitments(Part $part, array $fitments): void
    {
        $incoming = collect($fitments);
        $keepIds = [];

        foreach ($incoming as $f) {
            if (!empty($f['id'])) {
                $model = PartFitment::where('part_id', $part->id)->where('id', $f['id'])->firstOrFail();
                $model->update([
                    'vehicle_model_id' => $f['vehicle_model_id'],
                    'engine_code'      => $f['engine_code'] ?? null,
                    'notes'            => $f['notes'] ?? null,
                ]);
                $keepIds[] = $model->id;
            } else {
                $model = PartFitment::firstOrCreate(
                    [
                        'part_id'          => $part->id,
                        'vehicle_model_id' => $f['vehicle_model_id'],
                        'engine_code'      => $f['engine_code'] ?? null,
                    ],
                    [
                        'notes' => $f['notes'] ?? null,
                    ]
                );
                $keepIds[] = $model->id;
            }
        }

        PartFitment::where('part_id', $part->id)
            ->whereNotIn('id', $keepIds)
            ->delete();
    }
}
