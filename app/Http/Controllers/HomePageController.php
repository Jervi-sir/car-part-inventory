<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Order;
use App\Models\Part;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HomePageController extends Controller
{
    public function home()
    {
        return Inertia::render('client/welcome/landing/page');
    }

    public function terms()
    {
        return Inertia::render('client/welcome/legal-page', [
            'type' => 'terms',
            'updatedAt' => now()->toDateString(),
            'company' => [
                'name' => 'Rafiki-Motors DZ',
                'country' => 'Algeria',
                'legalEmail' => 'support@.com',
                'address' => '—',
            ],
        ]);
    }

    public function privacy()
    {
        return Inertia::render('client/welcome/legal-page', [
            'type' => 'privacy',
            'updatedAt' => now()->toDateString(),
            'company' => [
                'name' => 'Rafiki-Motors DZ',
                'country' => 'Algeria',
                'legalEmail' => 'support@.com',
                'address' => '—',
            ],
        ]);
    }


    public function publicStatus()
    {
        // Cache for 10 minutes
        $data = Cache::remember('public_stats_v1', 600, function () {
            // 1) Acheteurs vérifiés
            // If you have buyer role mapping, filter it here (e.g., role=0):
            $verifiedBuyers = User::query()
                // ->where('role', 0) // uncomment if 0 = buyer
                ->where('is_verified', true)
                ->count();

            // 2) Entrepôts & points de retrait
            // No table provided. Read from config/env to avoid schema changes:
            // In config/app.php add: 'stats' => ['warehouse_count' => (int) env('STATS_WAREHOUSE_COUNT', 2)]
            $warehousesAndPickups = (int) 1;

            // 3) Clients servis = distinct users who completed at least one order
            $clientsServed = Order::query()
                ->where('status', 'completed')
                ->distinct('user_id')
                ->count('user_id');

            // 4) Références de pièces
            // Count only active parts; if you want only parts with stock > 0, add where('stock_available', '>', 0)
            $partReferences = Part::query()
                ->where('is_active', true)
                ->count();

            return [
                'verified_buyers' => $verifiedBuyers,
                'warehouses_pickups' => $warehousesAndPickups,
                'clients_served' => $clientsServed,
                'part_references' => $partReferences,
                // Optionally expose a “last_updated” for front-end revalidation
                'last_updated_iso' => now()->toIso8601String(),
            ];
        });

        return response()->json($data);
    }

}
