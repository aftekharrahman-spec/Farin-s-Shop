<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DeliveryZoneResource;
use App\Models\DeliveryZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryController extends Controller
{
    public function zones(): JsonResponse
    {
        return response()->json([
            'data' => DeliveryZoneResource::collection(DeliveryZone::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'area_code', 'delivery_fee', 'free_delivery_threshold']))->resolve(request()),
            'meta' => ['is_demo' => (bool) config('services.farins.demo_catalog')],
        ]);
    }

    public function quote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'delivery_zone_id' => ['required', 'integer', 'exists:delivery_zones,id'],
            'item_subtotal' => ['required', 'integer', 'min:0', 'max:5000000'],
        ]);

        $zone = DeliveryZone::query()
            ->whereKey($validated['delivery_zone_id'])
            ->where('is_active', true)
            ->first();

        if (! $zone) {
            return response()->json([
                'message' => 'This delivery area is not currently available.',
                'errors' => ['delivery_zone_id' => ['Choose an active delivery area.']],
            ], 422);
        }

        $isFree = $zone->free_delivery_threshold !== null
            && $validated['item_subtotal'] >= $zone->free_delivery_threshold;
        $deliveryFee = $isFree ? 0 : $zone->delivery_fee;

        return response()->json([
            'data' => [
                'delivery_zone' => [
                    'id' => $zone->id,
                    'name' => $zone->name,
                ],
                'item_subtotal' => $validated['item_subtotal'],
                'delivery_fee' => $deliveryFee,
                'total' => $validated['item_subtotal'] + $deliveryFee,
                'free_delivery_threshold' => $zone->free_delivery_threshold,
                'free_delivery' => $isFree,
            ],
            'meta' => ['is_demo' => (bool) config('services.farins.demo_catalog')],
        ]);
    }
}
