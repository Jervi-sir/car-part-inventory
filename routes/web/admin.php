<?php

use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\ImportPartsController;
use App\Http\Controllers\Admin\LookupController;
use App\Http\Controllers\Admin\ManufacturerController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\PartController;
use App\Http\Controllers\Admin\PartFitmentController;
use App\Http\Controllers\Admin\VehicleBrandController;
use App\Http\Controllers\Admin\VehicleModelController;
use App\Http\Controllers\Admin\PartReferenceController;
use App\Http\Controllers\Admin\UserController;
use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

// role:ADMIN,MODERATOR
Route::middleware(['auth', 'role:ADMIN,MODERATOR'])->prefix('admin')->group(function () {
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
            Route::get('/{part}', [PartController::class, 'show']); // show (with fitments)
            Route::put('/{part}', [PartController::class, 'update']); // update
            Route::delete('/{part}', [PartController::class, 'destroy']); // delete
            Route::patch('/{part}/active', [PartController::class, 'updateActive'])->name('admin.parts.api.active');
            
            Route::post('/bulk-status', [PartController::class, 'bulkStatus'])->name('admin.parts.api.bulk-status');

            Route::put('/{part}/images', [PartController::class, 'updateImages']);
            Route::get('/{part}/fitments', [PartFitmentController::class, 'index']);
            Route::put('/{part}/fitments', [PartFitmentController::class, 'upsert']);
        });
    });
    Route::prefix('lookup')->group(function () {
        Route::get('/vehicle-brands', [LookupController::class, 'vehicleBrands'])->name('lookup.api.vehicle-brands');
        Route::get('/vehicle-models', [LookupController::class, 'vehicleModels'])->name('lookup.api.vehicle-models'); // ?vehicle_brand_id=ID
        Route::get('/manufacturers', [LookupController::class, 'manufacturers'])->name('lookup.api.manufacturers');
    });

    Route::prefix('orders')->group(function () {
        Route::get('/', [OrderController::class, 'page'])->name('admin.orders.page');
        // JSON API
        Route::prefix('api')->group(function () {
            Route::get('/', [OrderController::class, 'index'])->name('admin.api.orders.index');
        });
    });

    Route::prefix('order')->group(function () {
        Route::get('id/{order}', [OrderController::class, 'showPage'])->name('admin.order.page');
        Route::prefix('api')->group(function () {
            Route::get('{order}', [OrderController::class, 'show'])->name('admin.order.api.show');
            Route::patch('{order}/status',   [OrderController::class, 'updateStatus'])->name('admin.api.orders.status');
            Route::patch('{order}/shipping', [OrderController::class, 'updateShipping'])->name('admin.api.orders.shipping');
            Route::patch('{order}/notes',     [OrderController::class, 'updateNotes'])->name('admin.api.orders.notes');
        });
    });

    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'page'])->name('admin.users.page');
        Route::get('/{user}', [UserController::class, 'userPage'])->name('admin.user.page');
    });
    Route::prefix('user')->group(function () {
        Route::get('/', [UserController::class, 'index'])->name('admin.api.users.index');
        Route::get('/{user}', [UserController::class, 'show'])->name('admin.api.users.show');
    });

    Route::prefix('import-parts')->group(function () {
        Route::get('/', [ImportPartsController::class, 'index'])->name('admin.import.parts.index');
        Route::post('parse', [ImportPartsController::class, 'parse'])->name('admin.import.parts.parse');
        Route::post('commit', [ImportPartsController::class, 'commit'])->name('admin.import.parts.commit');
    });
});
