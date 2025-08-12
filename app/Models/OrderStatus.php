<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderStatus extends Model
{
    public $timestamps = false;
    protected $fillable = ['code','label'];
    protected $table = 'order_statuses';

    public function orders(){ return $this->hasMany(Order::class, 'status_id'); }
}
