<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // Truncate child then parent to satisfy FKs (Postgres)
        DB::statement('TRUNCATE TABLE user_shipping_addresses RESTART IDENTITY CASCADE');
        DB::statement('TRUNCATE TABLE users RESTART IDENTITY CASCADE');

        $users = [
            [
                'role'               => 1,
                'name'               => 'Admin',
                'full_name'          => 'System Administrator',
                'email'              => 'admin@example.com',
                'birthdate'          => '1990-01-01',
                'email_verified_at'  => $now,
                'password'           => Hash::make('password'),
                'password_plaintext' => 'password',
                'is_verified'        => true,
                'created_at'         => $now,
                'updated_at'         => $now,
            ],
            [
                'role'               => 0,
                'name'               => 'Karim',
                'full_name'          => 'Karim B.',
                'email'              => 'karim@example.com',
                'birthdate'          => '1995-06-10',
                'email_verified_at'  => null, // keep same keys!
                'password'           => Hash::make('password'),
                'password_plaintext' => 'password',
                'is_verified'        => false, // keep same keys!
                'created_at'         => $now,
                'updated_at'         => $now,
            ],
            [
                'role'               => 0,
                'name'               => 'Nadia',
                'full_name'          => 'Nadia H.',
                'email'              => 'nadia@example.com',
                'birthdate'          => '1998-03-25',
                'email_verified_at'  => null,
                'password'           => Hash::make('password'),
                'password_plaintext' => 'password',
                'is_verified'        => false,
                'created_at'         => $now,
                'updated_at'         => $now,
            ],
        ];

        DB::table('users')->insert($users);

        $karimId = DB::table('users')->where('email', 'karim@example.com')->value('id');
        $nadiaId = DB::table('users')->where('email', 'nadia@example.com')->value('id');

        DB::table('user_shipping_addresses')->insert([
            [
                'user_id'        => $karimId,
                'label'          => 'Home',
                'recipient_name' => 'Karim B.',
                'phone'          => '+213555000111',
                'address_line1'  => 'Rue Didouche Mourad 12',
                'address_line2'  => null,
                'city'           => 'Alger',
                'state'          => 'Algiers',
                'postal_code'    => '16000',
                'country'        => 'DZ',
                'is_default'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
            [
                'user_id'        => $nadiaId,
                'label'          => 'Work',
                'recipient_name' => 'Nadia H.',
                'phone'          => '+213555000222',
                'address_line1'  => 'Zone Industrielle Lot 8',
                'address_line2'  => null,
                'city'           => 'Oran',
                'state'          => 'Oran',
                'postal_code'    => '31000',
                'country'        => 'DZ',
                'is_default'     => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ],
        ]);
    }
}
