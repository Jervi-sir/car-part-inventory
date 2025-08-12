<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VehicleModel extends Model
{
    protected $fillable = ['brand_id','name','year_from','year_to'];
    public function brand(){ return $this->belongsTo(VehicleBrand::class, 'brand_id'); }
    public function fitments(){ return $this->hasMany(PartFitment::class); }
}
