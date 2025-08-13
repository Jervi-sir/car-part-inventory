<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VehicleModel extends Model
{
    protected $fillable = ['vehicle_brand_id', 'name'];

    public function vehicleBrand()
    {
        return $this->belongsTo(VehicleBrand::class);
    }

    public function parts()
    {
        return $this->belongsToMany(Part::class, 'part_vehicle_models', 'vehicle_model_id', 'part_id');
    }
}
