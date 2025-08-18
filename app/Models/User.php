<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

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
    ];


    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'password_plaintext',
        'remember_token',
    ];


    protected $appends = ['role_label', 'role_key'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    // ---- Role helpers (keep yours) ----
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
    // ---- Accessors for frontend ----
    public function getRoleLabelAttribute(): string
    {
        // Human-readable label from your enum
        return $this->role->label();
    }

    public function getRoleKeyAttribute(): string
    {
        // 'USER' | 'MODERATOR' | 'ADMIN' (enum case name)
        return $this->role->name;
    }

    public function currentCart()
    {
        return $this->hasOne(Order::class)->where('status', 'cart');
    }

    // ---- Relations ----
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function shippingAddresses()
    {
        return $this->hasMany(UserShippingAddress::class);
    }

}
