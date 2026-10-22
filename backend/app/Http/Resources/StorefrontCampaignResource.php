<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StorefrontCampaignResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'eyebrow' => $this->eyebrow,
            'body' => $this->body,
            'image_url' => $this->image_url,
            'image_alt' => $this->image_alt,
            'cta_label' => $this->cta_label,
            'cta_action' => $this->cta_action,
        ];
    }
}
