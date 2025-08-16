<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientPartController extends Controller
{
    /** Resolve user's price tier id (or code->id). Falls back to RETAIL, then null */
    private function resolveUserTierId(int $userId): ?int
    {
        // If users table has price_tier_id, use it; otherwise fallback to RETAIL
        $tierId = DB::table('users')->where('id', $userId)->value('price_tier_id');
        if ($tierId) return (int) $tierId;

        $retail = DB::table('price_tiers')->where('code', 'RETAIL')->value('id');
        return $retail ? (int) $retail : null;
    }

    /** Best unit price for a part at qty, using tier when possible; else parts.base_price */
    private function unitPriceFor(int $partId, int $qty, ?int $tierId): array
    {
        $part = DB::table('parts')->where('id', $partId)->first(['base_price','currency']);
        $currency = $part->currency ?? 'DZD';
        $base = (float) ($part->base_price ?? 0);

        if ($tierId) {
            // pick best break where tier matches and min_qty <= qty; otherwise largest min_qty<=qty; otherwise min min_qty
            $row = DB::table('part_prices')
                ->where('part_id', $partId)
                ->where('tier_id', $tierId)
                ->where('currency', $currency)
                ->where('min_qty', '<=', $qty)
                ->orderByDesc('min_qty')
                ->first(['price']);

            if (!$row) {
                $row = DB::table('part_prices')
                    ->where('part_id', $partId)
                    ->where('tier_id', $tierId)
                    ->where('currency', $currency)
                    ->orderBy('min_qty')
                    ->first(['price']);
            }

            if ($row) return ['unit_price' => (float) $row->price, 'currency' => $currency, 'source' => 'tier'];
        }

        return ['unit_price' => $base, 'currency' => $currency, 'source' => 'base'];
    }

    /** GET /api/client/parts */
    public function index(Request $request)
    {
        $userId   = (int) $request->user()->id;
        $tierId   = $this->resolveUserTierId($userId);

        $perPage  = max(1, (int) $request->integer('per_page', 12));
        $page     = max(1, (int) $request->integer('page', 1));
        $catId    = $request->filled('category_id') ? (int) $request->input('category_id') : null;
        $manId    = $request->filled('manufacturer_id') ? (int) $request->input('manufacturer_id') : null;
        $isActive = $request->input('is_active', '1'); // default only active
        $kw       = trim((string) $request->input('keyword', ''));

        $q = DB::table('parts as p')
            ->leftJoin('categories as c', 'c.id', '=', 'p.category_id')
            ->leftJoin('manufacturers as m', 'm.id', '=', 'p.manufacturer_id')
            ->where('p.is_active', filter_var($isActive, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true);

        if ($catId) $q->where('p.category_id', $catId);
        if ($manId) $q->where('p.manufacturer_id', $manId);

        if ($kw !== '') {
            $q->where(function ($w) use ($kw) {
                $w->where('p.sku', 'like', "%{$kw}%")
                  ->orWhere('p.name', 'like', "%{$kw}%")
                  ->orWhere('c.name', 'like', "%{$kw}%")
                  ->orWhere('m.name', 'like', "%{$kw}%")
                  ->orWhereExists(function ($sub) use ($kw) {
                      $sub->from('part_references as pr')
                          ->whereColumn('pr.part_id', 'p.id')
                          ->where('pr.reference_code', 'like', "%{$kw}%");
                  });
            });
        }

        $total = (clone $q)->count('p.id');

        // Pull basic rows
        $rows = $q->orderBy('p.name')
            ->forPage($page, $perPage)
            ->get([
                'p.id', 'p.sku', 'p.name', 'p.base_price', 'p.currency',
                'p.package_qty', 'p.min_order_qty',
                'c.id as c_id', 'c.name as c_name',
                'm.id as m_id', 'm.name as m_name',
            ]);

        // Attach first image & unit price per row (qty=1 for catalog)
        $data = $rows->map(function ($r) use ($tierId) {
            $img = DB::table('part_images')->where('part_id', $r->id)->orderBy('sort_order')->orderBy('id')->value('url');

            $price = $this->unitPriceFor((int) $r->id, 1, $tierId);

            return [
                'id'           => (int) $r->id,
                'sku'          => $r->sku,
                'name'         => $r->name,
                'category'     => $r->c_id ? ['id' => (int) $r->c_id, 'name' => $r->c_name] : null,
                'manufacturer' => $r->m_id ? ['id' => (int) $r->m_id, 'name' => $r->m_name] : null,
                'image_url'    => $img,
                'unit_price'   => $price['unit_price'],
                'currency'     => $price['currency'],
                'package_qty'  => (int) ($r->package_qty ?? 1),
                'min_order_qty'=> (int) ($r->min_order_qty ?? 1),
            ];
        })->values();

        return response()->json([
            'data'     => $data,
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
        ]);
    }

    /** GET /api/client/parts/{id} */
    public function show(Request $request, int $id)
    {
        $userId = (int) $request->user()->id;
        $tierId = $this->resolveUserTierId($userId);

        $part = DB::table('parts as p')
            ->leftJoin('categories as c', 'c.id', '=', 'p.category_id')
            ->leftJoin('manufacturers as m', 'm.id', '=', 'p.manufacturer_id')
            ->where('p.id', $id)
            ->where('p.is_active', true)
            ->first([
                'p.id', 'p.sku', 'p.name', 'p.description', 'p.currency', 'p.base_price',
                'p.package_qty', 'p.min_order_qty',
                'c.id as c_id', 'c.name as c_name',
                'm.id as m_id', 'm.name as m_name',
            ]);

        if (!$part) return response()->json(['message' => 'Not found'], 404);

        // Pricing preview (qty=1 by default; allow ?qty=)
        $qty = max(1, (int) $request->integer('qty', 1));
        $price = $this->unitPriceFor((int) $part->id, $qty, $tierId);

        $images = DB::table('part_images')
            ->where('part_id', $id)
            ->orderBy('sort_order')->orderBy('id')
            ->get(['id','url','sort_order']);

        $refsRows = DB::table('part_references as pr')
            ->join('part_reference_types as t', 't.id', '=', 'pr.part_reference_type_id')
            ->where('pr.part_id', $id)
            ->orderBy('t.code')->orderBy('pr.reference_code')
            ->get(['pr.id','pr.reference_code','pr.source_brand','t.code as type_code','t.label as type_label']);

        // Group references by type_code
        $references = [];
        foreach ($refsRows as $r) {
            $references[$r->type_code][] = [
                'id' => (int) $r->id,
                'reference_code' => $r->reference_code,
                'source_brand' => $r->source_brand,
                'type_label' => $r->type_label,
            ];
        }

        $fitments = DB::table('part_fitments as f')
            ->join('vehicle_models as vm', 'vm.id', '=', 'f.vehicle_model_id')
            ->join('vehicle_brands as vb', 'vb.id', '=', 'vm.vehicle_brand_id')
            ->where('f.part_id', $id)
            ->orderBy('vb.name')->orderBy('vm.name')
            ->get([
                'f.id', 'vb.name as brand', 'vm.name as model',
                'vm.year_from', 'vm.year_to',
                'f.engine_code', 'f.notes'
            ]);

        return response()->json([
            'id'            => (int) $part->id,
            'sku'           => $part->sku,
            'name'          => $part->name,
            'description'   => $part->description,
            'category'      => $part->c_id ? ['id' => (int) $part->c_id, 'name' => $part->c_name] : null,
            'manufacturer'  => $part->m_id ? ['id' => (int) $part->m_id, 'name' => $part->m_name] : null,
            'unit_price'    => $price['unit_price'],
            'currency'      => $price['currency'],
            'package_qty'   => (int) ($part->package_qty ?? 1),
            'min_order_qty' => (int) ($part->min_order_qty ?? 1),
            'images'        => $images,
            'references'    => $references,
            'fitments'      => $fitments,
        ]);
    }
}
