<?php

namespace Tests\Feature;

use App\Models\DeliveryZone;
use App\Models\MetaTrackingSetting;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_panel_requires_sign_in(): void
    {
        $this->get('/admin')
            ->assertRedirect('/admin/login');

        $this->get('/admin/login')
            ->assertOk();
    }

    public function test_administrator_account_can_only_be_created_through_the_trusted_cli(): void
    {
        $this->artisan('farins:make-admin')
            ->expectsQuestion('Administrator name', 'Farin Owner')
            ->expectsQuestion('Administrator email', 'OWNER@EXAMPLE.COM')
            ->expectsQuestion('Password (at least 12 characters)', 'FarinKitchen2026Pass')
            ->expectsQuestion('Confirm password', 'FarinKitchen2026Pass')
            ->assertExitCode(0);

        $this->assertDatabaseHas('users', [
            'name' => 'Farin Owner',
            'email' => 'owner@example.com',
            'role' => 'admin',
        ]);
    }

    public function test_only_admin_accounts_can_open_the_panel(): void
    {
        $staff = User::factory()->create();
        $staff->role = 'operator';
        $staff->save();

        $this->actingAs($staff)
            ->get('/admin')
            ->assertForbidden();

        $admin = User::factory()->create();
        $admin->role = 'admin';
        $admin->save();

        $this->actingAs($admin)
            ->get('/admin')
            ->assertOk();
    }

    public function test_admin_can_open_the_store_management_pages(): void
    {
        $admin = User::factory()->create();
        $admin->role = 'admin';
        $admin->save();
        $this->actingAs($admin);

        foreach ([
            '/admin/products',
            '/admin/categories',
            '/admin/delivery-zones',
            '/admin/orders',
            '/admin/custom-cake-requests',
            '/admin/home-contents',
            '/admin/content-pages',
            '/admin/storefront-campaigns',
            '/admin/meta-tracking-settings',
        ] as $path) {
            $this->get($path)->assertOk();
        }

        $this->get('/admin/home-contents/create')->assertNotFound();
        $this->get('/admin/meta-tracking-settings/create')->assertNotFound();
    }

    public function test_admin_can_open_product_creation_form(): void
    {
        $admin = User::factory()->create();
        $admin->role = 'admin';
        $admin->save();

        $this->actingAs($admin)
            ->get('/admin/products/create')
            ->assertOk();
    }

    public function test_meta_tracking_credentials_are_write_only_in_the_admin_panel(): void
    {
        $admin = User::factory()->create();
        $admin->role = 'admin';
        $admin->save();
        $secretToken = 'server-only-meta-access-token';
        MetaTrackingSetting::query()->findOrFail(MetaTrackingSetting::SINGLETON_ID)->update([
            'access_token' => $secretToken,
        ]);

        $this->actingAs($admin)
            ->get('/admin/meta-tracking-settings/1/edit')
            ->assertOk()
            ->assertDontSee($secretToken);
    }

    public function test_order_status_changes_follow_the_workflow_and_are_recorded(): void
    {
        $admin = User::factory()->create();
        $admin->role = 'admin';
        $admin->save();
        $this->actingAs($admin);

        $order = Order::factory()->create([
            'delivery_zone_id' => DeliveryZone::factory(),
        ]);

        $order->transitionStatus('confirmed');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'confirmed',
        ]);
        $this->assertDatabaseHas('order_status_events', [
            'order_id' => $order->id,
            'from_status' => 'pending_confirmation',
            'to_status' => 'confirmed',
            'actor_id' => $admin->id,
        ]);

        try {
            $order->transitionStatus('delivered');
            $this->fail('An invalid order status transition should be rejected.');
        } catch (ValidationException) {
            $this->assertDatabaseMissing('order_status_events', [
                'order_id' => $order->id,
                'to_status' => 'delivered',
            ]);
        }
    }
}
