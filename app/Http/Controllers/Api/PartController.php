<?php
// app/Http/Controllers/Api/PartController.php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Part;
use App\Models\PartReference;
use App\Models\PartFitment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Arr;
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
        $val = $this->validated($req);

        $part = Part::create($val);

        return response()->json(['id' => $part->id], 201);
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
                'source_brand'=> $r->source_brand,
            ]),
            'fitments' => $part->fitments->map(function (PartFitment $f) {
                return [
                    'id'               => $f->id,
                    'vehicle_model_id' => $f->vehicle_model_id,
                    'engine_code'      => $f->engine_code,
                    'notes'            => $f->notes,
                    'vehicle_brand'    => $f->vehicleModel?->vehicleBrand?->name,
                    'vehicle_model'    => $f->vehicleModel?->name,
                    'year_from'        => $f->vehicleModel?->year_from,
                    'year_to'          => $f->vehicleModel?->year_to,
                ];
            }),
        ]);
    }

    public function update(Request $req, Part $part)
    {
        $val = $this->validated($req, $part->id);
        $part->update($val);

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


    
}
