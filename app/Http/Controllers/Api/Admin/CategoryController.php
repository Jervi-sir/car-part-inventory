<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Database\QueryException;
use Symfony\Component\HttpFoundation\Response;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $q = Category::query();
        if ($s = trim((string)$request->input('search'))) {
            $q->where('name', 'like', "%{$s}%");
        }
        $perPage = max(1, min(200, (int)$request->input('per_page', 10)));
        $page = max(1, (int)$request->input('page', 1));
        $p = $q->orderBy('id', 'desc')->paginate($perPage, ['*'], 'page', $page);
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
            'name' => ['required','string','max:80','unique:categories,name'],
        ]);
        $model = Category::create($data);
        return response()->json($model, Response::HTTP_CREATED);
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['required','string','max:80', Rule::unique('categories','name')->ignore($category->id)],
        ]);
        $category->update($data);
        return response()->json($category);
    }

    public function destroy(Category $category)
    {
        try {
            $category->delete();
            return response()->noContent();
        } catch (QueryException $e) {
            // FK violation -> 23000
            return response()->json(['message' => 'Cannot delete: category is in use.'], 409);
        }
    }
}
