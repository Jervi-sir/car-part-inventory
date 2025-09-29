<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Database\QueryException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ManufacturerController extends Controller
{
    public function page()
    {
        return Inertia::render('admin/manufacturers/page');
    }

    public function index(Request $request)
    {
        $q = Manufacturer::query();
        if ($s = trim((string)$request->input('search'))) {
            $q->where('name', 'like', "%{$s}%");
        }
        $perPage = max(1, min(200, (int)$request->input('per_page', 10)));
        $page = max(1, (int)$request->input('page', 1));
        $p = $q->orderBy('id','desc')->paginate($perPage, ['*'], 'page', $page);
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
            'name' => ['required','string','max:120','unique:manufacturers,name'],
        ]);
        $model = Manufacturer::create($data);
        return response()->json($model, Response::HTTP_CREATED);
    }

    public function update(Request $request, Manufacturer $manufacturer)
    {
        $data = $request->validate([
            'name' => ['required','string','max:120', Rule::unique('manufacturers','name')->ignore($manufacturer->id)],
        ]);
        $manufacturer->update($data);
        return response()->json($manufacturer);
    }

    public function destroy(Manufacturer $manufacturer)
    {
        try {
            $manufacturer->delete();
            return response()->noContent();
        } catch (QueryException $e) {
            return response()->json(['message' => 'Cannot delete: manufacturer is in use.'], 409);
        }
    }
}
