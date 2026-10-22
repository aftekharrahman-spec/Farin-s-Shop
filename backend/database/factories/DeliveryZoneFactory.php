<?php

namespace Database\Factories;

use App\Models\DeliveryZone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DeliveryZone>
 */
class DeliveryZoneFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->city(),
            'area_code' => fake()->unique()->slug(),
            'delivery_fee' => fake()->numberBetween(30, 150),
            'free_delivery_threshold' => 1500,
            'is_active' => true,
        ];
    }
}
