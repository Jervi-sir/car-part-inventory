<?php

use App\Http\Controllers\Api\Admin\PartController;
use App\Http\Controllers\Api\Admin\PartFitmentController;
use App\Http\Controllers\Api\Admin\PartReferenceController;
use App\Http\Controllers\Api\CategoryController;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Client\CartController;
use App\Http\Controllers\Client\PartImportController;
use App\Http\Controllers\Api\Client\ClientPartController;
use App\Http\Controllers\Api\Client\ClientCategoryController;
use App\Http\Controllers\Api\Client\ClientManufacturerController;
use App\Http\Controllers\Api\Admin\LookupController;
use App\Http\Controllers\Api\Client\CatalogController;
use App\Http\Controllers\Api\VehicleBrandController;
use App\Http\Controllers\Api\VehicleModelController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

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
    Route::get('manufacturers', fn()  => Inertia::render('admin/manufacturers/page'))->name('admin.manufacturers.page');    // [done]
    Route::get('parts', fn()  => Inertia::render('admin/parts/page'))->name('admin.parts.page');
});


Route::prefix('catalog')->group(function () {
    Route::get('/', fn() => Inertia::render('client/catalog/page'))->name('client.parts.page');
    Route::get('/checkout', fn() => Inertia::render('client/checkout/page'))->name('client.checkout.page');

    Route::prefix('api')->middleware('auth')->group(function () {
        Route::get('/parts', [CatalogController::class, 'index'])->name('shop.api.parts');

        Route::get('/cart', [CartController::class, 'show'])->name('shop.api.cart.show');
        Route::post('/cart/items', [CartController::class, 'add'])->name('shop.api.cart.add');
        Route::put('/cart/items/{part}', [CartController::class, 'update'])->name('shop.api.cart.update');
        Route::delete('/cart/items/{part}', [CartController::class, 'remove'])->name('shop.api.cart.remove');
        Route::delete('/cart/clear', [CartController::class, 'clear'])->name('shop.api.cart.clear');
        Route::post('/checkout/submit', [CartController::class, 'submit'])->name('shop.api.checkout.submit');
    });
});


// Route::prefix('client')->group(function () {
//     Route::get('parts', fn()  => Inertia::render('client/parts-catalog/page'))->name('client.parts.page');
// });

// Route::prefix('imports')->group(function () {
//     Route::get('parts', [PartImportController::class, 'create'])->name('imports.parts.create');
//     Route::post('parts/preview', [PartImportController::class, 'preview'])->name('imports.parts.preview');
//     Route::post('parts/run', [PartImportController::class, 'run'])->name('imports.parts.run');
// });

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});


// Route::prefix('api')->group(function () {

//     Route::prefix('client')->middleware('auth')->group(function () {
//         Route::get('parts', [ClientPartController::class, 'index']);
//         Route::get('parts/{id}', [ClientPartController::class, 'show']);
//         Route::get('categories', [ClientCategoryController::class, 'index']);
//         Route::get('manufacturers', [ClientManufacturerController::class, 'index']);


//         Route::get('/cart', [CartController::class, 'current']);
//         Route::post('/cart/items', [CartController::class, 'addItem']);
//         Route::put('/cart/items/{part}', [CartController::class, 'updateItem']);
//         Route::delete('/cart/items/{part}', [CartController::class, 'removeItem']);
//         Route::post('/cart/place', [CartController::class, 'place']);
//     });
// });

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
