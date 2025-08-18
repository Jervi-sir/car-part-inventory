<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$allowed): Response
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }
        // Convert strings like "ADMIN" to enum values
        $allowedEnums = array_map(fn($r) => constant(UserRole::class.'::'.strtoupper($r)), $allowed);
        if (! in_array($user->role, $allowedEnums, true)) {
            // abort(403, 'Unauthorized role.');
            return redirect()->route('home');
        }
        return $next($request);
    }
}
