<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

#[Fillable([
    'public_reference',
    'customer_name',
    'customer_phone',
    'delivery_address',
    'delivery_zone_id',
    'payment_method',
    'status',
    'payment_status',
    'item_subtotal',
    'delivery_fee',
    'total',
    'idempotency_key',
    'request_fingerprint',
    'marketing_consent',
])]
class Order extends Model
{
    use HasFactory;

    private const STATUS_TRANSITIONS = [
        'pending_confirmation' => ['confirmed', 'cancelled'],
        'confirmed' => ['preparing', 'cancelled'],
        'preparing' => ['ready', 'cancelled'],
        'ready' => ['out_for_delivery', 'cancelled'],
        'out_for_delivery' => ['delivered'],
        'delivered' => [],
        'cancelled' => [],
        'refunded' => [],
    ];

    protected function casts(): array
    {
        return [
            'item_subtotal' => 'integer',
            'delivery_fee' => 'integer',
            'total' => 'integer',
            'marketing_consent' => 'boolean',
        ];
    }

    public function deliveryZone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusEvents(): HasMany
    {
        return $this->hasMany(OrderStatusEvent::class);
    }

    /**
     * @return array<string, string>
     */
    public function allowedNextStatuses(): array
    {
        return collect(self::STATUS_TRANSITIONS[$this->status] ?? [])
            ->mapWithKeys(fn (string $status): array => [$status => str_replace('_', ' ', ucfirst($status))])
            ->all();
    }

    public function transitionStatus(string $status): void
    {
        DB::transaction(function () use ($status): void {
            $order = self::query()->lockForUpdate()->findOrFail($this->getKey());
            $allowedStatuses = self::STATUS_TRANSITIONS[$order->status] ?? [];

            if (! in_array($status, $allowedStatuses, true)) {
                throw ValidationException::withMessages([
                    'status' => ['This order status transition is not allowed.'],
                ]);
            }

            $order->statusEvents()->create([
                'from_status' => $order->status,
                'to_status' => $status,
                'actor_id' => auth()->id(),
            ]);
            $order->update(['status' => $status]);
        });
    }
}
