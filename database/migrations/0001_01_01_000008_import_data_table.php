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
        Schema::create('import_sources', function (Blueprint $table) {
            $table->id();
            $table->string('filename', 255);
            $table->string('source_type', 16); // PDF|XLSX|CSV
            $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('imported_at')->useCurrent();
            $table->string('notes', 255)->nullable();
        });

        Schema::create('import_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_source_id')->constrained('import_sources')->cascadeOnDelete();
            $table->json('raw_json');
            $table->foreignId('matched_part_id')->nullable()->constrained('parts')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('import_sources');
        Schema::dropIfExists('import_rows');
    }
};
