<?php

use App\Http\Controllers\Client\CartController;
use App\Http\Controllers\Client\CatalogController;
use App\Http\Controllers\Client\OrderController;
use App\Http\Controllers\Client\OrderListController;
use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

Route::prefix('catalog')->group(function () {
    Route::get('/', fn() => Inertia::render('client/catalog/page'))->name('client.parts.page');
    Route::get('/checkout', fn() => Inertia::render('client/checkout/page'))->name('client.checkout.page');
    Route::get('/orders', [OrderListController::class, 'page'])->name('client.orders.page');
    Route::get('/orders/{order}', [OrderController::class, 'page'])->name('client.order.page');

    Route::prefix('api')->middleware('auth')->group(function () {
        Route::get('/orders', [OrderListController::class, 'index'])->name('shop.api.orders.index');
        Route::get('/orders/{order}', [OrderController::class, 'show'])->name('shop.api.orders.show');
        
        Route::get('/parts', [CatalogController::class, 'index'])->name('shop.api.parts');

        Route::get('/cart', [CartController::class, 'show'])->name('shop.api.cart.show');
        Route::post('/cart/items', [CartController::class, 'add'])->name('shop.api.cart.add');
        Route::put('/cart/items/{part}', [CartController::class, 'update'])->name('shop.api.cart.update');
        Route::delete('/cart/items/{part}', [CartController::class, 'remove'])->name('shop.api.cart.remove');
        Route::delete('/cart/clear', [CartController::class, 'clear'])->name('shop.api.cart.clear');
        Route::post('/checkout/submit', [CartController::class, 'submit'])->name('shop.api.checkout.submit');
    });
});

