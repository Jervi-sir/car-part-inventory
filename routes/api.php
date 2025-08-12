<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{CategoryController, LookupController, ManufacturerController, PartController, VehicleBrandController, VehicleModelController};

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('categories')->group(function () {
    Route::get('/', [CategoryController::class, 'index']);
    Route::post('/', [CategoryController::class, 'store']);
    Route::put('{category}', [CategoryController::class, 'update']);
    Route::delete('{category}', [CategoryController::class, 'destroy']);
});

Route::prefix('manufacturers')->group(function () {
    Route::get('/', [ManufacturerController::class, 'index']);
    Route::post('/', [ManufacturerController::class, 'store']);
    Route::put('{manufacturer}', [ManufacturerController::class, 'update']);
    Route::delete('{manufacturer}', [ManufacturerController::class, 'destroy']);
});

Route::prefix('vehicle-brands')->group(function () {
    Route::get('/', [VehicleBrandController::class, 'index']);
    Route::post('/', [VehicleBrandController::class, 'store']);
    Route::put('{vehicleBrand}', [VehicleBrandController::class, 'update']);
    Route::delete('{vehicleBrand}', [VehicleBrandController::class, 'destroy']);
});

Route::prefix('vehicle-models')->group(function () {
    Route::get('/', [VehicleModelController::class, 'index']);
    Route::post('/', [VehicleModelController::class, 'store']);
    Route::put('{vehicleModel}', [VehicleModelController::class, 'update']);
    Route::delete('{vehicleModel}', [VehicleModelController::class, 'destroy']);
});

Route::get   ('/parts',                [PartController::class, 'index']);
Route::post  ('/parts',                [PartController::class, 'store']);
Route::get   ('/parts/{id}',           [PartController::class, 'show']);
Route::put   ('/parts/{id}',           [PartController::class, 'update']);
Route::delete('/parts/{id}',           [PartController::class, 'destroy']);

Route::post  ('/parts/bulk-status',    [PartController::class, 'bulkStatus']);

Route::put   ('/parts/{id}/images',    [PartController::class, 'syncImages']);
Route::put   ('/parts/{id}/references',[PartController::class, 'syncReferences']);
Route::put   ('/parts/{id}/fitments',  [PartController::class, 'syncFitments']);

// Lookups used by the editor (you already have brands/models CRUD; keep or swap)
Route::get('/parts/part-reference-types',    [LookupController::class, 'partReferenceTypes']);
Route::get('/parts/vehicle-brands',          [LookupController::class, 'vehicleBrands']);
Route::get('/parts/vehicle-models',          [LookupController::class, 'vehicleModels']);

