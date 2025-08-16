<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80)->unique();
            $table->boolean('is_special')->default(false);   // for "Catégories spéciales"
            $table->string('icon_url')->nullable();
            $table->timestamps();
        });

        Schema::create('manufacturers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120)->unique();
            $table->string('icon_url')->nullable();
            $table->timestamps();
        });

        Schema::create('delivery_methods', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('code', 24)->unique();   // PICKUP|COURIER|POST
            $table->string('label', 64);
        });

    
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('site_code', 32)->nullable();
            $table->string('location_text', 255)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
        Schema::dropIfExists('manufacturers');
        Schema::dropIfExists('delivery_methods');
        Schema::dropIfExists('warehouses');
    }
};
