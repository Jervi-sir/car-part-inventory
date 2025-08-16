<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['name', 'is_special', 'icon_url'];

    public function parts()
    {
        return $this->hasMany(Part::class);
    }
}
