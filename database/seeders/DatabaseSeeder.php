<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // User::firstOrCreate(
        //     ['email' => 'test@example.com'],
        //     [
        //         'name' => 'Test User',
        //         'password' => Hash::make('password'),
        //         'email_verified_at' => now(),
        //     ]
        // );
        // $fill_data = new FillDataSeeder2();
        // $fill_data->run();
        $this->call([
            DeliveryMethodSeeder::class,
            UserSeeder::class,
            ManufacturerSeeder::class,
            VehicleBrandSeeder::class,
            VehicleModelSeeder::class,
            PartSeeder::class,            // creates ≥200 parts
            PartFitmentSeeder::class,
            OrderSeeder::class,
            AdCreativeSeeder::class,
        ]);
    }
}
