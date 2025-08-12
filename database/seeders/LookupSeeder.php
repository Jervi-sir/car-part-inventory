<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LookupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('part_reference_types')->upsert([
            ['id'=>1,'code'=>'OEM','label'=>'OEM Reference'],
            ['id'=>2,'code'=>'AFTERMARKET','label'=>'Aftermarket Reference'],
            ['id'=>3,'code'=>'SUPPLIER','label'=>'Supplier Reference'],
            ['id'=>4,'code'=>'EAN_UPC','label'=>'EAN/UPC'],
            ['id'=>5,'code'=>'OTHER','label'=>'Other'],
        ], ['id']);

        DB::table('price_tiers')->upsert([
            ['id'=>1,'code'=>'RETAIL','label'=>'Retail'],
            ['id'=>2,'code'=>'DEMI_GROS','label'=>'Demi-gros'],
            ['id'=>3,'code'=>'GROS','label'=>'Gros'],
            ['id'=>4,'code'=>'APPLIQUE','label'=>'Appliqué'],
        ], ['id']);

        DB::table('order_statuses')->upsert([
            ['id'=>1,'code'=>'DRAFT','label'=>'Draft'],
            ['id'=>2,'code'=>'PLACED','label'=>'Placed'],
            ['id'=>3,'code'=>'CONFIRMED','label'=>'Confirmed'],
            ['id'=>4,'code'=>'PICKING','label'=>'Picking'],
            ['id'=>5,'code'=>'SHIPPED','label'=>'Shipped'],
            ['id'=>6,'code'=>'CANCELLED','label'=>'Cancelled'],
        ], ['id']);

        DB::table('delivery_methods')->upsert([
            ['id'=>1,'code'=>'PICKUP','label'=>'Pickup at Warehouse'],
            ['id'=>2,'code'=>'COURIER','label'=>'Courier'],
            ['id'=>3,'code'=>'POST','label'=>'Post'],
        ], ['id']);

    }
}
