<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id','status_id','delivery_method_id','warehouse_id',
        'ship_to_name','ship_to_phone','ship_to_address',
        'currency','subtotal','discount_total','shipping_total','tax_total','grand_total'
    ];

    public function user(){ return $this->belongsTo(User::class); }
    public function status(){ return $this->belongsTo(OrderStatus::class, 'status_id'); }
    public function deliveryMethod(){ return $this->belongsTo(DeliveryMethod::class, 'delivery_method_id'); }
    public function warehouse(){ return $this->belongsTo(Warehouse::class); }
    public function items(){ return $this->hasMany(OrderItem::class); }
}
