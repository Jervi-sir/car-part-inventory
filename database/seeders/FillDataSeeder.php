<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class FillDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now();

        // Manufacturers
        DB::table('manufacturers')->insert([
            ['name' => 'Bosch', 'icon_url' => 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Bosch-logo.png', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Valeo', 'icon_url' => 'https://upload.wikimedia.org/wikipedia/commons/3/38/Valeo_logo.svg', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Denso', 'icon_url' => 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Denso_logo.svg', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Delphi Technologies', 'icon_url' => null, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'NGK Spark Plugs', 'icon_url' => null, 'created_at' => $now, 'updated_at' => $now],
        ]);

        // Vehicle brands
        DB::table('vehicle_brands')->insert([
            ['name' => 'Mercedes-Benz', 'logo_url' => 'https://logo.clearbit.com/mercedes-benz.com', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'BMW', 'logo_url' => 'https://logo.clearbit.com/bmw.com', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Volkswagen', 'logo_url' => 'https://logo.clearbit.com/vw.com', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Toyota', 'logo_url' => 'https://logo.clearbit.com/toyota.com', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Renault', 'logo_url' => 'https://logo.clearbit.com/renault.com', 'created_at' => $now, 'updated_at' => $now],
        ]);

        // Vehicle models
        DB::table('vehicle_models')->insert([
            ['vehicle_brand_id' => 1, 'name' => 'C-Class W204', 'year_from' => 2007, 'year_to' => 2014, 'created_at' => $now, 'updated_at' => $now],
            ['vehicle_brand_id' => 1, 'name' => 'E-Class W212', 'year_from' => 2009, 'year_to' => 2016, 'created_at' => $now, 'updated_at' => $now],
            ['vehicle_brand_id' => 2, 'name' => '3 Series E90', 'year_from' => 2005, 'year_to' => 2012, 'created_at' => $now, 'updated_at' => $now],
            ['vehicle_brand_id' => 2, 'name' => '5 Series F10', 'year_from' => 2010, 'year_to' => 2017, 'created_at' => $now, 'updated_at' => $now],
            ['vehicle_brand_id' => 3, 'name' => 'Golf VI', 'year_from' => 2008, 'year_to' => 2012, 'created_at' => $now, 'updated_at' => $now],
            ['vehicle_brand_id' => 3, 'name' => 'Passat B7', 'year_from' => 2010, 'year_to' => 2015, 'created_at' => $now, 'updated_at' => $now],
            ['vehicle_brand_id' => 4, 'name' => 'Corolla E150', 'year_from' => 2006, 'year_to' => 2013, 'created_at' => $now, 'updated_at' => $now],
            ['vehicle_brand_id' => 4, 'name' => 'Hilux AN120', 'year_from' => 2015, 'year_to' => null, 'created_at' => $now, 'updated_at' => $now],
            ['vehicle_brand_id' => 5, 'name' => 'Clio IV', 'year_from' => 2012, 'year_to' => 2019, 'created_at' => $now, 'updated_at' => $now],
            ['vehicle_brand_id' => 5, 'name' => 'Megane III', 'year_from' => 2008, 'year_to' => 2016, 'created_at' => $now, 'updated_at' => $now],
        ]);


                // Parts
        DB::table('parts')->insert([
            [
                'reference' => '0 986 479 392',
                'sku' => 'BOSCH-BRK-001',
                'barcode' => '3165143456789',
                'name' => 'Bosch Brake Pads Set',
                'description' => 'Front brake pads set for compact vehicles',
                'manufacturer_id' => 1,
                'price_retail_ttc' => 12000,
                'price_wholesale_ttc' => 9500,
                'tva_rate' => 19.00,
                'stock_real' => 50,
                'stock_available' => 48,
                'images' => json_encode(['https://autoparts.example.com/images/bosch-brakepads.jpg']),
                'is_active' => true,
                'created_at' => $now, 'updated_at' => $now
            ],
            [
                'reference' => '582606',
                'sku' => 'VALEO-ALT-582606',
                'barcode' => '3276425826061',
                'name' => 'Valeo Alternator 150A',
                'description' => '150A alternator suitable for VW Passat B7 2.0 TDI',
                'manufacturer_id' => 2,
                'price_retail_ttc' => 68000,
                'price_wholesale_ttc' => 54000,
                'tva_rate' => 19.00,
                'stock_real' => 10,
                'stock_available' => 9,
                'images' => json_encode(['https://autoparts.example.com/images/valeo-alt.jpg']),
                'is_active' => true,
                'created_at' => $now, 'updated_at' => $now
            ],
            [
                'reference' => 'DCP01012',
                'sku' => 'DENSO-CMP-01012',
                'barcode' => null,
                'name' => 'Denso AC Compressor',
                'description' => 'Air conditioning compressor for Toyota Corolla E150',
                'manufacturer_id' => 3,
                'price_retail_ttc' => 95000,
                'price_wholesale_ttc' => 80000,
                'tva_rate' => 19.00,
                'stock_real' => 7,
                'stock_available' => 7,
                'images' => json_encode(['https://autoparts.example.com/images/denso-compressor.jpg']),
                'is_active' => true,
                'created_at' => $now, 'updated_at' => $now
            ],
            [
                'reference' => '2756',
                'sku' => 'NGK-PLUG-2756',
                'barcode' => '0087295127564',
                'name' => 'NGK Spark Plug BKR6E',
                'description' => 'Standard spark plug used in BMW 3 Series E90',
                'manufacturer_id' => 5,
                'price_retail_ttc' => 1200,
                'price_wholesale_ttc' => 800,
                'tva_rate' => 19.00,
                'stock_real' => 300,
                'stock_available' => 295,
                'images' => json_encode(['https://autoparts.example.com/images/ngk-sparkplug.jpg']),
                'is_active' => true,
                'created_at' => $now, 'updated_at' => $now
            ],
        ]);

        // Part fitments
        DB::table('part_fitments')->insert([
            ['part_id' => 1, 'vehicle_model_id' => 5, 'engine_code' => 'CFFB', 'notes' => '2.0 TDI Front Axle', 'created_at' => $now, 'updated_at' => $now],
            ['part_id' => 2, 'vehicle_model_id' => 6, 'engine_code' => 'CFFB', 'notes' => '2.0 TDI 150A Alternator', 'created_at' => $now, 'updated_at' => $now],
            ['part_id' => 3, 'vehicle_model_id' => 7, 'engine_code' => '1ZR-FE', 'notes' => '1.6L Petrol AC Compressor', 'created_at' => $now, 'updated_at' => $now],
            ['part_id' => 4, 'vehicle_model_id' => 3, 'engine_code' => 'N46B20', 'notes' => '2.0 Petrol Spark Plug', 'created_at' => $now, 'updated_at' => $now],
        ]);

        // Users
        DB::table('users')->insert([
            [
                'role' => 0,
                'name' => 'ahmed',
                'full_name' => 'Ahmed Bensaid',
                'email' => 'ahmed@example.com',
                'birthdate' => '1990-05-12',
                'password' => Hash::make('password123'),
                'is_verified' => true,
                'created_at' => $now, 'updated_at' => $now
            ],
            [
                'role' => 0,
                'name' => 'sara',
                'full_name' => 'Sara Merabet',
                'email' => 'sara@example.com',
                'birthdate' => '1995-09-22',
                'password' => Hash::make('password123'),
                'is_verified' => true,
                'created_at' => $now, 'updated_at' => $now
            ],
        ]);

        // Orders
        DB::table('orders')->insert([
            [
                'user_id' => 1,
                'status' => 'confirmed',
                'delivery_method' => 'courier',
                'ship_to_name' => 'Ahmed Bensaid',
                'ship_to_phone' => '+213661234567',
                'ship_to_address' => '12 Rue Didouche Mourad, Alger',
                'subtotal' => 69200,
                'discount_total' => 0,
                'shipping_total' => 1000,
                'tax_total' => 13148,
                'grand_total' => 83348,
                'notes' => 'Customer requested delivery after 6PM',
                'created_at' => $now, 'updated_at' => $now
            ],
            [
                'user_id' => 2,
                'status' => 'pending',
                'delivery_method' => 'pickup',
                'ship_to_name' => 'Sara Merabet',
                'ship_to_phone' => '+213770987654',
                'ship_to_address' => 'Pickup at store - Oran',
                'subtotal' => 2400,
                'discount_total' => 0,
                'shipping_total' => 0,
                'tax_total' => 456,
                'grand_total' => 2856,
                'notes' => null,
                'created_at' => $now, 'updated_at' => $now
            ],
        ]);

        // Order Items
        DB::table('order_items')->insert([
            ['order_id' => 1, 'part_id' => 2, 'quantity' => 1, 'unit_price' => 68000, 'line_total' => 68000, 'created_at' => $now, 'updated_at' => $now],
            ['order_id' => 1, 'part_id' => 1, 'quantity' => 1, 'unit_price' => 12000, 'line_total' => 12000, 'created_at' => $now, 'updated_at' => $now],
            ['order_id' => 2, 'part_id' => 4, 'quantity' => 2, 'unit_price' => 1200, 'line_total' => 2400, 'created_at' => $now, 'updated_at' => $now],
        ]);

        // Order Notes
        DB::table('order_notes')->insert([
            ['order_id' => 1, 'author_id' => 1, 'note' => 'Confirmed payment via BaridiMob. Preparing shipment.', 'is_private' => false, 'created_at' => $now, 'updated_at' => $now],
            ['order_id' => 2, 'author_id' => 2, 'note' => 'Customer wants installation service if possible.', 'is_private' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);

    }
}
