<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storefront_campaigns', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 160);
            $table->string('eyebrow', 120)->nullable();
            $table->text('body')->nullable();
            $table->string('image_path', 2048);
            $table->string('image_alt', 200);
            $table->string('cta_label', 80)->nullable();
            $table->string('cta_action', 30)->default('menu');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(false);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_campaigns');
    }
};
