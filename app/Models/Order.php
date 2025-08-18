<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'status',
        'delivery_method',
        'ship_to_name',
        'ship_to_phone',
        'ship_to_address',
        'subtotal',
        'discount_total',
        'shipping_total',
        'tax_total',
        'grand_total',
        'notes'
    ];

    protected function casts(): array
    {
        return [
            'status'          => OrderStatus::class,
            'delivery_method' => DeliveryMethod::class,
            'subtotal'        => 'decimal:2',
            'discount_total'  => 'decimal:2',
            'shipping_total'  => 'decimal:2',
            'tax_total'       => 'decimal:2',
            'grand_total'     => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
    
    // Helpers
    public function recalcTotals(): void
    {
        $sum = $this->items->sum(fn($i) => $i->line_total);
        $this->subtotal = $sum;
        $this->tax_total = 0; // set if you implement per-item VAT later
        $this->grand_total = $this->subtotal - $this->discount_total + $this->shipping_total + $this->tax_total;
    }

}
