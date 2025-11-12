<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class VehicleModelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('vehicle_models')->truncate();
        $now = Carbon::now();

        // brand => models [name, year_from, year_to]
        $map = [
            'Toyota' => [
                ['Corolla', 2002, 2025], ['Yaris', 2005, 2025], ['Hilux', 2000, 2025], ['Camry', 2007, 2025],
            ],
            'Volkswagen' => [
                ['Golf', 2004, 2025], ['Polo', 2005, 2025], ['Passat', 2005, 2022], ['Tiguan', 2008, 2025],
            ],
            'Renault' => [
                ['Clio', 2005, 2025], ['Megane', 2006, 2024], ['Symbol', 2008, 2020], ['Duster', 2010, 2025],
            ],
            'Peugeot' => [
                ['206', 2000, 2013], ['207', 2006, 2014], ['208', 2012, 2025], ['301', 2012, 2025],
            ],
            'Dacia' => [
                ['Logan', 2005, 2025], ['Sandero', 2008, 2025], ['Duster', 2010, 2025],
            ],
            'Hyundai' => [
                ['i10', 2008, 2025], ['i20', 2008, 2025], ['Elantra', 2006, 2025], ['Accent', 2006, 2022],
            ],
            'Kia' => [
                ['Rio', 2005, 2025], ['Picanto', 2005, 2025], ['Cerato', 2007, 2025], ['Sportage', 2008, 2025],
            ],
            'Nissan' => [
                ['Micra', 2003, 2020], ['Qashqai', 2007, 2025], ['Sunny', 2011, 2020], ['Navara', 2005, 2025],
            ],
            'Ford' => [
                ['Fiesta', 2004, 2023], ['Focus', 2005, 2025], ['Ranger', 2006, 2025],
            ],
            'BMW' => [
                ['3 Series', 2005, 2025], ['5 Series', 2006, 2025], ['X5', 2007, 2025],
            ],
            'Mercedes-Benz' => [
                ['C-Class', 2005, 2025], ['E-Class', 2007, 2025], ['GLC', 2015, 2025],
            ],
            'Audi' => [
                ['A3', 2005, 2025], ['A4', 2005, 2025], ['Q5', 2009, 2025],
            ],
            'Opel' => [
                ['Corsa', 2005, 2025], ['Astra', 2005, 2025],
            ],
            'Skoda' => [
                ['Octavia', 2005, 2025], ['Fabia', 2005, 2025],
            ],
            'Fiat' => [
                ['Punto', 2003, 2018], ['Tipo', 2016, 2025],
            ],
            'Citroën' => [
                ['C3', 2005, 2025], ['C4', 2005, 2025],
            ],
            'Honda' => [
                ['Civic', 2005, 2025], ['Accord', 2005, 2020],
            ],
            'Mazda' => [
                ['Mazda3', 2006, 2025],
            ],
            'Mitsubishi' => [
                ['Lancer', 2005, 2019], ['L200', 2006, 2025],
            ],
            'Subaru' => [
                ['Impreza', 2005, 2025],
            ],
            'Volvo' => [
                ['S60', 2005, 2025],
            ],
            'Jeep' => [
                ['Cherokee', 2005, 2022],
            ],
            'Land Rover' => [
                ['Discovery', 2005, 2025],
            ],
        ];

        $brandIds = DB::table('vehicle_brands')->pluck('id', 'name');
        $rows = [];
        foreach ($map as $brand => $models) {
            $brandId = $brandIds[$brand] ?? null;
            if (!$brandId) continue;
            foreach ($models as [$name, $yf, $yt]) {
                $rows[] = [
                    'vehicle_brand_id' => $brandId,
                    'name' => $name,
                    'year_from' => $yf,
                    'year_to' => $yt,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }
        DB::table('vehicle_models')->insert($rows);

    }
}
