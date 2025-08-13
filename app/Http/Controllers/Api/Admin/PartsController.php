<?php

// file: app/Http/Controllers/Api/PartsController.php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Part;
use App\Models\PartPrice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PartsController extends Controller
{
    public function index(Request $request)
    {
        $query = Part::with(['category', 'manufacturer', 'prices', 'vehicleModels'])
            ->when($request->search, function ($q, $search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            })
            ->when($request->category_id, function ($q, $categoryId) {
                $q->where('category_id', $categoryId);
            })
            ->when($request->manufacturer_id, function ($q, $manufacturerId) {
                $q->where('manufacturer_id', $manufacturerId);
            });

        $perPage = $request->per_page ?? 10;
        $page = $request->page ?? 1;

        $parts = $query->paginate($perPage, ['*'], 'page', $page);

        // Build custom pagination response
        $pagination = [
            'current_page' => $parts->currentPage(),
            'previous_page' => $parts->currentPage() > 1 ? $parts->currentPage() - 1 : null,
            'next_page' => $parts->hasMorePages() ? $parts->currentPage() + 1 : null,
            'total_pages' => $parts->lastPage(),
            'total' => $parts->total(),
            'data' => $parts->items(),
        ];

        return response()->json($pagination);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'manufacturer_id' => 'nullable|exists:manufacturers,id',
            'sku' => 'nullable|string|max:80|unique:parts,sku',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'package_qty' => 'required|integer|min:1',
            'min_order_qty' => 'required|integer|min:1',
            'currency' => 'required|string|size:3',
            'base_price' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'prices' => 'array',
            'prices.*.price_tier_id' => 'required|exists:price_tiers,id',
            'prices.*.tier_id' => 'required|exists:price_tiers,id',
            'prices.*.min_qty' => 'required|integer|min:1',
            'prices.*.price' => 'required|numeric|min:0',
            'prices.*.currency' => 'required|string|size:3',
            'vehicle_model_ids' => 'array',
            'vehicle_model_ids.*' => 'exists:vehicle_models,id',
        ]);

        return DB::transaction(function () use ($validated) {
            $part = Part::create([
                'category_id' => $validated['category_id'],
                'manufacturer_id' => $validated['manufacturer_id'],
                'sku' => $validated['sku'],
                'name' => $validated['name'],
                'description' => $validated['description'],
                'package_qty' => $validated['package_qty'],
                'min_order_qty' => $validated['min_order_qty'],
                'currency' => $validated['currency'],
                'base_price' => $validated['base_price'],
                'is_active' => $validated['is_active'] ?? true,
            ]);

            if (!empty($validated['prices'])) {
                foreach ($validated['prices'] as $price) {
                    PartPrice::create([
                        'part_id' => $part->id,
                        'price_tier_id' => $price['price_tier_id'],
                        'tier_id' => $price['tier_id'],
                        'min_qty' => $price['min_qty'],
                        'price' => $price['price'],
                        'currency' => $price['currency'],
                    ]);
                }
            }

            if (!empty($validated['vehicle_model_ids'])) {
                $part->vehicleModels()->sync($validated['vehicle_model_ids']);
            }

            return response()->json($part->load(['category', 'manufacturer', 'prices', 'vehicleModels']), 201);
        });
    }

    public function update(Request $request, Part $part)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'manufacturer_id' => 'nullable|exists:manufacturers,id',
            'sku' => ['nullable', 'string', 'max:80', Rule::unique('parts', 'sku')->ignore($part->id)],
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'package_qty' => 'required|integer|min:1',
            'min_order_qty' => 'required|integer|min:1',
            'currency' => 'required|string|size:3',
            'base_price' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'prices' => 'array',
            'prices.*.price_tier_id' => 'required|exists:price_tiers,id',
            'prices.*.tier_id' => 'required|exists:price_tiers,id',
            'prices.*.min_qty' => 'required|integer|min:1',
            'prices.*.price' => 'required|numeric|min:0',
            'prices.*.currency' => 'required|string|size:3',
            'vehicle_model_ids' => 'array',
            'vehicle_model_ids.*' => 'exists:vehicle_models,id',
        ]);

        return DB::transaction(function () use ($validated, $part) {
            $part->update([
                'category_id' => $validated['category_id'],
                'manufacturer_id' => $validated['manufacturer_id'],
                'sku' => $validated['sku'],
                'name' => $validated['name'],
                'description' => $validated['description'],
                'package_qty' => $validated['package_qty'],
                'min_order_qty' => $validated['min_order_qty'],
                'currency' => $validated['currency'],
                'base_price' => $validated['base_price'],
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $part->prices()->delete();
            if (!empty($validated['prices'])) {
                foreach ($validated['prices'] as $price) {
                    PartPrice::create([
                        'part_id' => $part->id,
                        'price_tier_id' => $price['price_tier_id'],
                        'tier_id' => $price['tier_id'],
                        'min_qty' => $price['min_qty'],
                        'price' => $price['price'],
                        'currency' => $price['currency'],
                    ]);
                }
            }

            $part->vehicleModels()->sync($validated['vehicle_model_ids'] ?? []);

            return response()->json($part->load(['category', 'manufacturer', 'prices', 'vehicleModels']));
        });
    }

    public function destroy(Part $part)
    {
        $part->delete();
        return response()->json(null, 204);
    }
}
