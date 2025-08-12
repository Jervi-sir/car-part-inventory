<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Manufacturer extends Model
{
    protected $fillable = ['name'];
    public function parts(){ return $this->hasMany(Part::class); }

}
