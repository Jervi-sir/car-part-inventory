<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Warehouse extends Model
{
    protected $fillable = ['name', 'site_code', 'location_text'];

    public function stocks()
    {
        return $this->hasMany(PartStock::class);
    }
}
