<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VehicleBrand extends Model
{
    public $timestamps = false;
    protected $fillable = ['name'];
    public function models(){ return $this->hasMany(VehicleModel::class, 'brand_id'); }

}
