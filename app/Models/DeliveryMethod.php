<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryMethod extends Model
{
    public $timestamps = false;
    protected $fillable = ['code','label'];
    protected $table = 'delivery_methods';

    public function orders(){ return $this->hasMany(Order::class, 'delivery_method_id'); }
}
