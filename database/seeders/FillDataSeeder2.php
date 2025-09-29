<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class FillDataSeeder2 extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $faker = \Faker\Factory::create('fr_FR'); // DZ-friendly formatting

            // -------------------------
            // 0) Delivery Methods (static)
            // -------------------------
            $deliveryMethods = [
                ['id' => 1, 'code' => 'PICKUP',  'label' => 'Retrait en magasin'],
                ['id' => 2, 'code' => 'COURIER', 'label' => 'Coursier'],
                ['id' => 3, 'code' => 'POST',    'label' => 'Poste'],
            ];
            DB::table('delivery_methods')->insertOrIgnore($deliveryMethods);

            // -------------------------
            // 1) Manufacturers
            // -------------------------
            $manufacturers = [
                'Bosch','Valeo','Denso','Mahle','NGK','Brembo','Continental','SKF','MANN-FILTER','Gates',
                'Hella','Delphi','Sachs','Febi Bilstein','TRW','Ferodo','KYB','Dayco','Zimmermann','LUK'
            ];
            $manufacturerRows = [];
            $now = Carbon::now();
            foreach ($manufacturers as $name) {
                $manufacturerRows[] = [
                    'name'       => $name,
                    'icon_url'   => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            DB::table('manufacturers')->insert($manufacturerRows);
            $manufacturerIds = DB::table('manufacturers')->pluck('id')->all();

            // -------------------------
            // 2) Vehicle Brands & Models
            // -------------------------
            $brands = [
                'Renault','Peugeot','Volkswagen','Audi','BMW','Mercedes-Benz','Toyota','Hyundai','Kia',
                'Dacia','Fiat','Seat','Skoda','Nissan','Ford'
            ];

            $brandRows = [];
            foreach ($brands as $b) {
                $brandRows[] = [
                    'name'       => $b,
                    'logo_url'   => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            DB::table('vehicle_brands')->insert($brandRows);
            $brandMap = DB::table('vehicle_brands')->pluck('id','name')->all();

            $modelNames = [
                'Clio','Megane','Symbol','208','308','3008','Golf','Polo','Passat','A3','A4','A6',
                'Serie 1','Serie 3','Serie 5','C-Class','E-Class','Corolla','Yaris','i10','i20','i30',
                'Sportage','Rio','Duster','Logan','Tipo','Ibiza','Leon','Octavia','Fabia','Micra','Qashqai',
                'Fiesta','Focus'
            ];

            $modelRows = [];
            foreach ($brandMap as $brandName => $brandId) {
                // 8–14 models per brand with year ranges
                $count = random_int(8, 14);
                $picked = $faker->randomElements($modelNames, $count);
                foreach ($picked as $mn) {
                    $y1 = $faker->numberBetween(1998, 2016);
                    $y2 = $faker->boolean(70) ? $faker->numberBetween($y1 + 1, 2025) : null; // some "current" models
                    $modelRows[] = [
                        'vehicle_brand_id' => $brandId,
                        'name'             => $mn,
                        'year_from'        => $y1,
                        'year_to'          => $y2,
                        'created_at'       => $now,
                        'updated_at'       => $now,
                    ];
                }
            }
            // unique constraint on (brand_id, name, year_from, year_to)
            // so we dedupe by key before inserting:
            $uniqueKey = [];
            $dedup = [];
            foreach ($modelRows as $row) {
                $k = implode('|', [
                    $row['vehicle_brand_id'],
                    $row['name'],
                    (string)$row['year_from'],
                    (string)($row['year_to'] ?? 'null')
                ]);
                if (!isset($uniqueKey[$k])) {
                    $uniqueKey[$k] = true;
                    $dedup[] = $row;
                }
            }
            foreach (array_chunk($dedup, 500) as $chunk) {
                DB::table('vehicle_models')->insert($chunk);
            }
            $vehicleModelIds = DB::table('vehicle_models')->pluck('id')->all();

            // -------------------------
            // 3) Users + Shipping Addresses
            // -------------------------
            $userRows = [];
            $targetUsers = 30;
            for ($i = 0; $i < $targetUsers; $i++) {
                $fullName = $faker->name();
                $userRows[] = [
                    'role'               => $i === 0 ? 1 : 0,
                    'name'               => Str::before($fullName,' ') ?: $fullName,
                    'full_name'          => $fullName,
                    'email'              => "demo{$i}@" . $faker->freeEmailDomain(),
                    'birthdate'          => $faker->optional(0.6)->date('Y-m-d', '2004-12-31'),
                    'email_verified_at'  => $faker->optional(0.7)->dateTimeBetween('-1 year','now'),
                    'password'           => Hash::make('password'),
                    'password_plaintext' => 'password',
                    'id_card_url'        => null,
                    'commercial_register_url' => null,
                    'is_verified'        => $faker->boolean(40),
                    'remember_token'     => Str::random(10),
                    'created_at'         => $faker->dateTimeBetween('-10 months','-1 months'),
                    'updated_at'         => $now,
                ];
            }
            DB::table('users')->insert($userRows);
            $userIds = DB::table('users')->pluck('id')->all();

            $dzCities = [
                ['city' => 'Alger', 'state' => 'Alger'],
                ['city' => 'Oran', 'state' => 'Oran'],
                ['city' => 'Constantine', 'state' => 'Constantine'],
                ['city' => 'Blida', 'state' => 'Blida'],
                ['city' => 'Sétif', 'state' => 'Sétif'],
                ['city' => 'Annaba', 'state' => 'Annaba'],
                ['city' => 'Batna', 'state' => 'Batna'],
            ];
            $addrRows = [];
            foreach ($userIds as $uid) {
                $count = random_int(0, 2);
                for ($k = 0; $k < $count; $k++) {
                    $c = $faker->randomElement($dzCities);
                    $addrRows[] = [
                        'user_id'        => $uid,
                        'label'          => $faker->randomElement(['Home','Work','Other']),
                        'recipient_name' => $faker->name(),
                        'phone'          => '0' . $faker->numberBetween(550000000, 799999999),
                        'address_line1'  => $faker->streetAddress(),
                        'address_line2'  => $faker->optional()->secondaryAddress(),
                        'city'           => $c['city'],
                        'state'          => $c['state'],
                        'postal_code'    => $faker->optional()->postcode(),
                        'country'        => 'DZ',
                        'is_default'     => $k === 0,
                        'created_at'     => $now,
                        'updated_at'     => $now,
                    ];
                }
            }
            if ($addrRows) DB::table('user_shipping_addresses')->insert($addrRows);

            // -------------------------
            // 4) Parts (500) + Fitments
            // -------------------------
            $partNames = [
                'Brake Pad Set','Brake Disc','Oil Filter','Air Filter','Cabin Filter','Fuel Filter',
                'Spark Plug','Glow Plug','Timing Belt','V-Ribbed Belt','Water Pump','Thermostat',
                'Radiator','Intercooler','Alternator','Starter Motor','Clutch Kit','Flywheel',
                'Shock Absorber','Coil Spring','Control Arm','Ball Joint','Tie Rod End','Wheel Bearing',
                'CV Joint','Driveshaft','Turbocharger','EGR Valve','Lambda Sensor','MAP Sensor',
                'MAF Sensor','Ignition Coil','Battery','Wiper Blade','Headlight Bulb','Fog Light',
                'Mirror Glass','Door Handle','Engine Mount','Transmission Mount','Fuel Pump',
            ];

            $parts = [];
            $partCount = 500;
            for ($i = 1; $i <= $partCount; $i++) {
                $name = $faker->randomElement($partNames);
                $manuId = $faker->randomElement($manufacturerIds);

                // prices TTC
                $retail = $faker->randomFloat(2, 1500, 150000); // DZD-ish range
                $wholesale = round($retail * $faker->randomFloat(2, 0.80, 0.95), 2);
                $tva = 19.00;

                $stockReal = $faker->numberBetween(0, 120);
                $stockAvail = $faker->numberBetween(0, $stockReal);

                $parts[] = [
                    'reference'            => 'REF-' . strtoupper(Str::padLeft(dechex($i), 6, '0')),
                    'sku'                  => 'SKU-' . Str::padLeft((string)$i, 6, '0'),
                    'barcode'              => $faker->optional(0.7)->ean13(),
                    'name'                 => $name,
                    'description'          => $faker->optional()->realTextBetween(60, 180),
                    'manufacturer_id'      => $manuId,
                    'price_retail_ttc'     => $retail,
                    'price_wholesale_ttc'  => $wholesale,
                    'tva_rate'             => $tva,
                    'stock_real'           => $stockReal,
                    'stock_available'      => $stockAvail,
                    'images'               => json_encode([
                        "/storage/parts/{$i}_1.jpg",
                        "/storage/parts/{$i}_2.jpg",
                    ], JSON_UNESCAPED_SLASHES),
                    'is_active'            => true,
                    'created_at'           => $now,
                    'updated_at'           => $now,
                ];
            }
            foreach (array_chunk($parts, 500) as $chunk) {
                DB::table('parts')->insert($chunk);
            }
            $partIds = DB::table('parts')->pluck('id')->all();

            // Fitments: each part fits 1–3 random models
            $fitments = [];
            foreach ($partIds as $pid) {
                $num = random_int(1, 3);
                $pickedModels = (array)array_rand(array_flip($vehicleModelIds), $num);
                foreach ($pickedModels as $vmid) {
                    $fitments[] = [
                        'part_id'          => $pid,
                        'vehicle_model_id' => $vmid,
                        'engine_code'      => $faker->optional(0.6)->regexify('[A-Z]{2,3}\d{2,3}'),
                        'notes'            => $faker->optional()->sentence(),
                        'created_at'       => $now,
                        'updated_at'       => $now,
                    ];
                }
            }
            // Deduplicate (part_id, vehicle_model_id, engine_code) to respect unique index
            $seen = [];
            $cleanFit = [];
            foreach ($fitments as $f) {
                $k = $f['part_id'].'|'.$f['vehicle_model_id'].'|'.($f['engine_code'] ?? 'null');
                if (!isset($seen[$k])) {
                    $seen[$k] = true;
                    $cleanFit[] = $f;
                }
            }
            foreach (array_chunk($cleanFit, 1000) as $chunk) {
                DB::table('part_fitments')->insert($chunk);
            }

            // -------------------------
            // 5) Orders / Items / Notes
            // -------------------------
            $orderStatuses = ['cart','pending','confirmed','preparing','shipped','completed','canceled'];
            $orderRows = [];
            $orderCount = 120;

            for ($i = 0; $i < $orderCount; $i++) {
                $status = $faker->randomElement($orderStatuses);
                $method = $faker->optional(0.9)->randomElement(['pickup','courier','post']);
                $created = $faker->dateTimeBetween('-6 months','-1 day');

                $orderRows[] = [
                    'user_id'         => $faker->randomElement($userIds),
                    'status'          => $status,
                    'delivery_method' => $method,
                    'ship_to_name'    => $faker->optional(0.8)->name(),
                    'ship_to_phone'   => $faker->optional(0.8)->phoneNumber(),
                    'ship_to_address' => $faker->optional(0.8)->address(),
                    'subtotal'        => 0,   // will recalc later
                    'discount_total'  => 0,
                    'shipping_total'  => 0,
                    'tax_total'       => 0,
                    'grand_total'     => 0,
                    'notes'           => $faker->optional(0.25)->realText(100),
                    'created_at'      => $created,
                    'updated_at'      => $created,
                ];
            }
            DB::table('orders')->insert($orderRows);
            $orders = DB::table('orders')->select('id','delivery_method')->get();

            $itemRows = [];
            $noteRows = [];

            foreach ($orders as $ord) {
                $numItems = random_int(1, 5);
                $partSel = (array)array_rand(array_flip($partIds), $numItems);

                $usedParts = [];
                $subtotal = 0.0;

                foreach ($partSel as $pid) {
                    if (isset($usedParts[$pid])) continue; // keep unique (order_id, part_id)
                    $usedParts[$pid] = true;

                    $qty = random_int(1, 4);
                    $unitPrice = (float) DB::table('parts')->where('id', $pid)->value('price_retail_ttc') ?: 0;
                    $line = round($unitPrice * $qty, 2);
                    $subtotal += $line;

                    $itemRows[] = [
                        'order_id'   => $ord->id,
                        'part_id'    => $pid,
                        'quantity'   => $qty,
                        'unit_price' => $unitPrice,
                        'line_total' => $line,
                        'notes'      => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                $shipping = match ($ord->delivery_method) {
                    'pickup'  => 0,
                    'courier' => 800.00,
                    'post'    => 600.00,
                    default   => 0,
                };

                // prices are TTC; estimate tax component for display (not re-applied)
                $taxApprox = round($subtotal - ($subtotal / 1.19), 2);
                $grand = round($subtotal + $shipping, 2);

                DB::table('orders')->where('id', $ord->id)->update([
                    'subtotal'       => round($subtotal, 2),
                    'discount_total' => 0,
                    'shipping_total' => $shipping,
                    'tax_total'      => $taxApprox,
                    'grand_total'    => $grand,
                ]);

                // some internal notes
                if (random_int(0, 1)) {
                    $noteRows[] = [
                        'order_id'   => $ord->id,
                        'author_id'  => $faker->randomElement($userIds),
                        'note'       => $faker->sentence(12),
                        'is_private' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            if ($itemRows) {
                foreach (array_chunk($itemRows, 1000) as $chunk) {
                    DB::table('order_items')->insert($chunk);
                }
            }
            if ($noteRows) DB::table('order_notes')->insert($noteRows);

            // -------------------------
            // 6) Ad Creatives & Clicks
            // -------------------------
            $placements = ['hero','grid','sticky','inline','footer','generic'];
            $creativeRows = [];
            for ($i = 0; $i < 20; $i++) {
                $pl = $faker->randomElement($placements);
                $start = $faker->optional(0.7)->dateTimeBetween('-2 months','-3 days');
                $end   = $start ? $faker->optional(0.3)->dateTimeBetween($start, '+2 months') : null;
                $creativeRows[] = [
                    'placement'  => $pl,
                    'title'      => $faker->optional()->sentence(4),
                    'subtitle'   => $faker->optional()->sentence(8),
                    'image_path' => "/storage/ads/creative_{$i}.jpg",
                    'image_alt'  => $faker->optional()->words(3, true),
                    'target_url' => $faker->optional()->url(),
                    'weight'     => $faker->numberBetween(1, 5),
                    'status'     => $faker->boolean(80) ? 'active' : 'paused',
                    'starts_at'  => $start,
                    'ends_at'    => $end,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            DB::table('ad_creatives')->insert($creativeRows);
            $creativeIds = DB::table('ad_creatives')->pluck('id')->all();

            $clickRows = [];
            for ($i = 0; $i < 120; $i++) {
                $cid = $faker->randomElement($creativeIds);
                $pl  = $faker->randomElement($placements);
                $tgt = $faker->url();

                $clickRows[] = [
                    'creative_id' => $cid,
                    'placement'   => $pl,
                    'target_url'  => $tgt,
                    'referer'     => $faker->optional()->url(),
                    'ip'          => $faker->ipv4(),
                    'user_agent'  => $faker->userAgent(),
                    'utm_source'  => $faker->optional(0.4)->randomElement(['tiktok','facebook','instagram','google','newsletter']),
                    'utm_medium'  => $faker->optional(0.4)->randomElement(['cpc','cpa','email','organic']),
                    'utm_campaign'=> $faker->optional(0.4)->slug(2),
                    'utm_content' => $faker->optional(0.3)->slug(3),
                    'utm_term'    => $faker->optional(0.2)->word(),
                    'created_at'  => $faker->dateTimeBetween('-45 days','now'),
                    'updated_at'  => $now,
                ];
            }
            DB::table('ad_clicks')->insert($clickRows);
        });
    }
}
