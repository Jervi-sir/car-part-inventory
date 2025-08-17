<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Manufacturer;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Http\Request;

class LookupController extends Controller
{
    public function categories(Request $req)
    {
        $q = Category::query()->orderBy('name');
        $data = $q->get(['id','name']);
        return response()->json(['data' => $data]);
    }

    public function manufacturers(Request $req)
    {
        $q = Manufacturer::query()->orderBy('name');
        $data = $q->get(['id','name']);
        return response()->json(['data' => $data]);
    }

    public function vehicleBrands(Request $req)
    {
        $data = VehicleBrand::orderBy('name')->get(['id','name']);
        return response()->json(['data' => $data]);
    }

    public function vehicleModels(Request $req)
    {
        $req->validate(['vehicle_brand_id' => ['required','integer','exists:vehicle_brands,id']]);
        $brandId = (int)$req->vehicle_brand_id;
        $data = VehicleModel::where('vehicle_brand_id', $brandId)
            ->orderBy('name')
            ->get(['id','name','year_from','year_to']);
        return response()->json(['data' => $data]);
    }
}
