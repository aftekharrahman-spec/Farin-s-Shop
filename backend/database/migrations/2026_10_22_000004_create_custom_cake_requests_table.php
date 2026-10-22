<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_cake_requests', function (Blueprint $table): void {
            $table->id();
            $table->string('customer_name');
            $table->string('customer_phone', 20)->index();
            $table->text('details');
            $table->string('status', 30)->default('pending_review');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_cake_requests');
    }
};
