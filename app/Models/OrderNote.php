<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderNote extends Model
{
    use HasFactory;

    protected $fillable = ['order_id', 'author_id', 'note', 'is_private'];

    protected function casts(): array
    {
        return ['is_private' => 'boolean'];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
