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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->enum('status', ['pending', 'confirmed', 'preparing', 'shipped', 'completed', 'canceled'])->default('pending');
            $table->enum('delivery_method', ['pickup', 'courier', 'post'])->nullable();
            $table->string('ship_to_name', 120)->nullable();
            $table->string('ship_to_phone', 40)->nullable();
            $table->string('ship_to_address', 255)->nullable();
            $table->char('currency', 3)->default('DZD');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount_total', 12, 2)->default(0);
            $table->decimal('shipping_total', 12, 2)->default(0);
            $table->decimal('tax_total', 12, 2)->default(0);
            $table->decimal('grand_total', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('part_id')->constrained('parts')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->char('currency', 3)->default('DZD');
            $table->decimal('line_total', 12, 2);
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->unique(['order_id', 'part_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_statuses');
    }
};
