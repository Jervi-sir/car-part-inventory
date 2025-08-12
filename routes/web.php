<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

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



Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
