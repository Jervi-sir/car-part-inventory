<?php

namespace App\Http\Controllers\Client;

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

        // NOTE: parts table no longer has category_id or references; prices are TTC.
        $q = Part::query()
            ->with([
                'manufacturer:id,name',
                // for fitments -> models -> brands
                'fitments.vehicleModel.vehicleBrand:id,name',
            ])
            ->where('is_active', true)
            // manufacturer filter
            ->when(
                $req->filled('manufacturer_id') && $req->manufacturer_id !== 'all',
                fn($x) => $x->where('manufacturer_id', (int)$req->manufacturer_id)
            )
            // brand filter (via fitments)
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
            // model filter (via fitments)
            ->when($req->filled('vehicle_model_id') && $req->vehicle_model_id !== 'all', function ($x) use ($req) {
                $modelId = (int)$req->vehicle_model_id;
                $x->whereExists(function ($s) use ($modelId) {
                    $s->select(DB::raw(1))
                        ->from('part_fitments as pf')
                        ->whereColumn('pf.part_id', 'parts.id')
                        ->where('pf.vehicle_model_id', $modelId);
                });
            })
            // search by name/sku/barcode/reference (reference is a column on parts in new schema)
            ->when($req->filled('q'), function ($x) use ($req) {
                $term = trim($req->q);
                $x->where(function ($w) use ($term) {
                    $w->where('parts.name', 'like', "%{$term}%")
                        ->orWhere('parts.sku', 'like', "%{$term}%")
                        ->orWhere('parts.barcode', 'like', "%{$term}%")
                        ->orWhere('parts.reference', 'like', "%{$term}%");
                });
            })
            ->orderByDesc('id');

        $total = (clone $q)->count();
        $rows  = $q->forPage($page, $perPage)->get();

        $data = $rows->map(function (Part $p) {
            // image: first from JSON
            $img = is_array($p->images ?? null) && !empty($p->images)
                ? ($p->images[0]['url'] ?? $p->images[0])
                : null;

            // models & brands
            $models = [];
            $brandsAssoc = [];
            foreach ($p->fitments as $f) {
                if ($vm = $f->vehicleModel) {
                    $models[] = $vm->name;
                    if ($b = $vm->vehicleBrand?->name) $brandsAssoc[$b] = true; // unique
                }
            }

            // map TTC prices to UI fields the frontend expects
            $priceRetail = $p->price_retail_ttc !== null ? (float)$p->price_retail_ttc : null;
            $priceGros   = $p->price_wholesale_ttc !== null ? (float)$p->price_wholesale_ttc : null;

            // synthesize min quantities since schema no longer has them
            $minOrderQty = 1;
            $minQtyGros  = 1;

            return [
                'id'              => $p->id,
                'sku'             => $p->sku,
                'name'            => $p->name,
                'image'           => $img,

                // keep manufacturer; no category in new schema
                'manufacturer'    => $p->manufacturer?->only(['id', 'name']),
                'category'        => null,

                // quantities & prices as expected by React table
                'min_order_qty'   => $minOrderQty,
                'min_qty_gros'    => $minQtyGros,
                'price_retail'    => $priceRetail,
                'price_demi_gros' => null,      // not in schema
                'price_gros'      => $priceGros,

                // lists
                'fitment_models'  => array_values($models),
                'fitment_brands'  => array_keys($brandsAssoc),

                // references array removed (no part_references table); keep empty list for UI
                'references'      => [],
            ];
        })->values();

        return response()->json([
            'data'     => $data,
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
        ]);
    }
}
