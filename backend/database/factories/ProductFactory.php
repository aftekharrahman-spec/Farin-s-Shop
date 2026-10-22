<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'name' => fake()->words(2, true),
            'slug' => fake()->unique()->slug(),
            'subtitle' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'price' => fake()->numberBetween(100, 5000),
            'tone' => '#F2D8C7',
            'frosting' => '#FFF4E8',
            'accent' => '#C96657',
            'badge' => null,
            'is_active' => true,
        ];
    }
}
