<?php

use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\LookupController;
use App\Http\Controllers\Admin\ManufacturerController;
use App\Http\Controllers\Admin\PartController;
use App\Http\Controllers\Admin\PartFitmentController;
use App\Http\Controllers\Admin\VehicleBrandController;
use App\Http\Controllers\Admin\VehicleModelController;
use App\Http\Controllers\Admin\PartReferenceController;
use Inertia\Inertia;
use Illuminate\Support\Facades\Route;


Route::prefix('admin')->group(function () {
    // Categories
    Route::prefix('categories')->group(function () {
        Route::get('/', fn()  => Inertia::render('admin/categories/page'))->name('admin.categories.page');          // [done]
        Route::prefix('api')->group(function () {
            Route::get('/', [CategoryController::class, 'index'])->name('admin.categories.api.crud');               // [done]
            Route::post('/', [CategoryController::class, 'store']);                                                 // [done]
            Route::put('{category}', [CategoryController::class, 'update']);                                        // [done]
            Route::delete('{category}', [CategoryController::class, 'destroy']);                                    // [done]
        });
    });
    // Vehicle Brands
    Route::prefix('manufacturers')->group(function () {
        Route::get('/', fn()  => Inertia::render('admin/manufacturers/page'))->name('admin.manufacturers.page'); 
        Route::prefix('api')->group(function () {
            Route::get('/', [ManufacturerController::class, 'index'])->name('admin.manufacturers.api.crud');
            Route::post('/', [ManufacturerController::class, 'store']);
            Route::put('{manufacturer}', [ManufacturerController::class, 'update']);
            Route::delete('{manufacturer}', [ManufacturerController::class, 'destroy']);
        });
    });
    // Vehicle Brands
    Route::prefix('vehicle-brands')->group(function () {
        Route::get('/', fn()  => Inertia::render('admin/vehicle-brands/page'))->name('admin.vehicle-brands.page');  // [done]
        Route::prefix('api')->group(function () {
            Route::get('/', [VehicleBrandController::class, 'index'])->name('admin.vehicle-brands.api.crud');       // [done]
            Route::post('/', [VehicleBrandController::class, 'store']);                                             // [done]
            Route::put('{vehicleBrand}', [VehicleBrandController::class, 'update']);                                // [done]
            Route::delete('{vehicleBrand}', [VehicleBrandController::class, 'destroy']);                            // [done]
        });
    });
    // Vehicle Models
    Route::prefix('vehicle-models')->group(function () {
        Route::get('/', fn()  => Inertia::render('admin/vehicle-models/page'))->name('admin.vehicle-models.page');  // [done]
        Route::prefix('api')->group(function () {
            Route::get('/', [VehicleModelController::class, 'index'])->name('admin.vehicle-models.api.crud');       // [done]
            Route::post('/', [VehicleModelController::class, 'store']);                                             // [done]
            Route::put('{vehicleModel}', [VehicleModelController::class, 'update']);                                // [done]
            Route::delete('{vehicleModel}', [VehicleModelController::class, 'destroy']);                            // [done]
        });
    });

    Route::prefix('parts')->group(function () {
        Route::get('/', fn()  => Inertia::render('admin/parts/page'))->name('admin.parts.page');

        Route::prefix('api')->group(function () {
            Route::get('/', [PartController::class, 'index'])->name('admin.parts.api.crud');     // list with filters + pagination
            Route::post('/', [PartController::class, 'store']);    // create
            Route::get('/{part}', [PartController::class, 'show']); // show (with references, fitments)
            Route::put('/{part}', [PartController::class, 'update']); // update
            Route::delete('/{part}', [PartController::class, 'destroy']); // delete
            Route::patch('/{part}/active', [PartController::class, 'updateActive'])->name('admin.parts.api.active');

            Route::post('/bulk-status', [PartController::class, 'bulkStatus'])->name('admin.parts.api.bulk-status'); // {ids:[], is_active:boolean}
            // JSON images updater (array of {url, sort_order})
            Route::put('/{part}/images', [PartController::class, 'updateImages']);
            // References upsert (enum type, code, source_brand)
            Route::get('/{part}/references', [PartReferenceController::class, 'index']);
            Route::put('/{part}/references', [PartReferenceController::class, 'upsert']);
            // Fitments upsert (vehicle_model_id, engine_code?, notes?)
            Route::get('/{part}/fitments', [PartFitmentController::class, 'index']);
            Route::put('/{part}/fitments', [PartFitmentController::class, 'upsert']);
            Route::put('/{part}/relations', [PartController::class, 'upsert'])->name('admin.parts.api.relations');
        });
    });
    Route::prefix('lookup')->group(function () {
        Route::get('/vehicle-brands', [LookupController::class, 'vehicleBrands'])->name('lookup.api.vehicle-brands');
        Route::get('/vehicle-models', [LookupController::class, 'vehicleModels'])->name('lookup.api.vehicle-models'); // ?vehicle_brand_id=ID
        Route::get('/categories', [LookupController::class, 'categories'])->name('lookup.api.categories');
        Route::get('/manufacturers', [LookupController::class, 'manufacturers'])->name('lookup.api.manufacturers');
    });


    Route::get('fitments', fn()  => Inertia::render('admin/fitments/page'))->name('admin.fitments.page');
    Route::get('parts', fn()  => Inertia::render('admin/parts/page'))->name('admin.parts.page');
});

