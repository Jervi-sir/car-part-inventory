<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;

class UserSettingsController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user()->only([
            'id', 'name', 'full_name', 'email', 'birthdate', 'email_verified_at', 'created_at', 'updated_at',
        ]);

        return response()->json([
            'user' => $user,
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'full_name'  => ['nullable', 'string', 'max:120'],
            'email'      => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'birthdate'  => ['nullable', 'date'],
            // Optional password change flow (only if provided)
            'password'   => ['nullable', 'string', 'min:8', 'max:255', 'confirmed'], // expects password_confirmation
        ]);

        $user->name = $data['name'];
        $user->full_name = $data['full_name'] ?? null;

        if ($user->email !== $data['email']) {
            $user->email = $data['email'];
            $user->email_verified_at = null; // force re-verify if you want
        }

        if (!empty($data['birthdate'])) {
            $user->birthdate = $data['birthdate'];
        } else {
            $user->birthdate = null;
        }

        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
            // If you *must* store plaintext (not recommended), uncomment:
            // $user->password_plaintext = $data['password'];
        }

        $user->save();

        return response()->json([
            'user' => $user->only(['id','name','full_name','email','birthdate','email_verified_at','created_at','updated_at']),
            'message' => 'Profile updated',
        ]);
    }

}
