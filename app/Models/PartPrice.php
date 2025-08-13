<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartPrice extends Model
{
    protected $fillable = [
        'part_id',
        'price_tier_id', // Or 'tier_id' if that’s the column name
        'tier_id',
        'min_qty',
        'price',
        'currency',
    ];

    public function part()
    {
        return $this->belongsTo(Part::class);
    }

    public function priceTier()
    {
        return $this->belongsTo(PriceTier::class, 'price_tier_id');
    }
}


