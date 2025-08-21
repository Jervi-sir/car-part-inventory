<?php

use App\Helpers\TelegramNotification;
use App\Http\Controllers\Client\TelegramController;
use App\Models\Order;
use App\Models\TelegramLink;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
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
