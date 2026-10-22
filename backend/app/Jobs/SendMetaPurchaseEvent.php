<?php

namespace App\Jobs;

use App\Models\MetaTrackingSetting;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\RequestException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendMetaPurchaseEvent implements ShouldBeEncrypted, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param  array{client_ip_address?: string, client_user_agent?: string, fbp?: string, fbc?: string}  $userData
     */
    public function __construct(
        public readonly int $orderId,
        public readonly array $userData,
    ) {}

    public int $tries = 3;

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [10, 60, 300];
    }

    public function handle(): void
    {
        $settings = MetaTrackingSetting::query()->find(MetaTrackingSetting::SINGLETON_ID);
        if (! $settings || ! $settings->canSendConversions()) {
            return;
        }

        $order = Order::query()->with('items')->find($this->orderId);
        if (! $order) {
            Log::warning('Meta purchase event skipped because its order no longer exists.', [
                'order_id' => $this->orderId,
            ]);

            return;
        }

        $event = [
            'event_name' => 'Purchase',
            'event_time' => $order->created_at->timestamp,
            'event_id' => $order->public_reference,
            'action_source' => 'website',
            'event_source_url' => rtrim((string) ($settings->website_url ?: config('app.url')), '/'),
            'user_data' => array_filter($this->userData, fn (?string $value): bool => filled($value)),
            'custom_data' => [
                'currency' => 'BDT',
                'value' => $order->total,
                'content_type' => 'product',
                'content_ids' => $order->items->map(fn ($item): string => (string) $item->product_id)->all(),
                'contents' => $order->items->map(fn ($item): array => [
                    'id' => (string) $item->product_id,
                    'quantity' => $item->quantity,
                    'item_price' => $item->unit_price,
                ])->all(),
            ],
        ];

        $payload = ['data' => [$event]];
        if (filled($settings->test_event_code)) {
            $payload['test_event_code'] = $settings->test_event_code;
        }

        try {
            Http::asJson()
                ->timeout(8)
                ->retry(2, 250)
                ->post(
                    'https://graph.facebook.com/'.config('services.meta.graph_version')."/{$settings->pixel_id}/events",
                    [...$payload, 'access_token' => $settings->access_token],
                )
                ->throw();
        } catch (RequestException $exception) {
            Log::warning('Meta Conversions API rejected a purchase event.', [
                'order_id' => $order->id,
                'http_status' => $exception->response->status(),
            ]);

            throw $exception;
        }
    }
}
