<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryMethod extends Model
{
    public $timestamps = false; // migration didn’t define timestamps
    protected $fillable = ['code', 'label']; 
}
