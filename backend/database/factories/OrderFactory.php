<?php

namespace Database\Factories;

use App\Models\DeliveryZone;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'public_reference' => (string) Str::uuid(),
            'customer_name' => fake()->name(),
            'customer_phone' => '01'.fake()->randomElement(['3', '4', '5', '6', '7', '8', '9']).fake()->numerify('########'),
            'delivery_address' => fake()->address(),
            'delivery_zone_id' => DeliveryZone::factory(),
            'payment_method' => 'cod',
            'status' => 'pending_confirmation',
            'payment_status' => 'unpaid',
            'item_subtotal' => 1000,
            'delivery_fee' => 60,
            'total' => 1060,
            'idempotency_key' => null,
            'request_fingerprint' => null,
        ];
    }
}
