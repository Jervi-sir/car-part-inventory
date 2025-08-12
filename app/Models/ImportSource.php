<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportSource extends Model
{
    public $timestamps = false;
    protected $fillable = ['filename','source_type','imported_by','imported_at','notes'];

    public function rows(){ return $this->hasMany(ImportRow::class, 'import_source_id'); }
}
