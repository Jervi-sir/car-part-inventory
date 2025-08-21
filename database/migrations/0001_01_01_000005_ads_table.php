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
        Schema::create('ad_creatives', function (Blueprint $table) {
            $table->id();
            $table->string('placement')->comment('hero|grid|sticky|inline|footer|generic etc'); // enum-like
            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();
            $table->string('image_path');
            $table->string('image_alt')->nullable();
            $table->string('target_url')->nullable();
            $table->unsignedSmallInteger('weight')->default(1); // rotation weight
            $table->enum('status', ['active', 'paused'])->default('active');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
            $table->index(['placement', 'status', 'starts_at', 'ends_at']);
        });
        Schema::create('ad_clicks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creative_id')->constrained('ad_creatives')->cascadeOnDelete();
            $table->string('placement', 64)->nullable();     // if you pass it from the UI/service
            $table->text('target_url');                      // decoded final URL
            $table->string('referer', 512)->nullable();
            $table->string('ip', 64)->nullable();
            $table->string('user_agent', 512)->nullable();
            // common UTMs if present in the page URL (optional)
            $table->string('utm_source', 64)->nullable();
            $table->string('utm_medium', 64)->nullable();
            $table->string('utm_campaign', 128)->nullable();
            $table->string('utm_content', 128)->nullable();
            $table->string('utm_term', 128)->nullable();
            $table->timestamps();
            $table->index(['creative_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_creatives');
        Schema::dropIfExists('ad_clicks');
    }
};
