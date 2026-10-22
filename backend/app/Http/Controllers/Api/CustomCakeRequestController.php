<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomCakeRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomCakeRequestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'customer_phone' => preg_replace('/[\s-]+/', '', (string) $request->input('customer_phone')),
        ]);

        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'min:2', 'max:120'],
            'customer_phone' => ['required', 'string', 'max:20', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'details' => ['required', 'string', 'min:8', 'max:2000'],
        ]);

        $customCakeRequest = CustomCakeRequest::query()->create([
            ...$validated,
            'status' => 'pending_review',
        ]);

        return response()->json([
            'data' => [
                'reference' => $customCakeRequest->id,
                'status' => $customCakeRequest->status,
            ],
        ], 201);
    }
}
