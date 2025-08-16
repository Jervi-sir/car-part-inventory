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
        Schema::create('parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->foreignId('manufacturer_id')->nullable()->constrained('manufacturers')->nullOnDelete();
            $table->string('sku', 80)->nullable();            // internal ref (optional)
            $table->string('name');                           // Désignation
            $table->text('description')->nullable();
            $table->integer('package_qty')->default(1);
            $table->integer('min_order_qty')->default(1);
            $table->char('currency', 3)->default('DZD');
            $table->decimal('base_price', 12, 2)->nullable(); // optional baseline
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['category_id', 'manufacturer_id']);
            $table->unique(['sku']); // allow null; unique per non-null
        });


        Schema::create('part_reference_types', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('code', 24)->unique(); // OEM, AFTERMARKET, SUPPLIER, EAN_UPC, OTHER
            $table->string('label', 64);
        });

        Schema::create('part_references', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->foreignId('part_reference_type_id')->constrained('part_reference_types')->cascadeOnDelete();
            $table->unsignedSmallInteger('ref_type_id');
            $table->string('reference_code', 120);
            $table->string('source_brand', 120)->nullable();
            $table->timestamps();

            $table->unique(['part_id', 'part_reference_type_id', 'reference_code']);
            $table->index('reference_code');
        });

        Schema::create('part_fitments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->foreignId('vehicle_model_id')->constrained('vehicle_models')->restrictOnDelete();
            $table->string('engine_code', 64)->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->unique(['part_id', 'vehicle_model_id', 'engine_code']);
        });

        Schema::create('part_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->text('url');
            $table->smallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('price_tiers', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('code', 24)->unique();  // RETAIL, DEMI_GROS, GROS, APPLIQUE
            $table->string('label', 64);
        });

        Schema::create('part_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->foreignId('price_tier_id')->constrained('price_tiers')->cascadeOnDelete();
            $table->unsignedSmallInteger('tier_id');
            $table->integer('min_qty')->default(1);
            $table->decimal('price', 12, 2);
            $table->char('currency', 3)->default('DZD');
            $table->timestamps();

            $table->foreign('tier_id')->references('id')->on('price_tiers')->restrictOnDelete();
            $table->unique(['part_id', 'tier_id', 'min_qty']);
        });
        

        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('site_code', 32)->nullable();
            $table->string('location_text', 255)->nullable();
            $table->timestamps();
        });

        Schema::create('part_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->integer('qty_on_hand')->default(0);
            $table->integer('qty_reserved')->default(0);
            $table->timestamps();

            $table->unique(['part_id', 'warehouse_id']);
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->string('movement_type', 20); // PURCHASE|SALE|RESERVATION|UNRESERVATION|ADJUSTMENT|TRANSFER
            $table->integer('qty_delta');
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->index(['part_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parts');
        Schema::dropIfExists('part_reference_types');
        Schema::dropIfExists('part_references');
        Schema::dropIfExists('part_fitments');
        Schema::dropIfExists('part_images');
        Schema::dropIfExists('price_tiers');
        Schema::dropIfExists('part_prices');
        Schema::dropIfExists('part_stock');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('stock_movements');
    }
};
