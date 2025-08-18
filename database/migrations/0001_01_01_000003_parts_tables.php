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
        Schema::create('manufacturers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120)->unique();
            $table->string('icon_url')->nullable();
            $table->timestamps();
        });

        Schema::create('vehicle_brands', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120)->unique();          // Mercedes-Benz, BMW, VW...
            $table->string('logo_url')->nullable();
            $table->timestamps();
        });

        Schema::create('vehicle_models', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_brand_id')->constrained('vehicle_brands')->restrictOnDelete();
            $table->string('name', 120);
            $table->smallInteger('year_from')->nullable();
            $table->smallInteger('year_to')->nullable();
            $table->timestamps();
            $table->unique(['vehicle_brand_id', 'name', 'year_from', 'year_to']);
        });

        Schema::create('parts', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 120)->nullable()->index();  // "References"
            $table->string('sku', 80)->nullable()->unique();
            $table->string('barcode', 64)->nullable()->index();     // optional EAN/UPC
            $table->string('name')->nullable();
            $table->text('description')->nullable();

            $table->foreignId('manufacturer_id')->nullable()->constrained('manufacturers')->nullOnDelete();

            // (TTC + VAT%)
            $table->decimal('price_retail_ttc', 12, 2)->nullable();     // "Details TTC"
            $table->decimal('price_wholesale_ttc', 12, 2)->nullable();  // "GROS TTC"
            $table->decimal('tva_rate', 5, 2)->nullable();              // "TVA" e.g. 19.00

            // Global stock (single-site)
            $table->integer('stock_real')->default(0);                  // "Stock reel"
            $table->integer('stock_available')->default(0);             // "Stock Disponible"

            $table->json('images')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index('manufacturer_id');
            $table->index('sku');
        });
        
        Schema::create('part_fitments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->foreignId('vehicle_model_id')->constrained('vehicle_models')->restrictOnDelete();
            $table->string('engine_code', 64)->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->unique(['part_id', 'vehicle_model_id', 'engine_code']);
            $table->index(['vehicle_model_id','part_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('manufacturers');
        Schema::dropIfExists('vehicle_brands');
        Schema::dropIfExists('vehicle_models');
        Schema::dropIfExists('parts');
        Schema::dropIfExists('part_fitments');
    }
};
