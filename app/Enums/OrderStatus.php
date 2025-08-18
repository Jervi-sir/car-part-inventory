<?php
namespace App\Enums;

enum OrderStatus:string
{
    case CART      = 'cart';
    case PENDING   = 'pending';
    case CONFIRMED = 'confirmed';
    case PREPARING = 'preparing';
    case SHIPPED   = 'shipped';
    case COMPLETED = 'completed';
    case CANCELED  = 'canceled';
}
