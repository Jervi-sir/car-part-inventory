<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    private function parseRange(Request $request): array
    {
        $range = $request->query('range', '30d');
        $end = Carbon::today();
        switch ($range) {
            case '7d':
                $start = $end->copy()->subDays(6);
                break;
            case '30d':
                $start = $end->copy()->subDays(29);
                break;
            case '90d':
                $start = $end->copy()->subDays(89);
                break;
            case 'ytd':
                $start = Carbon::create($end->year, 1, 1);
                break;
            default:
                $start = $end->copy()->subDays(29);
                break;
        }
        return [$start->startOfDay(), $end->endOfDay()];
    }

    public function index()
    {
        return Inertia::render('admin/analytics/page');
    }

    public function kpis(Request $request)
    {
        [$start, $end] = $this->parseRange($request);
        // Revenue: completed orders only
        $revenue = DB::table('orders')
            ->where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->sum('grand_total');

        // Orders: non-cart in range
        $orders = DB::table('orders')
            ->where('status', '!=', 'cart')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        // Units sold on completed orders
        $units = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->where('o.status', 'completed')
            ->whereBetween('o.created_at', [$start, $end])
            ->sum('oi.quantity');

        $aov = $orders > 0 ? round($revenue / $orders, 2) : 0;

        return response()->json([
            'revenue' => (float) $revenue,
            'orders'  => (int) $orders,
            'aov'     => (float) $aov,
            'units'   => (int) $units,
        ]);
    }

    public function revenueSeries(Request $request)
    {
        [$start, $end] = $this->parseRange($request);
        $rows = DB::table('orders')
            ->selectRaw('DATE(created_at) as date, SUM(grand_total) as value')
            ->where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        // ensure continuity over range
        $map = $rows->keyBy('date');
        $cursor = $start->copy();
        $out = [];
        while ($cursor <= $end) {
            $d = $cursor->toDateString();
            $out[] = ['date' => $d, 'value' => (float) ($map[$d]->value ?? 0)];
            $cursor->addDay();
        }
        return response()->json($out);
    }

    public function ordersByStatus(Request $request)
    {
        [$start, $end] = $this->parseRange($request);
        $rows = DB::table('orders')
            ->select('status', DB::raw('COUNT(*) as count'))
            ->where('status', '!=', 'cart')
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('status')
            ->get();
        return response()->json($rows);
    }

    public function topManufacturers(Request $request)
    {
        [$start, $end] = $this->parseRange($request);
        $limit = (int) $request->query('limit', 10);

        $rows = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('parts as p', 'p.id', '=', 'oi.part_id')
            ->leftJoin('manufacturers as m', 'm.id', '=', 'p.manufacturer_id')
            ->where('o.status', '=', 'completed')
            ->whereBetween('o.created_at', [$start, $end])
            ->groupBy('m.id', 'm.name')
            ->orderByDesc(DB::raw('SUM(oi.line_total)'))
            ->limit($limit)
            ->get([
                DB::raw("COALESCE(NULLIF(TRIM(m.name), ''), 'Unknown') AS name"),
                DB::raw('SUM(oi.line_total) AS value'),
            ]);

        return response()->json($rows);
    }

    public function topBrands(Request $request)
    {
        [$start, $end] = $this->parseRange($request);
        $limit = (int) $request->query('limit', 10);
        $rows = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('parts as p', 'p.id', '=', 'oi.part_id')
            ->join('part_fitments as pf', 'pf.part_id', '=', 'p.id')
            ->join('vehicle_models as vm', 'vm.id', '=', 'pf.vehicle_model_id')
            ->join('vehicle_brands as vb', 'vb.id', '=', 'vm.vehicle_brand_id')
            ->where('o.status', 'completed')
            ->whereBetween('o.created_at', [$start, $end])
            ->groupBy('vb.id', 'vb.name')
            ->orderByDesc(DB::raw('SUM(oi.line_total)'))
            ->limit($limit)
            ->get([
                'vb.name as name',
                DB::raw('SUM(oi.line_total) as value'),
            ]);
        return response()->json($rows);
    }

    public function topParts(Request $request)
    {
        [$start, $end] = $this->parseRange($request);
        $limit = (int) $request->query('limit', 10);

        $rows = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('parts as p', 'p.id', '=', 'oi.part_id')
            ->where('o.status', 'completed') // <- quoted correctly by builder
            ->whereBetween('o.created_at', [$start, $end])
            ->groupBy('p.id', 'p.name')
            ->orderByDesc(DB::raw('SUM(oi.line_total)'))
            ->limit($limit)
            ->get([
                DB::raw("COALESCE(NULLIF(p.name, ''), 'Part #' || p.id::text) as name"),
                DB::raw('SUM(oi.line_total) as value'),
            ]);

        return response()->json($rows);
    }

    public function adClicksByPlacement(Request $request)
    {
        [$start, $end] = $this->parseRange($request);

        $rows = DB::table('ad_clicks')
            ->selectRaw("
            DATE(created_at) AS date,
            COALESCE(NULLIF(placement, ''), 'unknown') AS placement,
            COUNT(*) AS clicks
        ")
            ->whereBetween('created_at', [$start, $end])
            // must repeat the same expressions used in SELECT for PG:
            ->groupBy(
                DB::raw('DATE(created_at)'),
                DB::raw("COALESCE(NULLIF(placement, ''), 'unknown')")
            )
            ->orderBy('date')
            ->get();

        return response()->json($rows);
    }

    public function topCreativesClicks(Request $request)
    {
        [$start, $end] = $this->parseRange($request);
        $limit = (int) $request->query('limit', 10);

        $rows = DB::table('ad_clicks as c')
            ->join('ad_creatives as a', 'a.id', '=', 'c.creative_id')
            ->whereBetween('c.created_at', [$start, $end])
            ->groupBy('a.id', 'a.title')
            ->orderByDesc(DB::raw('COUNT(*)'))
            ->limit($limit)
            ->get([
                // prefer TRIM in case of titles with spaces
                DB::raw("COALESCE(NULLIF(TRIM(a.title), ''), 'Creative #' || a.id::text) AS name"),
                DB::raw('COUNT(*) AS value'),
            ]);

        return response()->json($rows);
    }
}
