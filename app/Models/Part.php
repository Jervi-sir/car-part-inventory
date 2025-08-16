<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Part extends Model
{
    protected $fillable = [
        'category_id','manufacturer_id','sku','name','description',
        'package_qty','min_order_qty','currency','base_price','is_active'
    ];

    public function category(){ return $this->belongsTo(Category::class); }
    public function manufacturer(){ return $this->belongsTo(Manufacturer::class); }

    public function references(){ return $this->hasMany(PartReference::class); }
    public function fitments(){ return $this->hasMany(PartFitment::class); }
    public function images(){ return $this->hasMany(PartImage::class); }
    public function prices(){ return $this->hasMany(PartPrice::class); }

    public function stocks(){ return $this->hasMany(PartStock::class); }
    public function orderItems(){ return $this->hasMany(OrderItem::class); }

}
