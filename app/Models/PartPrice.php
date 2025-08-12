<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartPrice extends Model
{
    protected $fillable = ['part_id','tier_id','min_qty','price','currency'];

    public function part(){ return $this->belongsTo(Part::class); }
    public function tier(){ return $this->belongsTo(PriceTier::class, 'tier_id'); }
}
