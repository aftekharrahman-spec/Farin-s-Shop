<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_reference')->unique();
            $table->string('customer_name');
            $table->string('customer_phone', 20)->index();
            $table->text('delivery_address');
            $table->foreignId('delivery_zone_id')->constrained()->restrictOnDelete();
            $table->string('payment_method', 30);
            $table->string('status', 40)->default('pending_confirmation');
            $table->string('payment_status', 30)->default('unpaid');
            $table->unsignedInteger('item_subtotal');
            $table->unsignedInteger('delivery_fee');
            $table->unsignedInteger('total');
            $table->string('idempotency_key', 128)->nullable()->unique();
            $table->char('request_fingerprint', 64)->nullable();
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('unit_price');
            $table->unsignedInteger('line_total');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
