<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserShippingAddress extends Model
{
    protected $fillable = [
        'label','recipient_name','phone', 'user_id',
        'address_line1','address_line2','city','state','postal_code','country',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public function user() 
    {
        return $this->belongsTo(User::class);
    }
}
