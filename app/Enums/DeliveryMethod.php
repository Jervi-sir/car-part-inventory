<?php
namespace App\Enums;

enum DeliveryMethod:string
{
    case PICKUP  = 'pickup';
    case COURIER = 'courier';
    case POST    = 'post';
}
