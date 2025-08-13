<?php

// file: app/Http/Controllers/Api/PriceTierController.php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PriceTier;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PriceTierController extends Controller
{
    /**
     * Display a listing of the price tiers.
     */
    public function index(Request $request)
    {
        $perPage = $request->query('per_page', 10);
        $page = $request->query('page', 1);
        
        $priceTiers = PriceTier::query()
            ->when($request->query('search'), function ($query, $search) {
                return $query->where('code', 'like', "%{$search}%")
                            ->orWhere('label', 'like', "%{$search}%");
            })
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json($priceTiers);
    }

    /**
     * Store a newly created price tier in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:24|unique:price_tiers,code',
            'label' => 'required|string|max:64',
        ]);

        $priceTier = PriceTier::create($validated);

        return response()->json($priceTier, 201);
    }

    /**
     * Update the specified price tier in storage.
     */
    public function update(Request $request, PriceTier $priceTier)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:24', Rule::unique('price_tiers', 'code')->ignore($priceTier->id)],
            'label' => 'required|string|max:64',
        ]);

        $priceTier->update($validated);

        return response()->json($priceTier);
    }

    /**
     * Remove the specified price tier from storage.
     */
    public function destroy(PriceTier $priceTier)
    {
        // Check if the price tier is referenced in part_prices
        if ($priceTier->partPrices()->exists()) {
            return response()->json(['error' => 'Cannot delete price tier with associated part prices'], 422);
        }

        $priceTier->delete();

        return response()->json(null, 204);
    }
}