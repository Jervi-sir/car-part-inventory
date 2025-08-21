<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

class AdCreative extends Model
{
    protected $fillable = [
        'placement','title','subtitle','image_path','image_alt',
        'target_url','weight','status','starts_at','ends_at',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at'   => 'datetime',
    ];

    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn() => Storage::url($this->image_path));
    }
}
