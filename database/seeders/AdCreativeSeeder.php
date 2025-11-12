<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;


class AdCreativeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('ad_clicks')->truncate();
        DB::table('ad_creatives')->truncate();
        $now = Carbon::now();

        DB::table('ad_creatives')->insert([
            [
                'placement' => 'hero',
                'title' => 'Winter Service Deals',
                'subtitle' => 'Up to 20% off brakes & filters',
                'image_path' => 'ads/winter-service.jpg',
                'image_alt' => 'Mechanic changing brake pads',
                'target_url' => 'https://example.com/deals/winter',
                'weight' => 2,
                'status' => 'active',
                'starts_at' => $now->copy()->subWeek(),
                'ends_at' => $now->copy()->addMonth(),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'placement' => 'grid',
                'title' => 'Batteries In Stock',
                'subtitle' => 'Varta, Bosch & more',
                'image_path' => 'ads/batteries.jpg',
                'image_alt' => 'Car battery on shelf',
                'target_url' => 'https://example.com/category/batteries',
                'weight' => 1,
                'status' => 'active',
                'starts_at' => $now->copy()->subDays(2),
                'ends_at' => $now->copy()->addDays(30),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

    }
}
