<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VehicleModel extends Model
{
    use HasFactory;

    protected $fillable = ['vehicle_brand_id', 'name', 'year_from', 'year_to'];

    public function brand()
    {
        return $this->belongsTo(VehicleBrand::class, 'vehicle_brand_id');
    }
    public function parts()
    {
        return $this->belongsToMany(Part::class, 'part_fitments')->withTimestamps();
    }
    public function fitments()
    {
        return $this->hasMany(PartFitment::class);
    }

    public function vehicleBrand()
    {
        return $this->belongsTo(VehicleBrand::class, 'vehicle_brand_id');
    }
}
