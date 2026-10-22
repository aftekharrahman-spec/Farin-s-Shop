<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'reference' => $this->public_reference,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'item_subtotal' => $this->item_subtotal,
            'delivery_fee' => $this->delivery_fee,
            'total' => $this->total,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
