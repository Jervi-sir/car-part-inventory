<?php

namespace App\Helpers;

class GeneralHelper
{
    /**
     * Create a new class instance.
     */
    public function __construct()
    {
        //
    }

    public static function PartReferenceTypes() 
    {
        return ['OEM', 'AFTERMARKET', 'SUPPLIER', 'EAN_UPC', 'OTHER'];
    }

    public static function OrderStatus()
    {
        return ['pending', 'confirmed', 'preparing', 'shipped', 'completed', 'canceled'];
    }

    public static function DeliveryMethod()
    {
        return ['pickup', 'courier', 'post'];
    }
}
