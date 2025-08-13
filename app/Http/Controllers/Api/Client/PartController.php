<?php

namespace App\Http\Controllers\Api\Client;
use App\Http\Controllers\Controller;
use App\Models\Part;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PartController extends Controller
{
    // Render the Inertia UI
    public function index()
    {
        return Inertia::render('client/parts/page', [
            'initialData' => [
                'per_page' => 12,
                'current_page' => 1,
            ],
        ]);
    }

    // API: List parts with filters and pagination
    public function list(Request $request)
    {
        $query = Part::with(['category', 'images', 'vehicleModels'])
            ->where('is_active', true)
            ->when($request->search, function ($q, $search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            })
            ->when($request->brand_id, function ($q, $brandId) {
                $q->whereHas('vehicleModels', function ($q) use ($brandId) {
                    $q->where('vehicle_brand_id', $brandId);
                });
            })
            ->when($request->model_id, function ($q, $modelId) {
                $q->whereHas('vehicleModels', function ($q) use ($modelId) {
                    $q->where('vehicle_model_id', $modelId);
                });
            })
            ->when($request->category_id, function ($q, $categoryId) {
                $q->where('category_id', $categoryId);
            });

        $perPage = $request->per_page ?? 12;
        $page = $request->page ?? 1;

        $parts = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $parts->items(),
            'total' => $parts->total(),
            'current_page' => $parts->currentPage(),
            'per_page' => $parts->perPage(),
        ]);
    }

    // API: Get vehicle brands
    public function brands()
    {
        return response()->json(
            VehicleBrand::select('id', 'name')->orderBy('name')->get()
        );
    }

    // API: Get vehicle models (optionally filtered by brand_id)
    public function models(Request $request)
    {
        $query = VehicleModel::select('id', 'name', 'vehicle_brand_id', 'year_from', 'year_to')
            ->when($request->brand_id, function ($q, $brandId) {
                $q->where('vehicle_brand_id', $brandId);
            });

        return response()->json($query->orderBy('name')->get());
    }

    // API: Get categories
    public function categories()
    {
        return response()->json(
            Category::select('id', 'name')->orderBy('name')->get()
        );
    }
}



