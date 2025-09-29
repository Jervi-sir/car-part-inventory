<?php

use App\Http\Controllers\LookupController;
use App\Http\Controllers\HomePageController;
use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomePageController::class, 'home'])->name('home');
Route::get('/terms', [HomePageController::class, 'terms'])->name('terms');
Route::get('/privacy', [HomePageController::class, 'privacy'])->name('privacy');
Route::get('/public/stats', [HomePageController::class, 'publicStatus'])->name('public.status');

Route::prefix('lookup')->group(function () {
  Route::get('/', [LookupController::class, 'index'])->name('lookup.api.index');
});

// Route::middleware(['auth', 'verified'])->group(function () {
//     Route::get('dashboard', function () {
//         return redirect()->route('client.parts.page');
//     })->name('dashboard');
// });


require __DIR__ . '/web/admin.php';
require __DIR__ . '/web/client.php';

require __DIR__ . '/auth.php';
