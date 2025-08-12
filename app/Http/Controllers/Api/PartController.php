<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Arr;
use App\Http\Controllers\Controller;

class PartController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->integer('per_page', 10) ?: 10;
        $page    = (int) $request->integer('page', 1) ?: 1;

        $q = DB::table('parts as p')
            ->leftJoin('categories as c', 'c.id', '=', 'p.category_id')
            ->leftJoin('manufacturers as m', 'm.id', '=', 'p.manufacturer_id')
            ->selectRaw(
                "p.id, p.sku, p.name, p.base_price, p.currency, p.is_active,
                json_build_object('id', c.id, 'name', c.name) as category,
                json_build_object('id', m.id, 'name', m.name) as manufacturer"
            );
        if ($request->filled('category_id')) {
            $q->where('p.category_id', $request->input('category_id'));
        }
        if ($request->filled('manufacturer_id')) {
            $q->where('p.manufacturer_id', $request->input('manufacturer_id'));
        }
        if ($request->filled('is_active') && in_array($request->input('is_active'), ['0', '1', 0, 1], true)) {
            $q->where('p.is_active', (bool) $request->input('is_active'));
        }
        if ($sku = trim((string)$request->input('sku'))) {
            $q->where('p.sku', 'like', "%{$sku}%");
        }
        if ($ref = trim((string)$request->input('reference_code'))) {
            $q->whereExists(function ($sub) use ($ref) {
                $sub->from('part_references as pr')
                    ->whereColumn('pr.part_id', 'p.id')
                    ->where('pr.reference_code', 'like', "%{$ref}%");
            });
        }

        $total = (clone $q)->count();
        $rows  = $q->orderBy('p.id', 'desc')
            ->forPage($page, $perPage)
            ->get();

        return response()->json([
            'data'     => $rows,
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateCore($request);

        $id = DB::table('parts')->insertGetId([
            'category_id'    => $data['category_id'],
            'manufacturer_id' => $data['manufacturer_id'],
            'sku'            => $data['sku'],
            'name'           => $data['name'],
            'description'    => $data['description'],
            'package_qty'    => $data['package_qty'],
            'min_order_qty'  => $data['min_order_qty'],
            'currency'       => $data['currency'],
            'base_price'     => $data['base_price'],
            'is_active'      => $data['is_active'],
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function show($id)
    {
        $part = DB::table('parts')->where('id', $id)->first();
        if (!$part) return response()->json(['message' => 'Not found'], 404);

        $images = DB::table('part_images')
            ->where('part_id', $id)
            ->orderBy('sort_order')->orderBy('id')
            ->get(['id', 'url', 'sort_order']);

        $references = DB::table('part_references as pr')
            ->join('part_reference_types as t', 't.id', '=', 'pr.part_reference_type_id')
            ->where('pr.part_id', $id)
            ->orderBy('pr.id')
            ->get([
                'pr.id',
                'pr.part_reference_type_id',
                'pr.reference_code',
                'pr.source_brand',
                't.code as type_code',
                't.label as type_label'
            ]);

        // include vehicle_brand_id for editor convenience
        $fitments = DB::table('part_fitments as f')
            ->join('vehicle_models as vm', 'vm.id', '=', 'f.vehicle_model_id')
            ->join('vehicle_brands as vb', 'vb.id', '=', 'vm.vehicle_brand_id')
            ->where('f.part_id', $id)
            ->orderBy('f.id')
            ->get([
                'f.id',
                'vm.vehicle_brand_id',
                'f.vehicle_model_id',
                'f.engine_code',
                'f.notes'
            ]);

        return response()->json([
            'part'       => $part,
            'images'     => $images,
            'references' => $references,
            'fitments'   => $fitments,
        ]);
    }

    public function update(Request $request, $id)
    {
        $exists = DB::table('parts')->where('id', $id)->exists();
        if (!$exists) return response()->json(['message' => 'Not found'], 404);

        $data = $this->validateCore($request, $id);

        DB::table('parts')->where('id', $id)->update([
            'category_id'    => $data['category_id'],
            'manufacturer_id' => $data['manufacturer_id'],
            'sku'            => $data['sku'],
            'name'           => $data['name'],
            'description'    => $data['description'],
            'package_qty'    => $data['package_qty'],
            'min_order_qty'  => $data['min_order_qty'],
            'currency'       => $data['currency'],
            'base_price'     => $data['base_price'],
            'is_active'      => $data['is_active'],
            'updated_at'     => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function destroy($id)
    {
        $deleted = DB::table('parts')->where('id', $id)->delete();
        return response()->json(['deleted' => (bool) $deleted]);
    }

    public function bulkStatus(Request $request)
    {
        $validated = $request->validate([
            'ids'       => ['required', 'array', 'min:1'],
            'ids.*'     => ['integer', 'distinct'],
            'is_active' => ['required', 'boolean'],
        ]);

        DB::table('parts')->whereIn('id', $validated['ids'])->update([
            'is_active'  => $validated['is_active'],
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true, 'count' => count($validated['ids'])]);
    }

    public function syncImages(Request $request, $id)
    {
        $exists = DB::table('parts')->where('id', $id)->exists();
        if (!$exists) return response()->json(['message' => 'Not found'], 404);

        $validated = $request->validate([
            'images'             => ['required', 'array'],
            'images.*.id'        => ['nullable', 'integer'],
            'images.*.url'       => ['required', 'url'],
            'images.*.sort_order' => ['nullable', 'integer'],
        ]);

        $incoming = collect($validated['images'])->values();
        $incomingIds = $incoming->pluck('id')->filter()->all();

        // delete removed
        DB::table('part_images')
            ->where('part_id', $id)
            ->when(count($incomingIds) > 0, fn($q) => $q->whereNotIn('id', $incomingIds))
            ->delete();

        // upsert & reorder by provided index
        foreach ($incoming as $idx => $img) {
            $payload = [
                'part_id'    => (int) $id,
                'url'        => $img['url'],
                'sort_order' => $idx,
                'updated_at' => now(),
            ];
            if (!empty($img['id'])) {
                DB::table('part_images')->where('id', $img['id'])->update($payload);
            } else {
                $payload['created_at'] = now();
                DB::table('part_images')->insert($payload);
            }
        }

        return response()->json(['ok' => true]);
    }

    public function syncReferences(Request $request, $id)
    {
        $exists = DB::table('parts')->where('id', $id)->exists();
        if (!$exists) return response()->json(['message' => 'Not found'], 404);

        $validated = $request->validate([
            'references'                              => ['required', 'array'],
            'references.*.id'                         => ['nullable', 'integer'],
            'references.*.part_reference_type_id'     => ['required', 'integer', 'exists:part_reference_types,id'],
            'references.*.reference_code'             => ['required', 'string', 'max:120'],
            'references.*.source_brand'               => ['nullable', 'string', 'max:120'],
        ]);

        $incoming = collect($validated['references'])->map(function ($r) {
            return [
                'id'                       => Arr::get($r, 'id'),
                'part_reference_type_id'   => (int) $r['part_reference_type_id'],
                'reference_code'           => trim($r['reference_code']),
                'source_brand'             => $r['source_brand'] !== null && $r['source_brand'] !== '' ? trim($r['source_brand']) : null,
            ];
        });

        $incomingIds = $incoming->pluck('id')->filter()->all();

        // delete removed
        DB::table('part_references')
            ->where('part_id', $id)
            ->when(count($incomingIds) > 0, fn($q) => $q->whereNotIn('id', $incomingIds))
            ->delete();

        // upsert keeping uniqueness (part_id, part_reference_type_id, reference_code)
        foreach ($incoming as $r) {
            $payload = [
                'part_id'                   => (int) $id,
                'part_reference_type_id'    => $r['part_reference_type_id'],
                'reference_code'            => $r['reference_code'],
                'source_brand'              => $r['source_brand'],
                'updated_at'                => now(),
            ];

            if (!empty($r['id'])) {
                DB::table('part_references')->where('id', $r['id'])->update($payload);
            } else {
                $payload['created_at'] = now();

                // prevent duplicate insert hitting unique index
                $existing = DB::table('part_references')
                    ->where('part_id', $id)
                    ->where('part_reference_type_id', $r['part_reference_type_id'])
                    ->where('reference_code', $r['reference_code'])
                    ->first();

                if ($existing) {
                    DB::table('part_references')->where('id', $existing->id)->update($payload);
                } else {
                    DB::table('part_references')->insert($payload);
                }
            }
        }

        return response()->json(['ok' => true]);
    }

    public function syncFitments(Request $request, $id)
    {
        $exists = DB::table('parts')->where('id', $id)->exists();
        if (!$exists) return response()->json(['message' => 'Not found'], 404);

        $validated = $request->validate([
            'fitments'                   => ['required', 'array'],
            'fitments.*.id'              => ['nullable', 'integer'],
            'fitments.*.vehicle_model_id' => ['required', 'integer', 'exists:vehicle_models,id'],
            'fitments.*.engine_code'     => ['nullable', 'string', 'max:64'],
            'fitments.*.notes'           => ['nullable', 'string', 'max:255'],
        ]);

        $incoming = collect($validated['fitments'])->map(function ($f) {
            return [
                'id'               => Arr::get($f, 'id'),
                'vehicle_model_id' => (int) $f['vehicle_model_id'],
                'engine_code'      => $f['engine_code'] ?? null,
                'notes'            => $f['notes'] ?? null,
            ];
        });

        $incomingIds = $incoming->pluck('id')->filter()->all();

        // delete removed
        DB::table('part_fitments')
            ->where('part_id', $id)
            ->when(count($incomingIds) > 0, fn($q) => $q->whereNotIn('id', $incomingIds))
            ->delete();

        // upsert honoring unique(part_id, vehicle_model_id, engine_code)
        foreach ($incoming as $f) {
            $payload = [
                'part_id'         => (int) $id,
                'vehicle_model_id' => $f['vehicle_model_id'],
                'engine_code'     => $f['engine_code'],
                'notes'           => $f['notes'],
                'updated_at'      => now(),
            ];

            if (!empty($f['id'])) {
                DB::table('part_fitments')->where('id', $f['id'])->update($payload);
            } else {
                $payload['created_at'] = now();

                $existsUnique = DB::table('part_fitments')
                    ->where('part_id', $id)
                    ->where('vehicle_model_id', $f['vehicle_model_id'])
                    ->where(function ($q) use ($f) {
                        // handle NULL uniqueness for engine_code
                        if ($f['engine_code'] === null) $q->whereNull('engine_code');
                        else $q->where('engine_code', $f['engine_code']);
                    })->exists();

                if ($existsUnique) {
                    // update the existing row (fetch id first)
                    $row = DB::table('part_fitments')
                        ->where('part_id', $id)
                        ->where('vehicle_model_id', $f['vehicle_model_id'])
                        ->where(function ($q) use ($f) {
                            if ($f['engine_code'] === null) $q->whereNull('engine_code');
                            else $q->where('engine_code', $f['engine_code']);
                        })->first();

                    DB::table('part_fitments')->where('id', $row->id)->update($payload);
                } else {
                    DB::table('part_fitments')->insert($payload);
                }
            }
        }

        return response()->json(['ok' => true]);
    }

    private function validateCore(Request $request, $id = null): array
    {
        // sku is nullable unique (MySQL allows many NULLs)
        return $request->validate([
            'category_id'    => ['required', 'integer', 'exists:categories,id'],
            'manufacturer_id' => ['nullable', 'integer', 'exists:manufacturers,id'],
            'sku'            => [
                'nullable',
                'string',
                'max:80',
                Rule::unique('parts', 'sku')->ignore($id)->whereNull('deleted_at') // if you use soft deletes later
            ],
            'name'           => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'package_qty'    => ['required', 'integer', 'min:1'],
            'min_order_qty'  => ['required', 'integer', 'min:1'],
            'currency'       => ['required', 'string', 'size:3'],
            'base_price'     => ['nullable', 'numeric', 'min:0'],
            'is_active'      => ['required', 'boolean'],
        ]);
    }
}
