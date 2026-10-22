<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MetaTrackingSetting;
use Illuminate\Http\JsonResponse;

class MetaTrackingController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = MetaTrackingSetting::query()->find(MetaTrackingSetting::SINGLETON_ID);
        $enabled = (bool) ($settings?->is_enabled && preg_match('/^\d{5,30}$/', (string) $settings->pixel_id));

        return response()->json([
            'data' => [
                'enabled' => $enabled,
                'pixel_id' => $enabled ? $settings->pixel_id : null,
            ],
            'meta' => ['is_demo' => (bool) config('services.farins.demo_catalog')],
        ]);
    }
}
