<?php

namespace Tests\Feature;

use App\Jobs\SendMetaPurchaseEvent;
use App\Models\Category;
use App\Models\ContentPage;
use App\Models\DeliveryZone;
use App\Models\HomeContent;
use App\Models\MetaTrackingSetting;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\StorefrontCampaign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StorefrontApiTest extends TestCase
{
    use RefreshDatabase;

    private function seedDemoCatalog(): void
    {
        $this->seed();
    }

    public function test_catalog_returns_only_published_products_and_categories(): void
    {
        $this->seedDemoCatalog();

        $response = $this->getJson('/api/v1/catalog?category=cakes&search=ড্রিম');

        $response->assertOk()
            ->assertJsonPath('meta.is_demo', true)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'strawberry-dream')
            ->assertJsonPath('data.0.price', 1250);

        $this->getJson('/api/v1/products/strawberry-dream')
            ->assertOk()
            ->assertJsonPath('meta.is_demo', true)
            ->assertJsonPath('data.slug', 'strawberry-dream')
            ->assertJsonPath('data.description', 'রাজশাহীতে আপনার উদযাপনের জন্য যত্ন করে তৈরি ভ্যানিলা কেক।')
            ->assertJsonPath('data.category', 'কেক')
            ->assertJsonPath('data.category_slug', 'cakes')
            ->assertJsonPath('data.price', 1250);

        $this->getJson('/api/v1/categories')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_product_detail_endpoint_hides_unpublished_products(): void
    {
        $this->seedDemoCatalog();
        Product::query()->where('slug', 'strawberry-dream')->update(['is_active' => false]);

        $this->getJson('/api/v1/products/strawberry-dream')->assertNotFound();
        $this->getJson('/api/v1/products/unknown-product')->assertNotFound();
    }

    public function test_catalog_and_product_detail_include_ordered_accessible_gallery_images(): void
    {
        $this->seedDemoCatalog();
        Storage::fake('public');
        $product = Product::query()->where('slug', 'strawberry-dream')->firstOrFail();
        Storage::disk('public')->put('products/strawberry-front.jpg', 'front image');
        Storage::disk('public')->put('products/strawberry-side.jpg', 'side image');
        ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => 'products/strawberry-side.jpg',
            'alt_text' => 'Side view of the strawberry cake',
            'sort_order' => 2,
        ]);
        ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => 'products/strawberry-front.jpg',
            'alt_text' => 'Front view of the strawberry cake',
            'sort_order' => 1,
        ]);

        $this->getJson('/api/v1/catalog')
            ->assertOk()
            ->assertJsonPath('data.0.images.0.alt_text', 'Front view of the strawberry cake')
            ->assertJsonPath('data.0.images.1.alt_text', 'Side view of the strawberry cake')
            ->assertJsonPath('data.0.images.0.url', Storage::disk('public')->url('products/strawberry-front.jpg'));

        $this->getJson('/api/v1/products/strawberry-dream')
            ->assertOk()
            ->assertJsonPath('data.images.0.alt_text', 'Front view of the strawberry cake')
            ->assertJsonCount(2, 'data.images');
    }

    public function test_catalog_pagination_reports_all_active_products_for_client_sync(): void
    {
        $this->seedDemoCatalog();
        $categoryId = Category::query()->where('slug', 'cakes')->firstOrFail()->id;
        Product::factory()->count(101)->create(['category_id' => $categoryId]);

        $firstPage = $this->getJson('/api/v1/catalog?per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.total', 105)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonCount(100, 'data');

        $this->getJson('/api/v1/catalog?per_page=100&page=2')
            ->assertOk()
            ->assertJsonCount(5, 'data');

        $this->assertNotNull($firstPage->json('links.next'));
    }

    public function test_home_content_and_published_pages_are_available_to_the_storefront(): void
    {
        $this->seedDemoCatalog();

        $this->getJson('/api/v1/content/home')
            ->assertOk()
            ->assertJsonPath('meta.is_demo', true)
            ->assertJsonPath('data.announcement_enabled', true)
            ->assertJsonPath('data.hero_title_accent', 'একটু মিষ্টি।');

        HomeContent::query()->findOrFail(HomeContent::SINGLETON_ID)->update([
            'hero_title_accent' => 'CMS updated headline',
        ]);

        $this->getJson('/api/v1/content/home')
            ->assertOk()
            ->assertJsonPath('data.hero_title_accent', 'CMS updated headline');

        $this->getJson('/api/v1/content/pages')
            ->assertOk()
            ->assertJsonPath('meta.is_demo', true)
            ->assertJsonFragment(['slug' => 'about']);

        $this->getJson('/api/v1/content/pages/about')
            ->assertOk()
            ->assertJsonPath('data.title', 'আমাদের গল্প')
            ->assertJsonPath('data.slug', 'about');

        ContentPage::query()->where('slug', 'about')->update([
            'title' => 'Admin-updated story',
            'body' => 'Admin-approved public copy',
        ]);

        $this->getJson('/api/v1/content/pages/about')
            ->assertOk()
            ->assertJsonPath('data.title', 'Admin-updated story')
            ->assertJsonPath('data.body', 'Admin-approved public copy');

        ContentPage::query()->where('slug', 'about')->update(['is_published' => false]);

        $this->getJson('/api/v1/content/pages')
            ->assertJsonMissing(['slug' => 'about']);
        $this->getJson('/api/v1/content/pages/about')->assertNotFound();
    }

    public function test_home_content_endpoint_fails_explicitly_if_cms_content_is_missing(): void
    {
        HomeContent::query()->delete();

        $this->getJson('/api/v1/content/home')
            ->assertServiceUnavailable()
            ->assertJsonPath('message', 'Home content has not been configured yet.');
    }

    public function test_running_the_seed_command_preserves_admin_managed_cms_content(): void
    {
        $this->seedDemoCatalog();
        HomeContent::query()->findOrFail(HomeContent::SINGLETON_ID)->update([
            'announcement_text' => 'Admin-approved announcement',
        ]);
        ContentPage::query()->where('slug', 'about')->update([
            'body' => 'Admin-approved about copy',
        ]);

        $this->seedDemoCatalog();

        $this->assertDatabaseHas('home_contents', [
            'id' => HomeContent::SINGLETON_ID,
            'announcement_text' => 'Admin-approved announcement',
        ]);
        $this->assertDatabaseHas('content_pages', [
            'slug' => 'about',
            'body' => 'Admin-approved about copy',
        ]);
    }

    public function test_only_active_and_scheduled_storefront_campaigns_are_public(): void
    {
        StorefrontCampaign::query()->create([
            'title' => 'Seasonal celebration',
            'eyebrow' => 'LIMITED EDITION',
            'body' => 'Freshly baked for your occasion.',
            'image_path' => 'campaigns/seasonal.jpg',
            'image_alt' => 'A decorated celebration cake',
            'cta_label' => 'Explore menu',
            'cta_action' => 'menu',
            'sort_order' => 2,
            'is_active' => true,
            'starts_at' => now()->subMinute(),
            'ends_at' => now()->addMinute(),
        ]);
        StorefrontCampaign::query()->create([
            'title' => 'Not started',
            'image_path' => 'campaigns/future.jpg',
            'image_alt' => 'Future campaign',
            'cta_action' => 'menu',
            'sort_order' => 1,
            'is_active' => true,
            'starts_at' => now()->addDay(),
        ]);
        StorefrontCampaign::query()->create([
            'title' => 'Paused campaign',
            'image_path' => 'campaigns/paused.jpg',
            'image_alt' => 'Paused campaign',
            'cta_action' => 'menu',
            'is_active' => false,
        ]);
        StorefrontCampaign::query()->create([
            'title' => 'Expired campaign',
            'image_path' => 'campaigns/expired.jpg',
            'image_alt' => 'Expired campaign',
            'cta_action' => 'menu',
            'is_active' => true,
            'ends_at' => now()->subSecond(),
        ]);

        $this->getJson('/api/v1/content/campaigns')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Seasonal celebration')
            ->assertJsonPath('data.0.image_alt', 'A decorated celebration cake')
            ->assertJsonPath('data.0.cta_action', 'menu');
    }

    public function test_public_meta_configuration_never_exposes_the_conversions_api_token(): void
    {
        $this->getJson('/api/v1/tracking/meta')
            ->assertOk()
            ->assertJsonPath('data.enabled', false)
            ->assertJsonPath('data.pixel_id', null);

        $secretToken = 'server-only-meta-access-token';
        MetaTrackingSetting::query()->findOrFail(MetaTrackingSetting::SINGLETON_ID)->update([
            'is_enabled' => true,
            'pixel_id' => '123456789012345',
            'conversions_api_enabled' => true,
            'access_token' => $secretToken,
        ]);

        $encryptedToken = DB::table('meta_tracking_settings')
            ->where('id', MetaTrackingSetting::SINGLETON_ID)
            ->value('access_token');

        $this->assertNotSame($secretToken, $encryptedToken);
        $publicResponse = $this->getJson('/api/v1/tracking/meta')
            ->assertOk()
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.pixel_id', '123456789012345')
            ->assertJsonCount(2, 'data')
            ->assertJsonMissingPath('data.access_token');
        $this->assertStringNotContainsString($secretToken, (string) $publicResponse->getContent());
    }

    public function test_marketing_consent_is_recorded_and_only_consented_orders_queue_meta_purchase_data(): void
    {
        $this->seedDemoCatalog();
        Queue::fake();

        MetaTrackingSetting::query()->findOrFail(MetaTrackingSetting::SINGLETON_ID)->update([
            'is_enabled' => true,
            'pixel_id' => '123456789012345',
            'conversions_api_enabled' => true,
            'access_token' => 'server-only-meta-access-token',
        ]);

        $zone = DeliveryZone::query()->where('area_code', 'demo-boalia')->firstOrFail();
        $product = Product::query()->where('slug', 'strawberry-dream')->firstOrFail();
        $response = $this->withHeader('User-Agent', 'Farin test browser')
            ->postJson('/api/v1/orders', [
                'customer_name' => 'Farin Demo',
                'customer_phone' => '01700000000',
                'delivery_address' => 'House 12, Demo Road, Boalia',
                'delivery_zone_id' => $zone->id,
                'payment_method' => 'cod',
                'marketing_consent' => true,
                'fbp' => 'fb.1.12345.test-browser',
                'fbc' => 'invalid identifier !',
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ]);

        $response->assertCreated();
        $order = Order::query()->firstOrFail();
        $this->assertTrue($order->marketing_consent);
        Queue::assertPushed(SendMetaPurchaseEvent::class, function (SendMetaPurchaseEvent $job): bool {
            return $job->userData['fbp'] === 'fb.1.12345.test-browser'
                && ! array_key_exists('fbc', $job->userData)
                && ! array_key_exists('customer_name', $job->userData)
                && ! array_key_exists('customer_phone', $job->userData);
        });

        $this->postJson('/api/v1/orders', [
            'customer_name' => 'Farin Demo',
            'customer_phone' => '01700000000',
            'delivery_address' => 'House 12, Demo Road, Boalia',
            'delivery_zone_id' => $zone->id,
            'payment_method' => 'cod',
            'marketing_consent' => false,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated();

        $this->assertDatabaseHas('orders', ['marketing_consent' => false]);
        Queue::assertPushed(SendMetaPurchaseEvent::class, 1);
    }

    public function test_meta_purchase_job_sends_only_order_value_and_product_data_to_conversions_api(): void
    {
        $this->seedDemoCatalog();
        MetaTrackingSetting::query()->findOrFail(MetaTrackingSetting::SINGLETON_ID)->update([
            'is_enabled' => true,
            'pixel_id' => '123456789012345',
            'website_url' => 'https://farinskitchen.example',
            'conversions_api_enabled' => true,
            'access_token' => 'server-only-meta-access-token',
            'test_event_code' => 'TEST123',
        ]);

        $zone = DeliveryZone::query()->where('area_code', 'demo-boalia')->firstOrFail();
        $product = Product::query()->where('slug', 'strawberry-dream')->firstOrFail();
        $this->postJson('/api/v1/orders', [
            'customer_name' => 'Farin Demo',
            'customer_phone' => '01700000000',
            'delivery_address' => 'House 12, Demo Road, Boalia',
            'delivery_zone_id' => $zone->id,
            'payment_method' => 'cod',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ])->assertCreated();

        $order = Order::query()->with('items')->firstOrFail();
        Http::fake(['graph.facebook.com/*' => Http::response(['events_received' => 1])]);
        (new SendMetaPurchaseEvent($order->id, [
            'client_ip_address' => '127.0.0.1',
            'client_user_agent' => 'Farin test browser',
            'fbp' => 'fb.1.12345.test-browser',
        ]))->handle();

        Http::assertSent(function (ClientRequest $request) use ($order): bool {
            $event = $request['data'][0];

            return str_contains($request->url(), '/v26.0/123456789012345/events')
                && $request['access_token'] === 'server-only-meta-access-token'
                && $request['test_event_code'] === 'TEST123'
                && $event['event_name'] === 'Purchase'
                && $event['event_id'] === $order->public_reference
                && $event['custom_data']['value'] === $order->total
                && $event['custom_data']['currency'] === 'BDT'
                && ! array_key_exists('customer_phone', $event['user_data'])
                && ! array_key_exists('customer_name', $event['user_data']);
        });
    }

    public function test_delivery_quote_calculates_fee_at_the_configured_free_threshold(): void
    {
        $this->seedDemoCatalog();

        $zone = DeliveryZone::query()->where('area_code', 'demo-boalia')->firstOrFail();

        $this->postJson('/api/v1/delivery/quote', [
            'delivery_zone_id' => $zone->id,
            'item_subtotal' => 1499,
        ])
            ->assertOk()
            ->assertJsonPath('data.delivery_fee', 60)
            ->assertJsonPath('data.total', 1559)
            ->assertJsonPath('data.free_delivery', false);

        $this->postJson('/api/v1/delivery/quote', [
            'delivery_zone_id' => $zone->id,
            'item_subtotal' => 1500,
        ])
            ->assertOk()
            ->assertJsonPath('data.delivery_fee', 0)
            ->assertJsonPath('data.total', 1500)
            ->assertJsonPath('data.free_delivery', true);
    }

    public function test_guest_order_uses_server_prices_and_is_idempotent(): void
    {
        $this->seedDemoCatalog();

        $zone = DeliveryZone::query()->where('area_code', 'demo-boalia')->firstOrFail();
        $product = Product::query()->where('slug', 'strawberry-dream')->firstOrFail();
        $payload = [
            'customer_name' => 'Farin Demo',
            'customer_phone' => '01700 000000',
            'delivery_address' => 'House 12, Demo Road, Boalia',
            'delivery_zone_id' => $zone->id,
            'payment_method' => 'cod',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 2,
                'unit_price' => 1,
            ]],
        ];

        $first = $this->withHeader('Idempotency-Key', 'guest-order-demo-001')
            ->postJson('/api/v1/orders', $payload);

        $first->assertCreated()
            ->assertJsonPath('data.item_subtotal', 2500)
            ->assertJsonPath('data.delivery_fee', 0)
            ->assertJsonPath('data.total', 2500)
            ->assertJsonPath('data.items.0.unit_price', 1250)
            ->assertJsonPath('data.status', 'pending_confirmation')
            ->assertJsonMissingPath('data.customer_phone');

        $reference = $first->json('data.reference');

        $this->withHeader('Idempotency-Key', 'guest-order-demo-001')
            ->postJson('/api/v1/orders', $payload)
            ->assertOk()
            ->assertJsonPath('data.reference', $reference);

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('order_items', 1);
    }

    public function test_reusing_an_idempotency_key_for_a_different_order_is_rejected(): void
    {
        $this->seedDemoCatalog();

        $zone = DeliveryZone::query()->where('area_code', 'demo-boalia')->firstOrFail();
        $product = Product::query()->where('slug', 'strawberry-dream')->firstOrFail();
        $payload = [
            'customer_name' => 'Farin Demo',
            'customer_phone' => '01700000000',
            'delivery_address' => 'House 12, Demo Road, Boalia',
            'delivery_zone_id' => $zone->id,
            'payment_method' => 'cod',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ];

        $this->withHeader('Idempotency-Key', 'guest-order-demo-002')
            ->postJson('/api/v1/orders', $payload)
            ->assertCreated();

        $payload['items'][0]['quantity'] = 2;
        $this->withHeader('Idempotency-Key', 'guest-order-demo-002')
            ->postJson('/api/v1/orders', $payload)
            ->assertConflict();

        $this->assertDatabaseCount('orders', 1);
    }

    public function test_guest_order_rejects_unserviceable_and_invalid_phone_requests(): void
    {
        $this->seedDemoCatalog();

        $zone = DeliveryZone::query()->where('area_code', 'demo-boalia')->firstOrFail();
        $product = Product::query()->where('slug', 'strawberry-dream')->firstOrFail();

        $this->postJson('/api/v1/orders', [
            'customer_name' => 'Farin Demo',
            'customer_phone' => '01200000000',
            'delivery_address' => 'House 12, Demo Road, Boalia',
            'delivery_zone_id' => $zone->id,
            'payment_method' => 'cod',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('customer_phone');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_custom_cake_request_validates_and_stores_contact_details(): void
    {
        $this->postJson('/api/v1/custom-cake-requests', [
            'customer_name' => 'Farin Demo',
            'customer_phone' => '01700000000',
            'details' => 'A vanilla cake for six people with a floral design next week.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending_review');

        $this->assertDatabaseHas('custom_cake_requests', [
            'customer_phone' => '01700000000',
            'status' => 'pending_review',
        ]);
    }

    public function test_inactive_products_and_delivery_zones_cannot_be_ordered(): void
    {
        $this->seedDemoCatalog();

        $category = Category::query()->where('slug', 'cakes')->firstOrFail();
        $unavailableProduct = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Unavailable cake',
            'slug' => 'unavailable-cake',
            'subtitle' => 'Demo',
            'description' => 'Not available for orders.',
            'price' => 100,
            'tone' => '#FFFFFF',
            'frosting' => '#FFFFFF',
            'accent' => '#FFFFFF',
            'is_active' => false,
        ]);
        $zone = DeliveryZone::query()->where('area_code', 'demo-boalia')->firstOrFail();
        $activeZone = DeliveryZone::query()->where('area_code', 'demo-rajpara')->firstOrFail();

        $this->postJson('/api/v1/orders', [
            'customer_name' => 'Farin Demo',
            'customer_phone' => '01700000000',
            'delivery_address' => 'House 12, Demo Road, Boalia',
            'delivery_zone_id' => $activeZone->id,
            'payment_method' => 'cod',
            'items' => [['product_id' => $unavailableProduct->id, 'quantity' => 1]],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items');

        $zone->update(['is_active' => false]);
        $availableProduct = Product::query()->where('slug', 'strawberry-dream')->firstOrFail();

        $this->postJson('/api/v1/orders', [
            'customer_name' => 'Farin Demo',
            'customer_phone' => '01700000000',
            'delivery_address' => 'House 12, Demo Road, Boalia',
            'delivery_zone_id' => $zone->id,
            'payment_method' => 'cod',
            'items' => [['product_id' => $availableProduct->id, 'quantity' => 1]],
        ])
            ->assertJsonValidationErrors('delivery_zone_id');

        $this->assertDatabaseCount('orders', 0);
    }
}
