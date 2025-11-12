<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ManufacturerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('manufacturers')->truncate();
        $now = Carbon::now();

        $names = [
            'Bosch','Denso','Valeo','Delphi','Mahle','NGK','Aisin','Brembo','TRW','Sachs',
            'KYB','Dayco','Gates','Hella','ContiTech','Ferodo','Mann-Filter','Varta','Bilstein','LUK',
            'SKF','Monroe','Magneti Marelli','Nissens','Pierburg','Textar','Pagid','Blueprint','Febi Bilstein','Lemforder'
        ];

        $rows = [];
        foreach ($names as $n) {
            $rows[] = [
                'name' => $n,
                'icon_url' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        DB::table('manufacturers')->insert($rows);

    }
}
