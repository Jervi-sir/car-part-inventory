<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PartFitmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('part_fitments')->truncate();
        $now = Carbon::now();

        $partIds = DB::table('parts')->pluck('id')->all();
        $modelIds = DB::table('vehicle_models')->pluck('id')->all();
        if (!$partIds || !$modelIds) return;

        $rows = [];
        $seen = [];
        foreach ($partIds as $pid) {
            // 1–3 random fitments per part
            $num = random_int(1, 3);
            $picked = (array)array_rand($modelIds, min($num, count($modelIds)));
            foreach ($picked as $idx) {
                $mid = $modelIds[$idx];
                $key = $pid.'-'.$mid;
                if (isset($seen[$key])) continue;
                $seen[$key] = true;

                $rows[] = [
                    'part_id' => $pid,
                    'vehicle_model_id' => $mid,
                    'engine_code' => random_int(0,1) ? 'EC'.random_int(100,999) : null,
                    'notes' => random_int(0,1) ? 'Direct fit' : null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        // Insert in chunks for performance
        foreach (array_chunk($rows, 1000) as $chunk) {
            DB::table('part_fitments')->insert($chunk);
        }

    }
}
