<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartReference extends Model
{
    protected $fillable = ['part_id', 'type', 'code', 'source_brand'];

    public function part()
    {
        return $this->belongsTo(Part::class);
    }
}
