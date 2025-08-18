<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Part extends Model
{
    protected $fillable = [
        'manufacturer_id',
        'category_id',
        'sku',
        'name',
        'description',
        'package_qty',
        'min_order_qty',
        'price_retail',
        'price_demi_gros',
        'price_gros',
        'min_qty_gros',
        'images',
        'is_active',
    ];

    protected $casts = [
        'images'    => 'array',
        'is_active' => 'boolean',
        'price_retail' => 'decimal:2',
        'price_demi_gros' => 'decimal:2',
        'price_gros' => 'decimal:2',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function manufacturer()
    {
        return $this->belongsTo(Manufacturer::class);
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

    // Convenience: first image
    public function getPrimaryImageAttribute(): ?string
    {
        $imgs = $this->images ?? [];
        return is_array($imgs) && count($imgs) ? ($imgs[0]['url'] ?? $imgs[0]) : null;
    }
    
    // Optional search scope
    public function scopeSearch($q, ?string $term)
    {
        if (!$term) return $q;
        $term = trim($term);
        return $q->where(function ($qq) use ($term) {
            $qq->where('name', 'like', "%{$term}%")
               ->orWhere('sku', 'like', "%{$term}%")
               ->orWhere('description', 'like', "%{$term}%");
        });
    }

}
