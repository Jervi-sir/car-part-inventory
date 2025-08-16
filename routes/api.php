<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{CategoryController, LookupController, ManufacturerController, PartController, VehicleBrandController, VehicleModelController};
use App\Http\Controllers\Api\Client\CartController;
use App\Http\Controllers\Api\Client\ClientCategoryController;
use App\Http\Controllers\Api\Client\ClientManufacturerController;
use App\Http\Controllers\Api\Client\ClientPartController;

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

Route::prefix('parts')->group(function () {
    Route::get('/',                [PartController::class, 'index']);
    Route::post('/',                [PartController::class, 'store']);
    Route::get('{id}',           [PartController::class, 'show']);
    Route::put('{id}',           [PartController::class, 'update']);
    Route::delete('{id}',           [PartController::class, 'destroy']);
    Route::post('bulk-status',    [PartController::class, 'bulkStatus']);
    Route::put('{id}/images',    [PartController::class, 'syncImages']);
    Route::put('{id}/references', [PartController::class, 'syncReferences']);
    Route::put('{id}/fitments',  [PartController::class, 'syncFitments']);
    // Lookups used by the editor (you already have brands/models CRUD; keep or swap)
    Route::get('part-reference-types',    [LookupController::class, 'partReferenceTypes']);
    Route::get('vehicle-brands',          [LookupController::class, 'vehicleBrands']);
    Route::get('vehicle-models',          [LookupController::class, 'vehicleModels']);
});



