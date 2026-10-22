<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Jobs\SendMetaPurchaseEvent;
use App\Models\DeliveryZone;
use App\Models\MetaTrackingSetting;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'customer_phone' => preg_replace('/[\s-]+/', '', (string) $request->input('customer_phone')),
        ]);

        foreach (['fbp', 'fbc'] as $identifier) {
            $value = $request->input($identifier);
            if ($value !== null && (
                ! is_string($value)
                || strlen($value) > 255
                || ! preg_match('/^[a-zA-Z0-9_.:-]*$/', $value)
            )) {
                $request->merge([$identifier => null]);
            }
        }

        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'min:2', 'max:120'],
            'customer_phone' => ['required', 'string', 'max:20', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'delivery_address' => ['required', 'string', 'min:8', 'max:2000'],
            'delivery_zone_id' => ['required', 'integer', 'exists:delivery_zones,id'],
            'payment_method' => ['required', 'in:cod'],
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:50'],
            'marketing_consent' => ['sometimes', 'boolean'],
            'fbp' => ['nullable', 'string', 'max:255'],
            'fbc' => ['nullable', 'string', 'max:255'],
        ]);

        $idempotencyKey = $request->header('Idempotency-Key');
        if ($idempotencyKey !== null && (strlen($idempotencyKey) > 128 || trim($idempotencyKey) === '')) {
            throw ValidationException::withMessages([
                'Idempotency-Key' => ['The idempotency key must contain 1 to 128 characters.'],
            ]);
        }

        $normalizedItems = collect($validated['items'])
            ->sortBy('product_id')
            ->values()
            ->all();
        $fingerprint = hash('sha256', json_encode([
            ...collect($validated)->except(['items', 'marketing_consent', 'fbp', 'fbc'])->all(),
            'items' => $normalizedItems,
        ], JSON_THROW_ON_ERROR));

        if ($idempotencyKey !== null) {
            $existingOrder = Order::query()
                ->with('items:id,order_id,product_name,quantity,unit_price,line_total')
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existingOrder) {
                if (! hash_equals((string) $existingOrder->request_fingerprint, $fingerprint)) {
                    return response()->json([
                        'message' => 'This idempotency key was already used for a different order.',
                    ], 409);
                }

                return response()->json([
                    'data' => (new OrderResource($existingOrder))->resolve($request),
                ], 200);
            }
        }

        $order = DB::transaction(function () use ($validated, $idempotencyKey, $fingerprint): Order {
            $zone = DeliveryZone::query()
                ->whereKey($validated['delivery_zone_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->first();

            if (! $zone) {
                throw ValidationException::withMessages([
                    'delivery_zone_id' => ['Choose an active delivery area.'],
                ]);
            }

            $requestedQuantities = collect($validated['items'])
                ->mapWithKeys(fn (array $item): array => [$item['product_id'] => $item['quantity']]);
            $products = Product::query()
                ->whereIn('id', $requestedQuantities->keys())
                ->where('is_active', true)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== $requestedQuantities->count()) {
                throw ValidationException::withMessages([
                    'items' => ['One or more selected products are no longer available.'],
                ]);
            }

            $itemSubtotal = 0;
            foreach ($requestedQuantities as $productId => $quantity) {
                $itemSubtotal += $products[$productId]->price * $quantity;
            }

            $isFree = $zone->free_delivery_threshold !== null
                && $itemSubtotal >= $zone->free_delivery_threshold;
            $deliveryFee = $isFree ? 0 : $zone->delivery_fee;

            $order = Order::query()->create([
                'public_reference' => (string) Str::uuid(),
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'delivery_address' => $validated['delivery_address'],
                'delivery_zone_id' => $zone->id,
                'payment_method' => 'cod',
                'status' => 'pending_confirmation',
                'payment_status' => 'unpaid',
                'item_subtotal' => $itemSubtotal,
                'delivery_fee' => $deliveryFee,
                'total' => $itemSubtotal + $deliveryFee,
                'marketing_consent' => (bool) ($validated['marketing_consent'] ?? false),
                'idempotency_key' => $idempotencyKey,
                'request_fingerprint' => $idempotencyKey === null ? null : $fingerprint,
            ]);

            foreach ($requestedQuantities as $productId => $quantity) {
                $product = $products[$productId];
                $order->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $quantity,
                    'unit_price' => $product->price,
                    'line_total' => $product->price * $quantity,
                ]);
            }

            return $order->load('items:id,order_id,product_name,quantity,unit_price,line_total');
        });

        if (($validated['marketing_consent'] ?? false) && MetaTrackingSetting::query()
            ->find(MetaTrackingSetting::SINGLETON_ID)?->canSendConversions()) {
            $userData = array_filter([
                'client_ip_address' => $request->ip(),
                'client_user_agent' => $request->userAgent(),
                'fbp' => $validated['fbp'] ?? null,
                'fbc' => $validated['fbc'] ?? null,
            ], fn (?string $value): bool => filled($value));

            SendMetaPurchaseEvent::dispatch($order->id, $userData)->afterCommit();
        }

        return response()->json([
            'data' => (new OrderResource($order))->resolve($request),
        ], 201);
    }
}
