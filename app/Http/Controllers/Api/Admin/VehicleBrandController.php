<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\VehicleBrand;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Database\QueryException;
use Symfony\Component\HttpFoundation\Response;

class VehicleBrandController extends Controller
{
    public function index(Request $request)
    {
        $q = VehicleBrand::query();
        if ($s = trim((string)$request->input('search'))) {
            $q->where('name', 'like', "%{$s}%");
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
        $data = $request->validate([
            'name' => ['required','string','max:120','unique:vehicle_brands,name'],
        ]);
        $model = VehicleBrand::create($data);
        return response()->json($model, Response::HTTP_CREATED);
    }

    public function update(Request $request, VehicleBrand $vehicleBrand)
    {
        $data = $request->validate([
            'name' => ['required','string','max:120', Rule::unique('vehicle_brands','name')->ignore($vehicleBrand->id)],
        ]);
        $vehicleBrand->update($data);
        return response()->json($vehicleBrand);
    }

    public function destroy(VehicleBrand $vehicleBrand)
    {
        try {
            $vehicleBrand->delete();
            return response()->noContent();
        } catch (QueryException $e) {
            return response()->json(['message' => 'Cannot delete: brand is in use.'], 409);
        }
    }
}
