<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartImage extends Model
{
    protected $fillable = ['part_id','url','sort_order'];
    public function part(){ return $this->belongsTo(Part::class); }

}
