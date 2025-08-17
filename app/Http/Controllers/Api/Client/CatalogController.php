<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Part;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function index(Request $req)
    {
        $perPage = max(1, min((int)$req->integer('per_page') ?: 12, 60));
        $page    = max(1, (int)$req->integer('page') ?: 1);

        $q = Part::query()
            ->with([
                'manufacturer:id,name',
                'category:id,name',
                // fitments -> vehicleModel -> vehicleBrand to build models/brands lists
                'fitments.vehicleModel.vehicleBrand:id,name',
                // references for the list
                'references:id,part_id,type,code,source_brand',
            ])
            ->where('is_active', true)
            ->when(
                $req->filled('category_id') && $req->category_id !== 'all',
                fn($x) =>
                $x->where('category_id', (int)$req->category_id)
            )
            ->when(
                $req->filled('manufacturer_id') && $req->manufacturer_id !== 'all',
                fn($x) =>
                $x->where('manufacturer_id', (int)$req->manufacturer_id)
            )
            ->when($req->filled('vehicle_brand_id') && $req->vehicle_brand_id !== 'all', function ($x) use ($req) {
                $brandId = (int)$req->vehicle_brand_id;
                $x->whereExists(function ($s) use ($brandId) {
                    $s->select(DB::raw(1))
                        ->from('part_fitments as pf')
                        ->join('vehicle_models as vm', 'vm.id', '=', 'pf.vehicle_model_id')
                        ->whereColumn('pf.part_id', 'parts.id')
                        ->where('vm.vehicle_brand_id', $brandId);
                });
            })
            ->when($req->filled('vehicle_model_id') && $req->vehicle_model_id !== 'all', function ($x) use ($req) {
                $modelId = (int)$req->vehicle_model_id;
                $x->whereExists(function ($s) use ($modelId) {
                    $s->select(DB::raw(1))
                        ->from('part_fitments as pf')
                        ->whereColumn('pf.part_id', 'parts.id')
                        ->where('pf.vehicle_model_id', $modelId);
                });
            })
            ->when($req->filled('q'), function ($x) use ($req) {
                $term = trim($req->q);
                $x->where(function ($w) use ($term) {
                    $w->where('parts.name', 'like', "%{$term}%")
                        ->orWhere('parts.sku', 'like', "%{$term}%")
                        ->orWhereExists(function ($s) use ($term) {
                            $s->select(DB::raw(1))
                                ->from('part_references as pr')
                                ->whereColumn('pr.part_id', 'parts.id')
                                ->where('pr.code', 'like', "%{$term}%");
                        });
                });
            })
            ->orderByDesc('id');

        $total = (clone $q)->count();
        $rows  = $q->forPage($page, $perPage)->get();

        $data = $rows->map(function (Part $p) {
            // image
            $img = is_array($p->images ?? null) && !empty($p->images) ? ($p->images[0]['url'] ?? $p->images[0]) : null;

            // models & brands
            $models = [];
            $brands = [];
            foreach ($p->fitments as $f) {
                $vm = $f->vehicleModel;
                if ($vm) {
                    $models[] = $vm->name;
                    $brandName = $vm->vehicleBrand?->name;
                    if ($brandName) $brands[$brandName] = true; // unique
                }
            }

            // references
            $refs = $p->references->map(fn($r) => [
                'type' => $r->type,
                'code' => $r->code,
                'source_brand' => $r->source_brand,
            ])->values();

            return [
                'id'              => $p->id,
                'sku'             => $p->sku,
                'name'            => $p->name,
                'image'           => $img,
                'manufacturer'    => $p->manufacturer?->only(['id', 'name']),
                'category'        => $p->category?->only(['id', 'name']),

                // quantities & prices
                'min_order_qty'   => $p->min_order_qty,
                'min_qty_gros'    => $p->min_qty_gros,
                'price_retail'    => $p->price_retail,
                'price_demi_gros' => $p->price_demi_gros,
                'price_gros'      => $p->price_gros,

                // lists
                'fitment_models'  => array_values($models),
                'fitment_brands'  => array_keys($brands),
                'references'      => $refs,
            ];
        });

        return response()->json([
            'data'     => $data,
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
        ]);
    }
}
