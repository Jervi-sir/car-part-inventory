<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdClick extends Model
{
    protected $fillable = [
        'creative_id','placement','target_url','referer','ip','user_agent',
        'utm_source','utm_medium','utm_campaign','utm_content','utm_term',
    ];

}
