<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Part;
use App\Models\PartReference;
use App\Models\PartFitment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PartController extends Controller
{
    public function index(Request $req)
    {
        $perPage = (int)($req->integer('per_page') ?: 10);
        $page    = (int)($req->integer('page') ?: 1);

        $q = Part::query()
            ->with(['category:id,name', 'manufacturer:id,name'])
            ->when($req->filled('category_id'), fn($x) => $x->where('category_id', $req->integer('category_id')))
            ->when($req->filled('manufacturer_id'), fn($x) => $x->where('manufacturer_id', $req->integer('manufacturer_id')))
            ->when($req->filled('is_active') && $req->is_active !== '', fn($x) => $x->where('is_active', (bool)$req->is_active))
            ->when($req->filled('sku'), fn($x) => $x->where('sku', 'LIKE', '%' . $req->sku . '%'))
            ->when($req->filled('reference_code'), function ($x) use ($req) {
                $x->whereExists(function ($s) use ($req) {
                    $s->select(DB::raw(1))
                        ->from('part_references as pr')
                        ->whereColumn('pr.part_id', 'parts.id')
                        ->where('pr.code', 'LIKE', '%' . $req->reference_code . '%');
                });
            })
            ->orderBy('id', 'desc');

        $total = (clone $q)->count();
        $rows  = $q->forPage($page, $perPage)->get();

        // normalize payload
        $data = $rows->map(function (Part $p) {
            return [
                'id'           => $p->id,
                'sku'          => $p->sku,
                'name'         => $p->name,
                'category'     => $p->relationLoaded('category') && $p->category ? ['id' => $p->category->id, 'name' => $p->category->name] : null,
                'manufacturer' => $p->relationLoaded('manufacturer') && $p->manufacturer ? ['id' => $p->manufacturer->id, 'name' => $p->manufacturer->name] : null,
                'price_retail' => $p->price_retail,
                'is_active'    => (bool)$p->is_active,
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
        $validated = $this->validateWhole($req);

        return DB::transaction(function () use ($validated) {
            // create part (core only)
            $part = Part::create($validated['core']);

            // images
            if (array_key_exists('images', $validated)) {
                $part->images = $validated['images'];
                $part->save();
            }

            // references
            if (array_key_exists('references', $validated)) {
                $this->upsertReferences($part, collect($validated['references']));
            }

            // fitments
            if (array_key_exists('fitments', $validated)) {
                $this->upsertFitments($part, collect($validated['fitments']));
            }

            return response()->json(['id' => $part->id], 201);
        });
    }


    public function show(Part $part)
    {
        $part->load(['references', 'fitments.vehicleModel.vehicleBrand']);

        return response()->json([
            'part' => [
                'id'               => $part->id,
                'category_id'      => $part->category_id,
                'manufacturer_id'  => $part->manufacturer_id,
                'sku'              => $part->sku,
                'name'             => $part->name,
                'description'      => $part->description,
                'package_qty'      => $part->package_qty,
                'min_order_qty'    => $part->min_order_qty,
                'price_retail'     => $part->price_retail,
                'price_demi_gros'  => $part->price_demi_gros,
                'price_gros'       => $part->price_gros,
                'min_qty_gros'     => $part->min_qty_gros,
                'images'           => $part->images ?? [],
                'is_active'        => (bool)$part->is_active,
            ],
            'references' => $part->references->map(fn(PartReference $r) => [
                'id'          => $r->id,
                'type'        => $r->type,
                'code'        => $r->code,
                'source_brand' => $r->source_brand,
            ]),
            'fitments' => $part->fitments->map(function (PartFitment $f) {
                return [
                    'id'                => $f->id,
                    'vehicle_model_id'  => $f->vehicle_model_id,
                    'engine_code'       => $f->engine_code,
                    'notes'             => $f->notes,
                    // add this id so the UI can preselect the brand and load models
                    'vehicle_brand_id'  => $f->vehicleModel?->vehicle_brand_id,

                    // optional display fields
                    'vehicle_brand'     => $f->vehicleModel?->vehicleBrand?->name,
                    'vehicle_model'     => $f->vehicleModel?->name,
                    'year_from'         => $f->vehicleModel?->year_from,
                    'year_to'           => $f->vehicleModel?->year_to,
                ];
            }),
        ]);
    }

    public function update(Request $req, Part $part)
    {
        $validated = $this->validateWhole($req, $part->id);

        return DB::transaction(function () use ($validated, $part) {
            // update core
            $part->update($validated['core']);

            // images (replace fully if sent)
            if (array_key_exists('images', $validated)) {
                $part->images = $validated['images'];
                $part->save();
            }

            // references (full replace of set if sent)
            if (array_key_exists('references', $validated)) {
                $this->upsertReferences($part, collect($validated['references']));
            }

            // fitments (full replace of set if sent)
            if (array_key_exists('fitments', $validated)) {
                $this->upsertFitments($part, collect($validated['fitments']));
            }

            return response()->json(['ok' => true, 'id' => $part->id]);
        });
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

        $sorted = collect($data['images'])
            ->map(fn($i) => ['url' => $i['url'], 'sort_order' => $i['sort_order'] ?? 0])
            ->sortBy('sort_order')
            ->values()
            ->all();

        $part->images = $sorted;
        $part->save();

        return response()->json(['ok' => true, 'images' => $sorted]);
    }

    private function validated(Request $req, ?int $id = null): array
    {
        return $req->validate([
            'manufacturer_id'  => ['nullable', 'integer', 'exists:manufacturers,id'],
            'category_id'      => ['required', 'integer', 'exists:categories,id'],
            'sku'              => [
                'nullable',
                'string',
                'max:80',
                Rule::unique('parts', 'sku')->ignore($id),
            ],
            'name'             => ['required', 'string', 'max:255'],
            'description'      => ['nullable', 'string'],
            'package_qty'      => ['required', 'integer', 'min:1'],
            'min_order_qty'    => ['required', 'integer', 'min:1'],
            'price_retail'     => ['nullable', 'numeric', 'min:0'],
            'price_demi_gros'  => ['nullable', 'numeric', 'min:0'],
            'price_gros'       => ['nullable', 'numeric', 'min:0'],
            'min_qty_gros'     => ['required', 'integer', 'min:1'],
            'is_active'        => ['required', 'boolean'],
        ]);
    }


    public function upsert(Part $part, Request $request)
    {
        // validate section-by-section (if key is present)
        $validated = $request->validate([
            'references'                 => ['sometimes', 'array'],
            'references.*.id'            => ['nullable', 'integer', 'exists:part_references,id'],
            'references.*.type'          => ['required_with:references', Rule::in(['OEM', 'AFTERMARKET', 'SUPPLIER', 'EAN_UPC', 'OTHER'])],
            'references.*.code'          => ['required_with:references', 'string', 'max:120'],
            'references.*.source_brand'  => ['nullable', 'string', 'max:120'],

            'fitments'                   => ['sometimes', 'array'],
            'fitments.*.id'              => ['nullable', 'integer', 'exists:part_fitments,id'],
            'fitments.*.vehicle_model_id' => ['required_with:fitments', 'integer', 'exists:vehicle_models,id'],
            'fitments.*.engine_code'     => ['nullable', 'string', 'max:64'],
            'fitments.*.notes'           => ['nullable', 'string', 'max:255'],
        ]);

        return DB::transaction(function () use ($part, $validated) {
            $response = [];

            // ----------------- REFERENCES -----------------
            if (array_key_exists('references', $validated)) {
                $incomingRefs = collect($validated['references'] ?? []);

                // Guard: any provided id must belong to this part.
                if ($incomingRefs->pluck('id')->filter()->isNotEmpty()) {
                    $foreignIds = $part->references()->whereIn('id', $incomingRefs->pluck('id')->filter())->pluck('id')->all();
                    $invalidIds = $incomingRefs->pluck('id')->filter()->diff($foreignIds);
                    if ($invalidIds->isNotEmpty()) {
                        abort(422, 'One or more reference IDs do not belong to this part.');
                    }
                }

                $keptRefIds = [];

                foreach ($incomingRefs as $ref) {
                    $data = [
                        'type'         => $ref['type'],
                        'code'         => $ref['code'],
                        'source_brand' => $ref['source_brand'] ?? null,
                    ];

                    if (!empty($ref['id'])) {
                        // Update existing (scoped to this part)
                        $model = $part->references()->where('id', $ref['id'])->firstOrFail();
                        $model->fill($data)->save();
                        $keptRefIds[] = $model->id;
                    } else {
                        // Create or reuse by unique tuple to avoid dup constraint crash
                        $model = PartReference::firstOrNew([
                            'part_id' => $part->id,
                            'type'    => $data['type'],
                            'code'    => $data['code'],
                        ]);
                        $model->source_brand = $data['source_brand'];
                        $model->save();
                        $keptRefIds[] = $model->id;
                    }
                }

                // Delete any not present
                $part->references()->when(!empty($keptRefIds), fn($q) => $q->whereNotIn('id', $keptRefIds))->delete();

                $response['references'] = $part->references()->orderBy('id')->get();
            }

            // ----------------- FITMENTS -----------------
            if (array_key_exists('fitments', $validated)) {
                $incomingFits = collect($validated['fitments'] ?? []);

                // Guard: any provided id must belong to this part.
                if ($incomingFits->pluck('id')->filter()->isNotEmpty()) {
                    $foreignIds = $part->fitments()->whereIn('id', $incomingFits->pluck('id')->filter())->pluck('id')->all();
                    $invalidIds = $incomingFits->pluck('id')->filter()->diff($foreignIds);
                    if ($invalidIds->isNotEmpty()) {
                        abort(422, 'One or more fitment IDs do not belong to this part.');
                    }
                }

                $keptFitIds = [];

                foreach ($incomingFits as $fit) {
                    $data = [
                        'vehicle_model_id' => $fit['vehicle_model_id'],
                        'engine_code'      => $fit['engine_code'] ?? null,
                        'notes'            => $fit['notes'] ?? null,
                    ];

                    if (!empty($fit['id'])) {
                        // Update existing (scoped to this part)
                        $model = $part->fitments()->where('id', $fit['id'])->firstOrFail();
                        $model->fill($data)->save();
                        $keptFitIds[] = $model->id;
                    } else {
                        // Use firstOrNew on (vehicle_model_id, engine_code) to respect unique constraint
                        $model = PartFitment::firstOrNew([
                            'part_id'          => $part->id,
                            'vehicle_model_id' => $data['vehicle_model_id'],
                            'engine_code'      => $data['engine_code'], // can be null; that's OK with unique if defined accordingly
                        ]);
                        $model->notes = $data['notes'];
                        $model->save();
                        $keptFitIds[] = $model->id;
                    }
                }

                // Delete any not present
                $part->fitments()->when(!empty($keptFitIds), fn($q) => $q->whereNotIn('id', $keptFitIds))->delete();

                $response['fitments'] = $part->fitments()->with(['vehicleModel:id,name,year_from,year_to'])->orderBy('id')->get();
            }

            // Return consolidated fresh relations (only what was touched)
            return response()->json($response + [
                'part_id' => $part->id,
            ]);
        });
    }



    /**
     * Validate full payload and split into sections.
     */
    private function validateWhole(Request $req, ?int $id = null): array
    {
        // core fields
        $core = $req->validate([
            'manufacturer_id'  => ['nullable', 'integer', 'exists:manufacturers,id'],
            'category_id'      => ['required', 'integer', 'exists:categories,id'],
            'sku'              => [
                'nullable',
                'string',
                'max:80',
                Rule::unique('parts', 'sku')->ignore($id),
            ],
            'name'             => ['required', 'string', 'max:255'],
            'description'      => ['nullable', 'string'],
            'package_qty'      => ['required', 'integer', 'min:1'],
            'min_order_qty'    => ['required', 'integer', 'min:1'],
            'price_retail'     => ['nullable', 'numeric', 'min:0'],
            'price_demi_gros'  => ['nullable', 'numeric', 'min:0'],
            'price_gros'       => ['nullable', 'numeric', 'min:0'],
            'min_qty_gros'     => ['required', 'integer', 'min:1'],
            'is_active'        => ['required', 'boolean'],
        ]);

        // images (optional; if present we replace fully)
        if ($req->has('images')) {
            $images = collect($req->validate([
                'images'              => ['sometimes', 'array'],
                'images.*.url'        => ['nullable', 'string', 'max:1024'],
                'images.*.sort_order' => ['nullable', 'integer'],
            ])['images'] ?? [])
                ->map(fn($i) => [
                    'url'        => $i['url'] ?? null,
                    'sort_order' => $i['sort_order'] ?? 0,
                ])
                ->filter(fn($i) => $i['url'])   // drop empty entries if you want
                ->sortBy('sort_order')
                ->values()
                ->all();
        }

        // references (optional; if present we replace fully)
        $references = null;
        if ($req->has('references')) {
            $references = $req->validate([
                'references'                 => ['sometimes', 'array'],
                'references.*.id'            => ['nullable', 'integer', 'exists:part_references,id'],
                'references.*.type'          => ['nullable', Rule::in(['OEM', 'AFTERMARKET', 'SUPPLIER', 'EAN_UPC', 'OTHER'])],
                'references.*.code'          => ['nullable', 'string', 'max:120'],
                'references.*.source_brand'  => ['nullable', 'string', 'max:120'],
            ])['references'] ?? [];
        }

        // fitments (optional; if present we replace fully)
        $fitments = null;
        if ($req->has('fitments')) {
            $fitments = $req->validate([
                'fitments'                     => ['sometimes', 'array'],
                'fitments.*.id'                => ['nullable', 'integer', 'exists:part_fitments,id'],
                'fitments.*.vehicle_model_id'  => ['nullable', 'integer', 'exists:vehicle_models,id'],
                'fitments.*.engine_code'       => ['nullable', 'string', 'max:64'],
                'fitments.*.notes'             => ['nullable', 'string', 'max:255'],
            ])['fitments'] ?? [];
        }

        return array_filter([
            'core'       => $core,
            'images'     => $images,
            'references' => $references,
            'fitments'   => $fitments,
        ], fn($v) => $v !== null);
    }

    /**
     * Upsert references and delete the rest (scoped to this part).
     */
    private function upsertReferences(Part $part, Collection $incoming): void
    {
        // Guard: ensure given IDs belong to this part
        $ids = $incoming->pluck('id')->filter();
        if ($ids->isNotEmpty()) {
            $own = $part->references()->whereIn('id', $ids)->pluck('id');
            $invalid = $ids->diff($own);
            if ($invalid->isNotEmpty()) abort(422, 'One or more reference IDs do not belong to this part.');
        }

        $keep = [];
        foreach ($incoming as $ref) {
            $data = [
                'type'        => $ref['type'],
                'code'        => $ref['code'],
                'source_brand' => $ref['source_brand'] ?? null,
            ];

            if (!empty($ref['id'])) {
                $model = $part->references()->where('id', $ref['id'])->firstOrFail();
                $model->fill($data)->save();
                $keep[] = $model->id;
            } else {
                $model = \App\Models\PartReference::firstOrNew([
                    'part_id' => $part->id,
                    'type'    => $data['type'],
                    'code'    => $data['code'],
                ]);
                $model->source_brand = $data['source_brand'];
                $model->save();
                $keep[] = $model->id;
            }
        }

        $part->references()->when(!empty($keep), fn($q) => $q->whereNotIn('id', $keep))->delete();
    }

    /**
     * Upsert fitments and delete the rest (scoped to this part).
     */
    private function upsertFitments(Part $part, Collection $incoming): void
    {
        // Guard: ensure given IDs belong to this part
        $ids = $incoming->pluck('id')->filter();
        if ($ids->isNotEmpty()) {
            $own = $part->fitments()->whereIn('id', $ids)->pluck('id');
            $invalid = $ids->diff($own);
            if ($invalid->isNotEmpty()) abort(422, 'One or more fitment IDs do not belong to this part.');
        }

        $keep = [];
        foreach ($incoming as $fit) {
            $data = [
                'vehicle_model_id' => $fit['vehicle_model_id'],
                'engine_code'      => $fit['engine_code'] ?? null,
                'notes'            => $fit['notes'] ?? null,
            ];

            if (!empty($fit['id'])) {
                $model = $part->fitments()->where('id', $fit['id'])->firstOrFail();
                $model->fill($data)->save();
                $keep[] = $model->id;
            } else {
                $model = \App\Models\PartFitment::firstOrNew([
                    'part_id'          => $part->id,
                    'vehicle_model_id' => $data['vehicle_model_id'],
                    'engine_code'      => $data['engine_code'],
                ]);
                $model->notes = $data['notes'];
                $model->save();
                $keep[] = $model->id;
            }
        }

        $part->fitments()->when(!empty($keep), fn($q) => $q->whereNotIn('id', $keep))->delete();
    }

    public function updateActive(Request $req, Part $part)
    {
        $data = $req->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $part->is_active = $data['is_active'];
        $part->save();

        return response()->json([
            'ok'        => true,
            'id'        => $part->id,
            'is_active' => (bool)$part->is_active,
        ]);
    }
}
