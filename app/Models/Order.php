<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id', 'status', 'delivery_method',
        'ship_to_name', 'ship_to_phone', 'ship_to_address',
        'currency', 'subtotal', 'discount_total',
        'shipping_total', 'tax_total', 'grand_total',
        'notes',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function notes()
    {
        return $this->hasOne(OrderNote::class);
    }
}
