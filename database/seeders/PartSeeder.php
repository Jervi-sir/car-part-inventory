<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PartSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('parts')->truncate();
        $now = Carbon::now();

        $manufacturerIds = DB::table('manufacturers')->pluck('id')->all();
        $tva = 19.00;

        // Base generators
        $categories = [
            'Brake Pad Set Front','Brake Pad Set Rear','Brake Disc Front','Brake Disc Rear','Brake Shoe Set',
            'Oil Filter','Air Filter','Cabin Filter','Fuel Filter','Transmission Filter',
            'Spark Plug','Glow Plug','Ignition Coil','Alternator','Starter Motor',
            'Timing Belt Kit','Serpentine Belt','Water Pump','Thermostat','Radiator',
            'Clutch Kit','Flywheel','Shock Absorber Front','Shock Absorber Rear','Coil Spring',
            'Lower Control Arm','Upper Control Arm','Stabilizer Link','Tie Rod End','Ball Joint',
            'Wheel Bearing Kit','CV Joint','Drive Shaft','Exhaust Muffler','Catalytic Converter',
            'Oxygen Sensor','MAP Sensor','MAF Sensor','ABS Sensor','Crankshaft Sensor',
            'Headlight Bulb H7','Headlight Bulb H4','Wiper Blade 24\"','Wiper Blade 16\"','Window Regulator',
            'Door Lock Actuator','Mirror Glass','Bumper Clip Set','Engine Mount','Gearbox Mount',
            'Power Steering Pump','AC Compressor','AC Condenser','Heater Core','Blower Motor',
            'Injector','Fuel Pump','EGR Valve','DPF Filter','Turbocharger',
            'Wheel Rim 16\"','Wheel Rim 17\"','Tyre 195/65 R15','Tyre 205/55 R16','Battery 60Ah',
        ];

        $variants = ['OE','Aftermarket','Performance','HD','Eco','Pro'];
        $materials = ['Ceramic','Semi-Metallic','Organic','Silicone','Rubber','Steel','Aluminum'];

        $rows = [];
        $count = 0;
        $skuCounter = 1;

        // deterministic helper
        $rand = function(array $arr) { return $arr[array_rand($arr)]; };

        // generate at least 220 parts
        for ($i = 0; $i < 220; $i++) {
            $cat = $categories[$i % count($categories)];
            $variant = $variants[array_rand($variants)];
            $material = $materials[array_rand($materials)];

            $name = $cat . ' ' . $variant;
            $sku = 'PRT-' . str_pad((string)$skuCounter++, 6, '0', STR_PAD_LEFT);
            $ref = strtoupper(Str::random(5)) . '-' . strtoupper(Str::random(4));
            $barcode = '2' . str_pad((string)random_int(100000000000, 999999999999), 12, '0', STR_PAD_LEFT);

            $retail = random_int(1500, 45000) / 100; // 15.00–450.00
            $wholesale = max(0.01, round($retail * 0.85, 2));

            $stockReal = random_int(0, 120);
            $stockAvailable = max(0, $stockReal - random_int(0, 10));

            $rows[] = [
                'reference' => $ref,
                'sku' => $sku,
                'barcode' => $barcode,
                'name' => $name,
                'description' => $material . ' ' . $cat . ' designed for durability and fit.',
                'manufacturer_id' => $manufacturerIds[array_rand($manufacturerIds)] ?? null,
                'price_retail_ttc' => $retail,
                'price_wholesale_ttc' => $wholesale,
                'tva_rate' => $tva,
                'stock_real' => $stockReal,
                'stock_available' => $stockAvailable,
                'images' => json_encode([
                    'https://picsum.photos/seed/'.urlencode($sku).'/640/480',
                ]),
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $count++;
        }

        // add some named examples for realism (optional)
        $extra = [
            ['Brake Fluid DOT4 1L','FLD-'.Str::upper(Str::random(6))],
            ['Coolant G12+ 5L','COL-'.Str::upper(Str::random(6))],
            ['Engine Oil 5W-30 4L','OIL-'.Str::upper(Str::random(6))],
            ['ATF Dexron VI 1L','ATF-'.Str::upper(Str::random(6))],
            ['Hydraulic Jack 2T','TOOL-'.Str::upper(Str::random(6))],
        ];

        foreach ($extra as [$title,$sk]) {
            $rows[] = [
                'reference' => strtoupper(Str::random(4)).'-'.strtoupper(Str::random(4)),
                'sku' => $sk,
                'barcode' => null,
                'name' => $title,
                'description' => $title.' — workshop essential.',
                'manufacturer_id' => $manufacturerIds[array_rand($manufacturerIds)] ?? null,
                'price_retail_ttc' => random_int(1000, 25000)/100,
                'price_wholesale_ttc' => random_int(800, 20000)/100,
                'tva_rate' => $tva,
                'stock_real' => random_int(5, 60),
                'stock_available' => random_int(3, 55),
                'images' => json_encode([
                    'https://picsum.photos/seed/'.urlencode($sk).'/640/480',
                ]),
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('parts')->insert($rows);

    }
}
