<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_pages', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 160);
            $table->string('slug', 180)->unique();
            $table->text('summary')->nullable();
            $table->longText('body');
            $table->string('seo_title', 180)->nullable();
            $table->string('seo_description', 320)->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
        Schema::table('content_pages', function (Blueprint $table): void {
            $table->index(['is_published', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_pages');
    }
};
