<?php


use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => Inertia::render('client/welcome/landing/page'))->name('home');

// Route::middleware(['auth', 'verified'])->group(function () {
//     Route::get('dashboard', function () {
//         return redirect()->route('client.parts.page');
//     })->name('dashboard');
// });

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


require __DIR__ . '/web/admin.php';
require __DIR__ . '/web/client.php';

require __DIR__ . '/auth.php';
