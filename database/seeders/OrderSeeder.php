<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class OrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('orders')->truncate();
        DB::table('order_items')->truncate();
        DB::table('order_notes')->truncate();

        $now = Carbon::now();

        $userIds = DB::table('users')->pluck('id')->all();
        $partIds = DB::table('parts')->inRandomOrder()->limit(50)->pluck('id')->all();

        if (count($userIds) < 1 || count($partIds) < 5) return;

        for ($o = 0; $o < 5; $o++) {
            $userId = $userIds[array_rand($userIds)];

            $orderId = DB::table('orders')->insertGetId([
                'user_id' => $userId,
                'status' => ['pending','confirmed','preparing','shipped','completed'][array_rand([0,1,2,3,4])],
                'delivery_method' => ['pickup','courier','post'][array_rand([0,1,2])],
                'ship_to_name' => DB::table('users')->where('id',$userId)->value('full_name') ?: 'Customer',
                'ship_to_phone' => '+213555'.random_int(100000,999999),
                'ship_to_address' => 'Example Street '.random_int(1,99).', Algeria',
                'subtotal' => 0,
                'discount_total' => 0,
                'shipping_total' => random_int(500, 2500)/100,
                'tax_total' => 0,
                'grand_total' => 0,
                'notes' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $itemsCount = random_int(2, 6);
            $picked = (array)array_rand($partIds, $itemsCount);
            $subtotal = 0; $taxTotal = 0;

            foreach ($picked as $idx) {
                $pid = $partIds[$idx];
                $p = DB::table('parts')->where('id',$pid)->first(['price_retail_ttc','tva_rate']);
                $qty = random_int(1, 3);
                $unit = $p->price_retail_ttc ?? 100;
                $line = round($unit * $qty, 2);
                $subtotal += $line;
                $taxTotal += round($line * (($p->tva_rate ?? 0)/100), 2);

                DB::table('order_items')->insert([
                    'order_id' => $orderId,
                    'part_id' => $pid,
                    'quantity' => $qty,
                    'unit_price' => $unit,
                    'line_total' => $line,
                    'notes' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $grand = round($subtotal + $taxTotal + (float)DB::table('orders')->where('id',$orderId)->value('shipping_total'), 2);
            DB::table('orders')->where('id',$orderId)->update([
                'subtotal' => round($subtotal,2),
                'tax_total' => round($taxTotal,2),
                'grand_total' => $grand,
                'updated_at' => Carbon::now(),
            ]);

            DB::table('order_notes')->insert([
                'order_id' => $orderId,
                'author_id' => $userId,
                'note' => 'Please deliver after 17:00.',
                'is_private' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

    }
}
