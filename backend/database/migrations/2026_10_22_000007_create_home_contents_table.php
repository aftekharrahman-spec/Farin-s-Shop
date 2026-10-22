<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_contents', function (Blueprint $table): void {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('announcement_text', 240);
            $table->boolean('announcement_enabled')->default(true);
            $table->string('announcement_side_text', 120)->nullable();
            $table->string('hero_eyebrow', 180);
            $table->string('hero_title_line_one', 80);
            $table->string('hero_title_line_two', 80);
            $table->string('hero_title_accent', 100);
            $table->text('hero_description');
            $table->string('hero_note', 160);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_contents');
    }
};
