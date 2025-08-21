<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TelegramLink extends Model
{
    protected $fillable = ['user_id','state','telegram_user_id','chat_id','username','first_name','last_name','linked_at'];

}
