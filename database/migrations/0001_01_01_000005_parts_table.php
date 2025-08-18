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
            $table->foreignId('manufacturer_id')->nullable()->constrained('manufacturers')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('categories')->restrictOnDelete();
            $table->string('sku', 80)->nullable()->unique();
            $table->string('name')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('package_qty')->default(1);
            $table->unsignedInteger('min_order_qty')->default(1);
            $table->decimal('price_retail', 12, 2)->nullable();
            $table->decimal('price_demi_gros', 12, 2)->nullable();
            $table->decimal('price_gros', 12, 2)->nullable();
            $table->json('images')->nullable();
            $table->unsignedInteger('min_qty_gros')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['manufacturer_id', 'category_id']);
            $table->index('sku');
        });
        Schema::create('part_references', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->enum('type', ['OEM', 'AFTERMARKET', 'SUPPLIER', 'EAN_UPC', 'OTHER'])->default('OTHER');
            $table->string('code', 120);
            $table->string('source_brand', 120)->nullable();
            $table->timestamps();
            $table->unique(['part_id', 'type', 'code']);
            $table->index('code');
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

        Schema::create('part_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->nullable()->restrictOnDelete();
            $table->integer('qty')->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(0);
            $table->timestamps();
            $table->unique(['part_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parts');
        Schema::dropIfExists('part_references');
        Schema::dropIfExists('part_fitments');
        Schema::dropIfExists('part_stock');
    }
};
