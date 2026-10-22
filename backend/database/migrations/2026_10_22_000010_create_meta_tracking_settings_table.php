<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meta_tracking_settings', function (Blueprint $table): void {
            $table->unsignedTinyInteger('id')->primary();
            $table->boolean('is_enabled')->default(false);
            $table->string('pixel_id', 30)->nullable();
            $table->string('website_url', 255)->nullable();
            $table->text('access_token')->nullable();
            $table->boolean('conversions_api_enabled')->default(false);
            $table->string('test_event_code', 100)->nullable();
            $table->timestamps();
        });

        DB::table('meta_tracking_settings')->insert([
            'id' => 1,
            'is_enabled' => false,
            'conversions_api_enabled' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_tracking_settings');
    }
};
