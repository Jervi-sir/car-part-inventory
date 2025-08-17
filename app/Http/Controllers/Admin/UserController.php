<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Order;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function page()
    {
        return Inertia::render('admin/users/page', []);
    }

    public function userPage($userId)
    {
        return Inertia::render('admin/user/page', ['userId' => (int)$userId]);
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'page'     => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:200',
            'q'        => 'nullable|string|max:200',
            'sort_by'  => ['nullable', 'string', Rule::in(['created_at', 'name', 'orders_count'])],
            'sort_dir' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
        ]);

        $page     = (int)($validated['page'] ?? 1);
        $perPage  = (int)($validated['per_page'] ?? 12);
        $q        = trim($validated['q'] ?? '');
        $sortBy   = $validated['sort_by'] ?? 'created_at';
        $sortDir  = $validated['sort_dir'] ?? 'desc';

        $query = User::query()
            ->withCount('orders');

        if ($q !== '') {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('full_name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('id', $q);
            });
        }

        if ($sortBy === 'orders_count') {
            $query->orderBy('orders_count', $sortDir);
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        $p = $query->paginate($perPage, ['*'], 'page', $page);

        $data = $p->getCollection()->map(fn($u) => [
            'id'           => $u->id,
            'name'         => $u->name,
            'full_name'    => $u->full_name,
            'email'        => $u->email,
            'orders_count' => (int)$u->orders_count,
            'created_at'   => $u->created_at?->toIso8601String(),
        ]);

        return response()->json([
            'data'     => $data,
            'total'    => $p->total(),
            'page'     => $p->currentPage(),
            'per_page' => $p->perPage(),
        ]);
    }

    // GET /admin/user/api/{user}
    public function show(Request $request, User $user)
    {
        $validated = $request->validate([
            'page'     => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:200',
            'sort_by'  => ['nullable', 'string', Rule::in(['created_at', 'grand_total', 'status'])],
            'sort_dir' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
        ]);
        $page     = (int)($validated['page'] ?? 1);
        $perPage  = (int)($validated['per_page'] ?? 10);
        $sortBy   = $validated['sort_by'] ?? 'created_at';
        $sortDir  = $validated['sort_dir'] ?? 'desc';

        $ordersQ = Order::query()
            ->where('user_id', $user->id)
            ->withCount('items as items_count')
            ->orderBy($sortBy, $sortDir);

        $p = $ordersQ->paginate($perPage, ['*'], 'page', $page);

        $orders = $p->getCollection()->map(fn($o) => [
            'id'             => $o->id,
            'status'         => $o->status,
            'delivery_method' => $o->delivery_method,
            'currency'       => $o->currency,
            'items_count'    => (int)$o->items_count,
            'subtotal'       => (float)$o->subtotal,
            'discount_total' => (float)$o->discount_total,
            'shipping_total' => (float)$o->shipping_total,
            'tax_total'      => (float)$o->tax_total,
            'grand_total'    => (float)$o->grand_total,
            'created_at'     => $o->created_at?->toIso8601String(),
            'updated_at'     => $o->updated_at?->toIso8601String(),
        ]);

        return response()->json([
            'user'   => [
                'id'         => $user->id,
                'name'       => $user->name,
                'full_name'  => $user->full_name,
                'email'      => $user->email,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
            'orders' => [
                'data'     => $orders,
                'total'    => $p->total(),
                'page'     => $p->currentPage(),
                'per_page' => $p->perPage(),
            ]
        ]);
    }
}
