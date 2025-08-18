<?php

use App\Http\Controllers\Client\CartController;
use App\Http\Controllers\Client\CatalogController;
use App\Http\Controllers\Client\OrderController;
use App\Http\Controllers\Client\OrderListController;
use App\Http\Controllers\Client\ShippingAddressController;
use App\Http\Controllers\Client\UserSettingsController;
use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {

    Route::prefix('catalog')->group(function () {
        Route::get('/', fn() => Inertia::render('client/catalog/page'))->name('client.parts.page');
        Route::get('/parts', [CatalogController::class, 'index'])->name('shop.api.parts');
    });

    Route::prefix('orders')->group(function () {
        Route::get('/', [OrderListController::class, 'page'])->name('client.orders.page');
        Route::get('{order}', [OrderController::class, 'page'])->name('client.order.page');
    });

    Route::prefix('order')->group(function () {
        Route::prefix('api')->middleware('auth')->group(function () {
            Route::get('/', [OrderListController::class, 'index'])->name('shop.api.orders.index');
            Route::get('{order}', [OrderController::class, 'show'])->name('shop.api.orders.show');
        });
    });

    Route::prefix('cart')->middleware(['throttle:60,1'])
        ->get('/quick-preview', [OrderController::class, 'quickPreview'])
        ->name('client.cart.quick-preview');

    Route::prefix('checkout')->group(function () {
        Route::get('/', fn() => Inertia::render('client/checkout/page'))->name('client.checkout.page');
        Route::prefix('api')->middleware('auth')->group(function () {
            Route::get('/cart', [CartController::class, 'show'])->name('shop.api.cart.show');
            Route::post('/cart/items', [CartController::class, 'add'])->name('shop.api.cart.add');
            Route::put('/cart/items/{part}', [CartController::class, 'update'])->name('shop.api.cart.update');
            Route::delete('/cart/items/{part}', [CartController::class, 'remove'])->name('shop.api.cart.remove');
            Route::delete('/cart/clear', [CartController::class, 'clear'])->name('shop.api.cart.clear');
            Route::post('/checkout/submit', [CartController::class, 'submit'])->name('shop.api.checkout.submit');
        });
    });


    Route::prefix('user')->group(function () {
        Route::get('/', fn() => Inertia::render('client/settings/page'))->name('client.settings.page');
        Route::prefix('api')->group(function () {
            Route::get('settings', [UserSettingsController::class, 'show'])->name('client.settings.api');
            Route::put('settings', [UserSettingsController::class, 'update']);
            Route::post('upload',   [UserSettingsController::class, 'upload'])->name('client.settings.api.upload'); // ← add this

            Route::prefix('shipping-addresses')->group(function () {
                Route::get('/', [ShippingAddressController::class, 'index'])->name('client.settings.api.shipping-addresses.crud');
                Route::post('/', [ShippingAddressController::class, 'store']);
                Route::get('{address}', [ShippingAddressController::class, 'show']);
                Route::put('{address}', [ShippingAddressController::class, 'update']);
                Route::delete('{address}', [ShippingAddressController::class, 'destroy']);
                Route::get('search', [ShippingAddressController::class, 'search'])->name('client.settings.api.shipping-addresses.search');
            });
        });
    });
});


// Route::middleware('guest')->group(function () {
Route::get('/terms', fn () => Inertia::render('client/welcome/legal-page', [
    'type' => 'terms',
    'updatedAt' => now()->toDateString(),
    'company' => [
        'name' => 'CarParts DZ',
        'country' => 'Algeria',
        'legalEmail' => 'support@carpartsdz.example',
        'address' => '—',
    ],
]))->name('terms');

Route::get('/privacy', fn () => Inertia::render('client/welcome/legal-page', [
    'type' => 'privacy',
    'updatedAt' => now()->toDateString(),
    'company' => [
        'name' => 'CarParts DZ',
        'country' => 'Algeria',
        'legalEmail' => 'support@carpartsdz.example',
        'address' => '—',
    ],
]))->name('privacy');
// });

