<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = ['order_id', 'part_id', 'quantity', 'unit_price', 'line_total', 'notes'];

    protected function casts(): array
    {
        return [
            'quantity'   => 'int',
            'unit_price' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function part()
    {
        return $this->belongsTo(Part::class);
    }

    protected static function booted()
    {
        static::saving(function (self $item) {
            // Auto-calc line_total if not explicitly set
            if ($item->unit_price !== null && $item->quantity !== null) {
                $item->line_total = $item->quantity * $item->unit_price;
            }
        });
    }

}
