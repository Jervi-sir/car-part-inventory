<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PriceTier extends Model
{
    public $timestamps = false;
    protected $fillable = ['code','label'];
    protected $table = 'price_tiers';

    public function prices(){ return $this->hasMany(PartPrice::class, 'tier_id'); }

}
