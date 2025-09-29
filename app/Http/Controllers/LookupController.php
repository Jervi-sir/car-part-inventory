<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class LookupController extends Controller
{
    // public function manufacturers(Request $req)
    // {
    //     $q = Manufacturer::query()->orderBy('name');
    //     $data = $q->get(['id','name']);
    //     return response()->json(['data' => $data]);
    // }

    // public function vehicleBrands(Request $req)
    // {
    //     $data = VehicleBrand::orderBy('name')->get(['id','name']);
    //     return response()->json(['data' => $data]);
    // }

    // public function vehicleModels(Request $req)
    // {
    //     $req->validate(['vehicle_brand_id' => ['required','integer','exists:vehicle_brands,id']]);
    //     $brandId = (int)$req->vehicle_brand_id;
    //     $data = VehicleModel::where('vehicle_brand_id', $brandId)
    //         ->orderBy('name')
    //         ->get(['id','name','year_from','year_to']);
    //     return response()->json(['data' => $data]);
    // }

    public function index(Request $req)
    {
        // Parse & normalize "include"
        $raw = $req->string('include')->toString() ?: '';
        $includes = collect(explode(',', $raw))
            ->map(fn ($s) => trim($s))
            ->filter()
            ->map(function ($key) {
                // aliases
                return match ($key) {
                    'brands' => 'vehicle_brands',
                    'models' => 'vehicle_models',
                    default  => $key,
                };
            })
            ->unique()
            ->values();

        // If nothing specified, you can choose a default.
        // Here we default to manufacturers + vehicle_brands (lightweight).
        if ($includes->isEmpty()) {
            $includes = collect(['manufacturers', 'vehicle_brands']);
        }

        // If models requested, ensure brand id is present & valid
        if ($includes->contains('vehicle_models')) {
            $req->validate([
                'vehicle_brand_id' => ['required','integer','exists:vehicle_brands,id'],
            ]);
        }

        $response = [];

        if ($includes->contains('manufacturers')) {
            $response['manufacturers'] = Manufacturer::query()
                ->orderBy('name')
                ->get(['id','name']);
        }

        if ($includes->contains('vehicle_brands')) {
            $response['vehicle_brands'] = VehicleBrand::query()
                ->orderBy('name')
                ->get(['id','name']);
        }

        if ($includes->contains('vehicle_models')) {
            $brandId = (int) $req->vehicle_brand_id;

            // Defensive: double-check brand existence (validate already ensures)
            if (!VehicleBrand::whereKey($brandId)->exists()) {
                throw ValidationException::withMessages([
                    'vehicle_brand_id' => ['Selected brand does not exist.'],
                ]);
            }

            $response['vehicle_models'] = VehicleModel::query()
                ->where('vehicle_brand_id', $brandId)
                ->orderBy('name')
                ->get(['id','name','year_from','year_to']);
        }

        return response()->json(['data' => $response]);
    }

}
