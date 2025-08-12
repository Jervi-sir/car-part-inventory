<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{CategoryController, ManufacturerController, VehicleBrandController, VehicleModelController};

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
