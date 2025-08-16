<?php

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Client\CartController;
use App\Http\Controllers\Client\PartImportController;
use App\Http\Controllers\Api\Client\ClientPartController;
use App\Http\Controllers\Api\Client\ClientCategoryController;
use App\Http\Controllers\Api\Client\ClientManufacturerController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::prefix('admin')->group(function () {
    Route::get('categories', fn()  => Inertia::render('admin/categories/page'))->name('admin.categories.page');
    Route::get('fitments', fn()  => Inertia::render('admin/fitments/page'))->name('admin.fitments.page');
    Route::get('manufacturers', fn()  => Inertia::render('admin/manufacturers/page'))->name('admin.manufacturers.page');
    Route::get('vehicle-brands', fn()  => Inertia::render('admin/vehicle-brands/page'))->name('admin.vehicle-brands.page');
    Route::get('vehicle-models', fn()  => Inertia::render('admin/vehicle-models/page'))->name('admin.vehicle-models.page');
    Route::get('parts', fn()  => Inertia::render('admin/parts/page'))->name('admin.parts.page');
});

Route::prefix('client')->group(function () {
    Route::get('parts', fn()  => Inertia::render('client/parts-catalog/page'))->name('client.parts.page');
});

Route::prefix('imports')->group(function () {
    Route::get('parts', [PartImportController::class, 'create'])->name('imports.parts.create');
    Route::post('parts/preview', [PartImportController::class, 'preview'])->name('imports.parts.preview');
    Route::post('parts/run', [PartImportController::class, 'run'])->name('imports.parts.run');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});


Route::prefix('api')->group(function () {

    Route::prefix('client')->middleware('auth')->group(function () {
        Route::get('parts', [ClientPartController::class, 'index']);
        Route::get('parts/{id}', [ClientPartController::class, 'show']);
        Route::get('categories', [ClientCategoryController::class, 'index']);
        Route::get('manufacturers', [ClientManufacturerController::class, 'index']);


        Route::get('/cart', [CartController::class, 'current']);
        Route::post('/cart/items', [CartController::class, 'addItem']);
        Route::put('/cart/items/{part}', [CartController::class, 'updateItem']);
        Route::delete('/cart/items/{part}', [CartController::class, 'removeItem']);
        Route::post('/cart/place', [CartController::class, 'place']);
    });
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
