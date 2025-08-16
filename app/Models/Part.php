<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Part extends Model
{
    protected $fillable = [
        'manufacturer_id', 'category_id', 'sku', 'name', 'description',
        'package_qty', 'min_order_qty', 'price_retail', 'price_demi_gros',
        'price_gros', 'images', 'min_qty_gros', 'is_active'
    ];

    protected $casts = [
        'images' => 'array',
        'is_active' => 'boolean'
    ];

    public function manufacturer()
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function references()
    {
        return $this->hasMany(PartReference::class);
    }

    public function fitments()
    {
        return $this->hasMany(PartFitment::class);
    }

    public function stock()
    {
        return $this->hasOne(PartStock::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
