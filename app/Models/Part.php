<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Part extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'sku',
        'barcode',
        'name',
        'description',
        'manufacturer_id',
        'price_retail_ttc',
        'price_wholesale_ttc',
        'tva_rate',
        'stock_real',
        'stock_available',
        'images',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price_retail_ttc'    => 'decimal:2',
            'price_wholesale_ttc' => 'decimal:2',
            'tva_rate'            => 'decimal:2',
            'stock_real'          => 'integer',
            'stock_available'     => 'integer',
            'images'              => 'array',
            'is_active'           => 'boolean',
        ];
    }

    // Relations
    public function manufacturer()
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function fitments()
    {
        return $this->hasMany(PartFitment::class);
    }

    public function models()
    {
        return $this->belongsToMany(VehicleModel::class, 'part_fitments')->withTimestamps();
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
    
    // Scopes
    public function scopeActive($q)
    {
        return $q->where('is_active', true);
    }

    public function scopeSearch($q, ?string $term)
    {
        if (!$term) return $q;
        $term = trim($term);
        return $q->where(function ($w) use ($term) {
            $w->where('reference', 'ILIKE', "%{$term}%")
                ->orWhere('sku', 'ILIKE', "%{$term}%")
                ->orWhere('name', 'ILIKE', "%{$term}%")
                ->orWhere('description', 'ILIKE', "%{$term}%");
        });
    }

    // Convenience: first image
    public function getPrimaryImageAttribute(): ?string
    {
        $imgs = $this->images ?? [];
        return is_array($imgs) && count($imgs) ? ($imgs[0]['url'] ?? $imgs[0]) : null;
    }
}
