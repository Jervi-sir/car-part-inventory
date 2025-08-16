<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientManufacturerController extends Controller
{
    /**
     * GET /api/client/manufacturers
     * Query params:
     *  - q: keyword (name like)
     *  - with_counts: bool (include active parts count)
     *  - has_parts: bool (only manufacturers that have >=1 active part)
     *  - per_page, page
     *  - order_by: name|parts_count  (requires with_counts for parts_count)
     *  - order_dir: asc|desc
     */
    public function index(Request $request)
    {
        $q        = trim((string) $request->input('q', ''));
        $withCnt  = filter_var($request->input('with_counts', false), FILTER_VALIDATE_BOOLEAN);
        $hasParts = filter_var($request->input('has_parts', false), FILTER_VALIDATE_BOOLEAN);
        $perPage  = max(1, (int) $request->integer('per_page', 1000));
        $page     = max(1, (int) $request->integer('page', 1));
        $orderBy  = $request->input('order_by', 'name');
        $orderDir = strtolower($request->input('order_dir', 'asc')) === 'desc' ? 'desc' : 'asc';

        $base = DB::table('manufacturers as m');

        if ($withCnt || $hasParts || $orderBy === 'parts_count') {
            $base->leftJoin('parts as p', function ($join) {
                $join->on('p.manufacturer_id', '=', 'm.id')->where('p.is_active', true);
            })->select('m.id','m.name', DB::raw('COUNT(p.id) as parts_count'))
              ->groupBy('m.id','m.name');
        } else {
            $base->select('m.id','m.name');
        }

        if ($q !== '') {
            $base->where('m.name', 'like', "%{$q}%");
        }

        if ($hasParts) {
            $base->havingRaw('COUNT(p.id) > 0');
        }

        if ($orderBy === 'parts_count') {
            if (!($withCnt || $hasParts)) {
                $base->leftJoin('parts as p2', function ($join) {
                    $join->on('p2.manufacturer_id', '=', 'm.id')->where('p2.is_active', true);
                })->selectRaw('COUNT(p2.id) as parts_count')->groupBy('m.id','m.name');
            }
            $base->orderBy('parts_count', $orderDir);
        } else {
            $base->orderBy('m.name', $orderDir);
        }

        $total = (clone $base)->count();
        $rows  = $base->forPage($page, $perPage)->get();

        return response()->json([
            'data'     => $rows->map(function ($r) use ($withCnt) {
                return [
                    'id'           => (int) $r->id,
                    'name'         => $r->name,
                    'parts_count'  => property_exists($r, 'parts_count') ? (int) $r->parts_count : ($withCnt ? 0 : null),
                ];
            }),
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
        ]);
    }
}
