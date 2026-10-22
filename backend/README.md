# Farin's Kitchen API

Laravel 13 JSON API for the first storefront backend. Seeded products and delivery zones are **development/demo data only**. Configure and confirm the real catalog, areas, fees, inventory and merchant rules before accepting production orders.

## Local setup

Requirements: PHP 8.3+, Composer 2, and SQLite (included in the PHP CLI extensions).

```powershell
Set-Location backend
composer install
Copy-Item .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan filament:assets
php artisan farins:make-admin
php artisan test
php artisan serve --host=0.0.0.0
```

The admin panel is available at `/admin`. Create administrator accounts only from the trusted CLI using `farins:make-admin`; it prompts for an email and a strong password, and there is no public staff registration route. Only accounts with the `admin` role can sign in. Do not use demo catalog or delivery data for live orders.

The protected admin panel manages products/categories, delivery areas, custom cake requests, guarded order status transitions, home announcement/hero copy, published information pages, scheduled image campaigns, and Meta tracking settings. Product forms support up to 12 ordered gallery images with alt text. Images and campaign uploads use Laravel's public disk; run `php artisan storage:link` and confirm uploaded media URLs load from the storefront. Product/category/CMS data is fetched from the API when the app opens, when it returns to the foreground, every minute while active, and on demand with the storefront menu refresh control.

For Meta Conversions API purchase events, run a queue worker in a second terminal (`npm run api:queue` from the workspace root, or `php artisan queue:work --sleep=1 --tries=3 --timeout=30` from `backend`). Keep a supervised queue worker running in production. Configure a valid Pixel ID in Admin → Facebook / Meta Pixel, enable tracking, and test browser events only after opting into marketing cookies. Conversions API additionally requires a website URL, access token, consent, and the queue worker.

### Meta Pixel and Conversions API

Configure this integration in **Admin → Facebook / Meta Pixel**. Enter the Pixel ID, enable the Pixel, and optionally enable the Conversions API with a website URL and access token. The token is encrypted at rest and write-only in the panel; it is never returned by the public tracking endpoint. Keep the token out of source control, logs, storefront settings, and support screenshots. Enable Meta's test event code only during verification and clear it before launch.

The web storefront defaults marketing consent to unset. It loads Meta's browser script and sends `PageView`, `ViewContent`, `Search`, `AddToCart`, `InitiateCheckout`, `Lead`, and `Purchase` only after explicit opt-in. Visitors can revoke consent from the storefront footer; revocation blocks later browser events and clears the Pixel cookies. Native Expo screens do not load the browser Pixel. A consented order can queue a privacy-minimized server `Purchase` event with product/value data and optional browser identifiers; customer name, phone, email, and address are excluded. Browser/server purchases use the same order reference as the deduplication event ID.

Conversions API purchases use Laravel's database queue. Run a worker in every deployment that enables CAPI:

```powershell
php artisan queue:work --tries=3
```

Monitor failed jobs (`php artisan queue:failed`) and verify the Pixel and CAPI in Meta Events Manager before going live. The Graph API version defaults to `v26.0` and can be updated with `META_GRAPH_API_VERSION` after reviewing Meta's current changelog. Never enable CAPI without a valid Pixel ID, server token, consent-approved privacy notice, and tested queue worker. Tracking is optional and should not block checkout.

Run the Laravel API in a separate terminal from the workspace root with `npm run api`; it must listen on `0.0.0.0:8000` so devices on your network can reach it. The native development app uses the Expo development server's host address for the API when available, and Android emulators fall back to `10.0.2.2` (the emulator's route to the development computer). Web development continues to use `localhost`.

For a physical phone, keep the phone and computer on the same Wi-Fi network and use Expo's **LAN** connection. If automatic host detection is unavailable (including tunnel sessions), create a workspace-root `.env.local` with `EXPO_PUBLIC_API_URL=http://<computer-LAN-IP>:8000/api/v1` (for example, `http://192.168.1.10:8000/api/v1`) and restart Expo. Ensure the computer firewall allows inbound TCP port 8000 on the private network. Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS API URL for production builds.

## Public endpoints

- `GET /api/v1/catalog?category=cakes&search=strawberry` — paginated, published catalog.
- `GET /api/v1/categories` and `GET /api/v1/products/{slug}`.
- `GET /api/v1/content/home`, `GET /api/v1/content/pages`, and `GET /api/v1/content/pages/{slug}` — published storefront copy and information pages.
- `GET /api/v1/content/campaigns` — active image campaigns within their CMS schedule.
- `GET /api/v1/tracking/meta` — enabled state and Pixel ID only; never the Conversions API token.
- `GET /api/v1/delivery/zones` — active delivery-zone choices.
- `POST /api/v1/delivery/quote` — accepts `delivery_zone_id` and `item_subtotal`; fee and total are calculated server-side.
- `POST /api/v1/orders` — guest COD order; accepts contact, delivery-zone, and product ID/quantity pairs. The API recalculates prices and totals and supports `Idempotency-Key` for safe retries. Web clients may also submit `marketing_consent`; optional `fbp`/`fbc` identifiers are ignored unless consent is true and never affect order validation or idempotency.
- `POST /api/v1/custom-cake-requests` — guest custom-cake request.

Orders are rate-limited, COD-only and initially recorded as unpaid `pending_confirmation`. Public responses return a random reference and never include the customer's phone or address. Online payment providers, order tracking, a general-purpose page builder/media library, SMS provider, and real service-zone verification are not enabled.

## Demo configuration

`FARINS_DEMO_CATALOG=true` marks catalog, delivery-zone, quote, and CMS responses as demo data. Seeded prices, fees, thresholds, named demo areas, and sample page copy are placeholders. Replace them through the authenticated admin panel after confirming actual service coverage and approved business/legal text. Never expose `.env` or `APP_KEY`.
