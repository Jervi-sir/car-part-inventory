<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VehicleModel;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

class VehicleModelController extends Controller
{
    public function index(Request $request)
    {
        $q = VehicleModel::query();
        if ($s = trim((string)$request->input('search'))) {
            $q->where('name', 'like', "%{$s}%");
        }
        if ($brandId = $request->input('vehicle_brand_id')) {
            $q->where('vehicle_brand_id', $brandId);
        }
        $perPage = max(1, min(500, (int)$request->input('per_page', 10)));
        $page = max(1, (int)$request->input('page', 1));
        $p = $q->orderBy('name')->paginate($perPage, ['*'], 'page', $page);
        return response()->json([
            'data' => $p->items(),
            'total' => $p->total(),
            'page' => $p->currentPage(),
            'per_page' => $p->perPage(),
        ]);
    }

    public function store(Request $request)
    {
        $rules = [
            'vehicle_brand_id' => ['required', 'integer', 'exists:vehicle_brands,id'],
            'name' => ['required', 'string', 'max:120'],
            'year_from' => ['nullable', 'integer', 'between:1900,2100'],
            'year_to' => ['nullable', 'integer', 'between:1900,2100'],
        ];
        $data = $request->validate($rules);
        // extra rule: year_from <= year_to
        if (!is_null($data['year_from'] ?? null) && !is_null($data['year_to'] ?? null) && $data['year_from'] > $data['year_to']) {
            return response()->json(['message' => 'year_from must be <= year_to'], 422);
        }
        // unique composite (brand, name, year_from, year_to)
        $request->validate([
            'name' => [Rule::unique('vehicle_models')->where(
                fn($q) => $q
                    ->where('vehicle_brand_id', $data['vehicle_brand_id'])
                    ->where('name', $data['name'])
                    ->where('year_from', $data['year_from'])
                    ->where('year_to', $data['year_to'])
            )],
        ]);

        $model = VehicleModel::create($data);
        return response()->json($model, Response::HTTP_CREATED);
    }

    public function update(Request $request, VehicleModel $vehicleModel)
    {
        $rules = [
            'vehicle_brand_id' => ['required', 'integer', 'exists:vehicle_brands,id'],
            'name' => ['required', 'string', 'max:120'],
            'year_from' => ['nullable', 'integer', 'between:1900,2100'],
            'year_to' => ['nullable', 'integer', 'between:1900,2100'],
        ];
        $data = $request->validate($rules);
        if (!is_null($data['year_from'] ?? null) && !is_null($data['year_to'] ?? null) && $data['year_from'] > $data['year_to']) {
            return response()->json(['message' => 'year_from must be <= year_to'], 422);
        }
        // unique composite while ignoring current row
        $request->validate([
            'name' => [Rule::unique('vehicle_models')->ignore($vehicleModel->id)->where(
                fn($q) => $q
                    ->where('vehicle_brand_id', $data['vehicle_brand_id'])
                    ->where('name', $data['name'])
                    ->where('year_from', $data['year_from'])
                    ->where('year_to', $data['year_to'])
            )],
        ]);

        $vehicleModel->update($data);
        return response()->json($vehicleModel);
    }

    public function destroy(VehicleModel $vehicleModel)
    {
        try {
            $vehicleModel->delete();
            return response()->noContent();
        } catch (QueryException $e) {
            return response()->json(['message' => 'Cannot delete: model is in use.'], 409);
        }
    }
}
