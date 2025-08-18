<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PartFitment extends Model
{
    use HasFactory;

    protected $fillable = ['part_id', 'vehicle_model_id', 'engine_code', 'notes'];

    public function part()
    {
        return $this->belongsTo(Part::class);
    }
    
    public function model()
    {
        return $this->belongsTo(VehicleModel::class, 'vehicle_model_id');
    }

    public function vehicleModel() 
    {
        return $this->belongsTo(VehicleModel::class, 'vehicle_model_id');
    }
}
