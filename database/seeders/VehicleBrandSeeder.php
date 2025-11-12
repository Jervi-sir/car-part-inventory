<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class VehicleBrandSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('vehicle_brands')->truncate();
        $now = Carbon::now();

        $brands = [
            'Toyota','Volkswagen','Renault','Peugeot','Dacia','Hyundai','Kia','Nissan','Ford','Chevrolet',
            'BMW','Mercedes-Benz','Audi','Opel','Skoda','Seat','Fiat','Citroën','Honda','Mazda',
            'Mitsubishi','Subaru','Volvo','Jeep','Land Rover'
        ];

        DB::table('vehicle_brands')->insert(array_map(fn($b) => [
            'name' => $b,
            'logo_url' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ], $brands));

    }
}
