<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DeliveryMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('delivery_methods')->truncate();

        DB::table('delivery_methods')->insert([
            ['code' => 'pickup',  'label' => 'Store Pickup'],
            ['code' => 'courier', 'label' => 'Local Courier'],
            ['code' => 'post',    'label' => 'Postal Service'],
        ]);

    }
}
