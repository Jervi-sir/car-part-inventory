<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;

class LookupController extends Controller
{
    public function partReferenceTypes()
    {
        $rows = DB::table('part_reference_types')
            ->orderBy('id')->get(['id','code','label']);
        return response()->json(['data' => $rows]);
    }

    public function vehicleBrands(Request $request)
    {
        $rows = DB::table('vehicle_brands')
            ->when($request->filled('search'), fn($q)=>$q->where('name','like','%'.$request->input('search').'%'))
            ->orderBy('name')->paginate($request->integer('per_page', 1000));
        return response()->json($rows);
    }

    public function vehicleModels(Request $request)
    {
        $q = DB::table('vehicle_models')
            ->when($request->filled('vehicle_brand_id'), fn($q)=>$q->where('vehicle_brand_id',$request->input('vehicle_brand_id')))
            ->when($request->filled('search'), fn($q)=>$q->where('name','like','%'.$request->input('search').'%'))
            ->orderBy('name');

        $per = $request->integer('per_page', 1000);
        return response()->json($q->paginate($per));
    }
}
