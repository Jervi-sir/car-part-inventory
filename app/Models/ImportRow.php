<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportRow extends Model
{
    public $timestamps = false;
    protected $fillable = ['import_source_id','raw_json','matched_part_id','processed_at'];

    public function source(){ return $this->belongsTo(ImportSource::class, 'import_source_id'); }
    public function part(){ return $this->belongsTo(Part::class, 'matched_part_id'); }
}
