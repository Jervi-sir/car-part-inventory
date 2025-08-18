<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Manufacturer extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'icon_url'];

    public function parts()
    {
        return $this->hasMany(Part::class);
    }
}
