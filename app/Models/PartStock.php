<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartStock extends Model
{
    protected $table = 'part_stock';
    protected $fillable = ['part_id','warehouse_id','qty_on_hand','qty_reserved'];

    public function part(){ return $this->belongsTo(Part::class); }
    public function warehouse(){ return $this->belongsTo(Warehouse::class); }
}
