<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserShippingAddress extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id','label','recipient_name','phone','address_line1','address_line2',
        'city','state','postal_code','country','is_default',
    ];

    protected function casts(): array
    {
        return ['is_default' => 'boolean'];
    }

    public function user() 
    {
        return $this->belongsTo(User::class);
    }
}
