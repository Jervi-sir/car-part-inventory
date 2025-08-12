<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartReferenceType extends Model
{
    public $timestamps = false;
    protected $fillable = ['code','label'];
    protected $table = 'part_reference_types';

    public function references(){ return $this->hasMany(PartReference::class, 'ref_type_id'); }

}
