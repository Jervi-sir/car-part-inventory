<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

// Route::get('/', function () {
//     return Inertia::render('welcome');
// })->name('home');
Route::get('/', fn () => Inertia::render('client/welcome/landing-page'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return redirect()->route('client.parts.page');
    })->name('dashboard');
});

require __DIR__ . '/web/admin.php';
require __DIR__ . '/web/client.php';

require __DIR__ . '/auth.php';
