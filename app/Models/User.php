<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'role',
        'name',
        'full_name',
        'email',
        'birthdate',
        'password',
        'password_plaintext',
        'id_card_url',
        'commercial_register_url',
        'is_verified',
    ];

    protected $hidden = ['password', 'password_plaintext', 'remember_token'];

    protected $appends = ['role_label', 'role_key'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'role'              => UserRole::class,
            'birthdate'         => 'date',
            'is_verified'       => 'boolean',
        ];
    }

    /* ========= URL helpers ========= */

    // Return absolute URL when serializing
    public function getIdCardUrlAttribute($value): ?string
    {
        return $this->toPublicUrl($value);
    }

    public function getCommercialRegisterUrlAttribute($value): ?string
    {
        return $this->toPublicUrl($value);
    }

    // Always store only the relative path
    public function setIdCardUrlAttribute($value): void
    {
        $this->attributes['id_card_url'] = $this->toStoragePath($value);
    }

    public function setCommercialRegisterUrlAttribute($value): void
    {
        $this->attributes['commercial_register_url'] = $this->toStoragePath($value);
    }
    
    protected function toPublicUrl(?string $path): ?string
    {
        if (!$path) return null;

        // If already absolute (e.g. S3 URL), keep it
        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        // Default: build URL relative to your app base
        // Replace "storage" with "storages" if that's what you want exposed
        return url('storage/' . ltrim($path, '/'));
    }


    protected function toStoragePath(?string $value): ?string
    {
        if (!$value) return null;

        // If they sent back our absolute URL (https://app.com/storage/xyz),
        // strip the "/storage/" prefix to keep only the relative path.
        if (preg_match('#^https?://#i', $value)) {
            $parsed = parse_url($value);
            $path = $parsed['path'] ?? '';
            // Typical public disk URLs look like "/storage/users/123/docs/file.pdf"
            if (str_starts_with($path, '/storage/')) {
                return ltrim(substr($path, strlen('/storage/')), '/'); // "users/123/docs/file.pdf"
            }
            // If it doesn't match our public disk pattern, keep as-is (or you can null it)
            return $value;
        }

        // If it's already a relative path (e.g., "users/123/docs/file.pdf"), keep it
        return ltrim($value, '/');
    }

    /* ========= Role helpers ========= */

    public function isAdmin(): bool
    {
        return $this->role === UserRole::ADMIN;
    }
    public function isManager(): bool
    {
        return $this->role === UserRole::MODERATOR;
    }
    public function isUser(): bool
    {
        return $this->role === UserRole::USER;
    }

    public function getRoleLabelAttribute(): string
    {
        return $this->role->label();
    }
    public function getRoleKeyAttribute(): string
    {
        return $this->role->name;
    }

    /* ========= Relations ========= */

    public function currentCart()
    {
        return $this->hasOne(Order::class)->where('status', 'cart');
    }
    public function shippingAddresses()
    {
        return $this->hasMany(UserShippingAddress::class);
    }
    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
