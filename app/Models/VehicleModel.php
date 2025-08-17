<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VehicleModel extends Model
{
    protected $fillable = ['vehicle_brand_id', 'name', 'year_from', 'year_to'];

    public function vehicleBrand()
    {
        return $this->belongsTo(VehicleBrand::class);
    }

    public function brand()
    {
        return $this->belongsTo(VehicleBrand::class, 'vehicle_brand_id');
    }

    public function fitments()
    {
        return $this->hasMany(PartFitment::class);
    }
}
