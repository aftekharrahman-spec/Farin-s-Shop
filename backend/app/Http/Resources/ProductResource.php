<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'subtitle' => $this->subtitle,
            'description' => $this->description,
            'price' => $this->price,
            'category' => $this->category->name,
            'category_slug' => $this->category->slug,
            'tone' => $this->tone,
            'frosting' => $this->frosting,
            'accent' => $this->accent,
            'badge' => $this->badge,
            'images' => $this->images
                ->map(fn ($image): array => [
                    'url' => $image->url,
                    'alt_text' => $image->alt_text,
                ])
                ->values()
                ->all(),
        ];
    }
}
