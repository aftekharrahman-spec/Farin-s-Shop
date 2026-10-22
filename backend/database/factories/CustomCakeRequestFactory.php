<?php

namespace Database\Factories;

use App\Models\CustomCakeRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomCakeRequest>
 */
class CustomCakeRequestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_name' => fake()->name(),
            'customer_phone' => '01'.fake()->randomElement(['3', '4', '5', '6', '7', '8', '9']).fake()->numerify('########'),
            'details' => fake()->paragraph(),
            'status' => 'pending_review',
        ];
    }
}
