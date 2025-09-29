<?php

use App\Http\Controllers\Client\AdClickController;
use App\Http\Controllers\Client\CartController;
use App\Http\Controllers\Client\CatalogController;
use App\Http\Controllers\Client\OrderController;
use App\Http\Controllers\Client\OrderListController;
use App\Http\Controllers\Client\ShippingAddressController;
use App\Http\Controllers\Client\TelegramController;
use App\Http\Controllers\Client\UserSettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('ads/redirect', AdClickController::class)->name('ads.click')->middleware('signed');;
    
    Route::prefix('catalog')->group(function () {
        Route::get('/', [CatalogController::class, 'page'])->name('client.parts.page');
        Route::get('/parts', [CatalogController::class, 'parts'])->name('shop.api.parts');
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
        Route::get('/', [CartController::class, 'page'])->name('client.checkout.page');
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
        Route::get('/', [UserSettingsController::class, 'page'])->name('client.settings.page');
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

    Route::prefix('notifications/telegram')->group(function () {
        Route::get('status', [TelegramController::class, 'status'])->name('client.notifications.telegram.status');
        Route::post('connect', [TelegramController::class, 'connect'])->name('client.notifications.telegram.connect');
        Route::delete('disconnect', [TelegramController::class, 'disconnect'])->name('client.notifications.telegram.disconnect');
    });
});


