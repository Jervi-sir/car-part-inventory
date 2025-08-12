<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    protected $fillable = ['part_id','warehouse_id','movement_type','qty_delta','unit_cost','notes'];

    public function part(){ return $this->belongsTo(Part::class); }
    public function warehouse(){ return $this->belongsTo(Warehouse::class); }
}
