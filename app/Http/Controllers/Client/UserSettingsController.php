<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class UserSettingsController extends Controller
{

    public function page(Request $req)
    {
        return Inertia::render('client/settings/page');
    }

    /**
     * GET /client/settings/api
     */
    public function show(Request $request)
    {
        $user = $request->user()->only([
            'id',
            'name',
            'full_name',
            'email',
            'birthdate',
            'email_verified_at',
            'created_at',
            'updated_at',
            'id_card_url',
            'commercial_register_url',
            'is_verified',
        ]);

        return response()->json([
            'user' => $user,
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name'    => ['required', 'string', 'max:255'],
            'full_name' => ['nullable', 'string', 'max:120'],
            'email'   => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'birthdate' => ['nullable', 'date'],

            'password' => ['nullable', 'string', 'min:8', 'max:255', 'confirmed'],

            // Accept either a relative path (preferred) or a full URL; mutators will store only the path
            'id_card_url'             => ['nullable', 'string', 'max:2048'],
            'commercial_register_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $user->name = $data['name'];
        $user->full_name = $data['full_name'] ?? null;

        if ($user->email !== $data['email']) {
            $user->email = $data['email'];
            $user->email_verified_at = null;
        }

        $user->birthdate = $data['birthdate'] ?? null;

        if (!empty($data['password'])) {
            $user->password = \Illuminate\Support\Facades\Hash::make($data['password']);
            // $user->password_plaintext = $data['password']; // if you really must
        }

        if (array_key_exists('id_card_url', $data)) {
            $user->id_card_url = $data['id_card_url']; // mutator converts to path
        }
        if (array_key_exists('commercial_register_url', $data)) {
            $user->commercial_register_url = $data['commercial_register_url']; // mutator converts to path
        }

        $user->save();

        return response()->json([
            'user' => $user->only([
                'id',
                'name',
                'full_name',
                'email',
                'birthdate',
                'email_verified_at',
                'id_card_url',
                'commercial_register_url',
                'is_verified',
                'created_at',
                'updated_at'
            ]),
            'message' => 'Profile updated',
        ]);
    }


    public function upload(Request $request)
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                // allow common image types + PDF (CR scans)
                'mimes:jpg,jpeg,png,webp,pdf',
                'max:5120', // 5 MB
            ],
        ]);

        $user = $request->user();
        $disk = 'public'; // make sure you ran: php artisan storage:link

        // Store under /storage/app/public/users/{id}/docs/...
        $path = $request->file('file')->store("users/{$user->id}/docs", $disk);
        $url = url(Storage::disk($disk)->url($path)); // absolute https://yourapp.com/storage/...

        return response()->json([
            'url' => $url,
            'path' => $path, // optional, sometimes handy for admins
            'message' => 'File uploaded',
        ], 201);
    }
}
