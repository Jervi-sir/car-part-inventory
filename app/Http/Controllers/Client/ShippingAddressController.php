<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Models\UserShippingAddress;

class ShippingAddressController extends Controller
{
    public function index(Request $request)
    {
        $items = $request->user()->shippingAddresses()
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function show(Request $request, UserShippingAddress $address)
    {
        $this->authorizeAddress($request, $address);
        return response()->json(['data' => $address]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'label'          => ['nullable','string','max:100'],
            'recipient_name' => ['nullable','string','max:120'],
            'phone'          => ['nullable','string','max:32'],
            'address_line1'  => ['required','string','max:255'],
            'address_line2'  => ['nullable','string','max:255'],
            'city'           => ['required','string','max:120'],
            'state'          => ['nullable','string','max:120'],
            'postal_code'    => ['nullable','string','max:32'],
            'country'        => ['required','string','size:2'],
            'is_default'     => ['sometimes','boolean'],
        ]);

        // If setting default, unset others
        $isDefault = (bool)($data['is_default'] ?? false);

        $address = new UserShippingAddress($data);
        $address->user_id = $user->id;
        $address->is_default = $isDefault;
        $address->save();

        if ($isDefault) {
            $this->ensureSingleDefault($user->id, $address->id);
        }

        return response()->json(['data' => $address], 201);
    }

    public function update(Request $request, UserShippingAddress $address)
    {
        $this->authorizeAddress($request, $address);

        $data = $request->validate([
            'label'          => ['nullable','string','max:100'],
            'recipient_name' => ['nullable','string','max:120'],
            'phone'          => ['nullable','string','max:32'],
            'address_line1'  => ['required','string','max:255'],
            'address_line2'  => ['nullable','string','max:255'],
            'city'           => ['required','string','max:120'],
            'state'          => ['nullable','string','max:120'],
            'postal_code'    => ['nullable','string','max:32'],
            'country'        => ['required','string','size:2'],
            'is_default'     => ['sometimes','boolean'],
        ]);

        $address->fill($data);
        $address->save();

        if (array_key_exists('is_default', $data) && $address->is_default) {
            $this->ensureSingleDefault($address->user_id, $address->id);
        }

        return response()->json(['data' => $address, 'message' => 'Address updated']);
    }

    public function destroy(Request $request, UserShippingAddress $address)
    {
        $this->authorizeAddress($request, $address);
        $address->delete();

        return response()->json(['message' => 'Address deleted']);
    }

    // Simple autocomplete endpoint
    public function search(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $items = $request->user()->shippingAddresses()
            ->when($q !== '', function ($qset) use ($q) {
                $qset->where(function ($sub) use ($q) {
                    $sub->where('label', 'like', "%{$q}%")
                        ->orWhere('recipient_name', 'like', "%{$q}%")
                        ->orWhere('address_line1', 'like', "%{$q}%")
                        ->orWhere('city', 'like', "%{$q}%")
                        ->orWhere('state', 'like', "%{$q}%")
                        ->orWhere('postal_code', 'like', "%{$q}%");
                });
            })
            ->orderByDesc('is_default')
            ->limit(10)
            ->get(['id','label','recipient_name','address_line1','city','state','postal_code','country','is_default']);

        return response()->json(['data' => $items]);
    }

    private function authorizeAddress(Request $request, UserShippingAddress $address): void
    {
        if ($address->user_id !== $request->user()->id) {
            abort(403);
        }
    }

    private function ensureSingleDefault(int $userId, int $keepId): void
    {
        UserShippingAddress::where('user_id', $userId)
            ->where('id', '!=', $keepId)
            ->where('is_default', true)
            ->update(['is_default' => false]);
    }
}
