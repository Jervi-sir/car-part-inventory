<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PartStock extends Model
{
    protected $fillable = ['part_id', 'warehouse_id', 'qty', 'low_stock_threshold'];

    public function part()
    {
        return $this->belongsTo(Part::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
}
