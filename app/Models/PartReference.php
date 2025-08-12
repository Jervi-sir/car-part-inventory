<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartReference extends Model
{
    protected $fillable = ['part_id','ref_type_id','reference_code','source_brand'];
    protected $table = 'part_references';

    public function part(){ return $this->belongsTo(Part::class); }
    public function type(){ return $this->belongsTo(PartReferenceType::class, 'ref_type_id'); }

}
