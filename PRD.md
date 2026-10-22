# Farin's Kitchen — পুডিং ও কেক অর্ডারিং প্ল্যাটফর্ম

**ডকুমেন্টের ধরন:** Product Requirements Document  
**অবস্থা:** MVP implementation in progress  
**সংস্করণ:** 0.3 · **তারিখ:** ২২ অক্টোবর ২০২৬

## ১. পণ্যের সারাংশ

Farin's Kitchen রাজশাহী শহরকেন্দ্রিক একটি premium bakery storefront ও order-management platform। গ্রাহক responsive web এবং Expo-ভিত্তিক iOS/Android অ্যাপ থেকে কেক, পুডিং ও বেকারি পণ্য দেখতে, কাস্টমাইজ করতে, guest হিসেবে অর্ডার দিতে এবং অর্ডারের অবস্থা জানতে পারবেন। ব্যবসার কর্মীরা একটি CMS-চালিত admin panel থেকে storefront content, menu, মূল্য, অর্ডার, delivery zone, campaign এবং বিক্রির রিপোর্ট পরিচালনা করবেন।

### লক্ষ্য

- রাজশাহীতে নির্ভরযোগ্য, সুন্দর এবং সহজে ব্যবহারযোগ্য bakery ordering experience চালু করা।
- মোবাইলে দ্রুত browsing, কম ধাপের guest checkout ও স্বচ্ছ delivery fee দেখানো।
- কোড পরিবর্তন ছাড়া admin-কে website content ও দৈনন্দিন ব্যবসা পরিচালনার সুবিধা দেওয়া।
- ভবিষ্যতে একাধিক delivery zone, product category ও payment method যোগ করা যাবে এমন ভিত্তি তৈরি।

### MVP-তে সাফল্যের মাপকাঠি

- ব্যবহারকারী পণ্য খুঁজে cart-এ যোগ করে guest checkout শুরু করতে পারেন।
- রাজশাহীর সেবাযোগ্য ঠিকানা যাচাই না করে অর্ডার নিশ্চিত করা যায় না।
- Admin নতুন পণ্য ও CMS content প্রকাশ করতে এবং অর্ডারের status পরিবর্তন করতে পারেন।
- চেকআউটে item, discount, delivery fee ও payable total একই হিসাব দেখায়।
- storefront-এর মূল কাজগুলো mobile ও desktop—দুই screen size-এ ব্যবহারযোগ্য।

## ২. ব্যবহারকারী ও ভূমিকা

| ভূমিকা | প্রয়োজন |
|---|---|
| Guest customer | Login ছাড়া menu দেখা, cart ও checkout; ফোনে order confirmation/tracking |
| Registered customer (পরবর্তী ধাপ) | Saved addresses, order history, reorder, favourites |
| Store admin | Catalog, order, promotion, delivery, content ও settings পরিচালনা |
| Order operator | নতুন order দেখা, customer-এর সঙ্গে যোগাযোগ, status update |
| Content editor | Home, banner, menu grouping, FAQ, policy ও SEO content প্রকাশ |
| Owner/manager | Sales, best sellers, payment ও order performance দেখা; staff permissions পরিচালনা |

## ৩. Product scope

### MVP-তে অন্তর্ভুক্ত

- Responsive Bengali-first storefront; প্রয়োজনে English content/labels যোগ করার উপযোগী।
- Home, menu/category, product detail, custom cake request, cart, guest checkout, confirmation, contact, FAQ, policies।
- Product variant (যেমন pound/size), flavour, message-on-cake, requested delivery date/time ও order note।
- Cart persistence, coupon, delivery fee estimate, stock/availability messaging।
- Guest checkout এবং admin থেকে manually-confirmed Cash on Delivery (COD)।
- Admin CMS: home sections, banners, navigation, footer, FAQ, policies, SEO metadata।
- Admin catalog, inventory, order board, delivery zones, coupons, payment configuration, staff roles এবং dashboard reports।
- Rajshahi delivery area/zone allow-list; serviceable address check ও zone-specific fee।
- Laravel API এবং web-based admin panel।

### MVP-র বাইরে / পরবর্তী release

- Live rider GPS, native push notifications, loyalty points, subscriptions, multi-vendor marketplace।
- Automated production planning, POS integration, accounting integration।
- Self-service customer account (guest checkout প্রথম release-এর মূল পথ), saved cards।
- Rajshahi-র বাইরে delivery; admin zone configuration দিয়ে পরবর্তীতে চালু করা যাবে।

## ৪. Information architecture ও page inventory

### Storefront

1. **Home** — announcement, hero, featured categories, best sellers, seasonal campaign, custom cake CTA, reviews, delivery promise, footer।
2. **Menu / Category listing** — category filters, search, dietary/allergen filters, sort, availability, pagination/load more।
3. **Product details** — image gallery, description, size/flavour/quantity selectors, ingredients/allergens, lead time, custom message, add-to-cart।
4. **Custom cake request** — size, servings, flavour, theme/colour, reference image upload, message, needed-by date, contact; admin quotation workflow।
5. **Cart** — line item edit/remove, variant summary, coupon, subtotal, delivery estimate, minimum-order/free-delivery progress, total।
6. **Guest checkout** — customer name, BD phone, address/area, delivery date/time, note, payment selection, order review, consent/policy link।
7. **Order confirmation** — order number, items/amount, payment and delivery summary, contact action, tracking link/token।
8. **Order tracking** — placed → confirmed → preparing → ready/out for delivery → delivered; cancellation/issue contact।
9. **About, Contact, FAQ, Delivery & Returns, Privacy, Terms** — সবগুলো CMS থেকে সম্পাদনাযোগ্য।
10. **Search / Empty / Error / Offline states** — clear next step, retry, support contact; no dead ends।

### Admin

1. **Overview dashboard** — today/period sales, order counts by status, AOV, top products, low-stock, pending custom quotes।
2. **Orders** — searchable/filterable queue, detail, status history, customer contact, print/share receipt, cancellation/refund notes।
3. **Catalog** — products, variants, price, images, category, prep lead-time, allergen labels, SEO, publish/archive।
4. **Inventory & availability** — stock or daily capacity, low-stock alert, sold-out toggle, preparation buffer।
5. **Custom requests** — request details, quoted price, quote expiry, accept/reject, convert accepted quote into order।
6. **CMS / Page builder** — home sections order/visibility, hero and promo banners, menu groups, testimonials, FAQ, policy pages, media library, SEO preview।
7. **Marketing** — coupon codes, date limits, minimum spend, eligible products/categories, usage cap, campaign banners।
8. **Delivery settings** — Rajshahi zones/areas, fee, free-delivery threshold, minimum order, operating hours, blackout dates, cutoff/lead time।
9. **Payments** — COD and provider enablement, sandbox/live configuration, webhook health, reconciliation/export; secrets masked and never exposed to client।
10. **Customers & reviews** — order-linked customer profile, opt-in status, review moderation; minimum necessary personal data access।
11. **Reports** — date-filtered sales/orders, item performance, payment method, cancellation, CSV export।
12. **Settings & staff** — brand/contact/social details, tax/receipt settings, role-based access, audit log, integrations।

## ৫. প্রধান customer journey

1. Home/menu → category/search → product detail।
2. Select size/flavour/quantity and fulfilment date → cart updates with clear price.
3. Cart validates stock, coupon and service area; shows fee/threshold and exact total.
4. Guest enters name, BD mobile number, Rajshahi delivery area/address and preferred time.
5. Backend revalidates every price, stock, coupon, delivery rule and requested slot.
6. Order is created as `pending_confirmation`; COD is selected or an online payment intent is created.
7. Show confirmation only after successful order creation; online payments require verified provider callback before `paid`.
8. Send confirmation/tracking instructions through configured SMS/email/WhatsApp provider; failure is visible to staff and does not erase the order.

## ৬. Business rules

- Initial service area: Rajshahi city only. Admin-maintained zone/area allow-list is the source of truth; do not infer coverage from free-form text alone.
- Delivery fee and free-delivery threshold are settings, not hard-coded storefront constants.
- Cart totals are provisional; server recalculates prices, discounts, delivery and payable amount at checkout.
- Product preparation lead time and blackout/capacity rules constrain selectable delivery slots.
- Order states are server-controlled: `pending_confirmation`, `confirmed`, `preparing`, `ready`, `out_for_delivery`, `delivered`, `cancelled`, `refunded`. Keep timestamped status history and actor.
- COD orders are not marked paid until collection is recorded. Online orders are not marked paid based on a browser redirect.
- Coupon validation, usage limits and reservation/release behavior must be atomic to prevent double redemption.
- Allergen and dietary claims are admin-authored and must not imply medical safety.
- Order cancellation/refund eligibility is configurable by order status and policy.

## ٧. Functional requirements & acceptance criteria

### Storefront and catalog

- Categories, products, variants, images, availability and displayed prices come from API/CMS, not source-code edits.
- Search/filter/sort produce explicit empty and error states; product links are shareable.
- Each product has a clear name, price, size/variant, preparation expectation and allergen information where supplied.
- Add-to-cart feedback is immediate, but authoritative price and stock are checked again server-side.

### Cart and checkout

- Cart survives refresh/app restart and merges safely with a future signed-in cart.
- Quantity changes recalculate item count and totals; zero quantity removes a line.
- Guest checkout requires valid Bangladesh phone format, serviceable address/zone, delivery slot and required contact fields.
- Invalid coupon, out-of-zone address, unavailable slot or stock change returns a useful field-level message and preserves entered data.
- Order confirmation has a unique, non-guessable tracking token and does not expose another customer's personal data.

### Payment

- COD can be enabled/disabled and manually reconciled.
- Online provider integration is behind a provider adapter and selected only after merchant onboarding; candidate Bangladesh methods: SSLCommerz-hosted checkout, bKash and/or Nagad, subject to availability and business approval.
- Verify provider signatures/callbacks server-side, make webhook handling idempotent, record provider references, and never store raw card data.
- Failed, abandoned, duplicate and late callbacks are handled without duplicate orders or false paid status.

### Admin/CMS

- Role-based permissions protect order, payment, content and settings operations; admin accounts require strong authentication.
- Draft/preview/publish states for important page and campaign content.
- CMS supports image alt text, crop/placement guidance, mobile/desktop hero assets and safe file-type/size validation.
- Changes to price, payment, order status, delivery rules and CMS publication are auditable with actor/time.
- Dashboard and reports respect timezone `Asia/Dhaka` and selected date range.
- Scheduled image campaigns support active windows, display order, Bengali copy, descriptive alt text, and menu/custom-cake calls to action.
- Meta Pixel and optional Conversions API credentials are admin-managed; access tokens are encrypted, write-only, and excluded from public responses.
- Browser tracking remains off until explicit marketing consent; visitors can reject or revoke consent. No tracking event may contain customer contact or delivery data.

## ৮. UI/UX principles

- Premium, warm editorial bakery style: cream paper backgrounds, forest-green anchors, restrained caramel accents, serif display type with legible Bengali UI typography, generous whitespace and original product artwork/photography.
- Bengali-first copy, consistent ৳ currency and Asia/Dhaka date/time.
- Mobile-first cards and thumb-friendly controls; desktop has structured navigation and wider product grid.
- Clear hierarchy, visible focus/pressed/disabled/loading states, keyboard navigation on web, accessible labels, adequate contrast and scalable type.
- Every image has alt text; product images must be real, licensed or original mock assets before launch. Current prototype uses original vector-style placeholder illustrations, not production food photography.
- No fake reviews, live payment claims, unavailable functionality presented as operational, or success message before server confirmation.

## ৯. Proposed technical architecture

### Frontend

- Expo + React Native + TypeScript, Expo Router for production route structure and web/iOS/Android builds.
- Shared design tokens/components; responsive storefront; API client with typed request/response models.
- React Query (or equivalent) for server state; cart persistence with AsyncStorage/local storage; form validation at client and server.
- Admin is a protected web application backed by Laravel Filament (recommended for mature CMS/admin workflows); storefront stays in Expo.

### Backend and operations

- Laravel JSON API, MySQL, queue worker, scheduled tasks, object storage for product media, transactional email/SMS integration.
- Sanctum/session or signed guest-order token strategy; admin guard separate from customer/API access.
- API version prefix `/api/v1`; OpenAPI contract before parallel frontend/backend implementation.
- Redis for queues/cache/rate limits if deployment needs it; managed HTTPS hosting, backups, monitoring and error reporting.

**Implemented backend foundation:** Laravel 13 with SQLite development setup, versioned catalog/categories/product-detail endpoints, demo delivery zones and server-calculated delivery quotes, guest COD order creation with server-side prices and idempotency, and guest custom-cake requests. `backend/README.md` documents local API setup. Catalog and zone seed values are explicitly demo-only; authentication/admin CMS and production service coverage are not enabled.

### Initial API resource outline

Implemented public resources include `GET /api/v1/catalog`, `GET /api/v1/categories`, `GET /api/v1/products/{slug}`, `GET /api/v1/content/home`, `GET /api/v1/content/pages`, `GET /api/v1/content/pages/{slug}`, `GET /api/v1/delivery/zones`, `POST /api/v1/delivery/quote`, `POST /api/v1/orders` and `POST /api/v1/custom-cake-requests`. Planned but not implemented: `GET /api/v1/coupons/validate`, `GET /api/v1/orders/{trackingToken}`.

Admin APIs/pages cover products, variants, media, content, orders, status history, coupons, zones, availability, reports and settings. Use request validation, authorization policies, pagination, consistent error envelopes and idempotency keys for order/payment mutations.

### Core entities

`Product`, `ProductVariant`, `Category`, `Media`, `Inventory/Availability`, `CustomerContact`, `Address`, `DeliveryZone`, `DeliverySlot`, `CartSnapshot`, `Coupon`, `Order`, `OrderItemSnapshot`, `Payment`, `OrderStatusEvent`, `CustomCakeRequest`, `Page`, `PageSection`, `FAQ`, `StaffUser`, `AuditLog`.

## ১০. Non-functional requirements

- Performance: optimized/responsive images, lazy loading, cacheable public catalog, avoid blocking checkout on nonessential analytics.
- Reliability: order and payment state changes are transactional/idempotent; queued notifications retry and surface failure.
- Security/privacy: HTTPS, validated uploads, server-side authorization, rate limiting, CSRF protection for admin, secure secrets, least privilege, audit logs, retention/deletion policy, no card data storage.
- Accessibility: WCAG 2.2 AA target for web content; semantic labels, keyboard operation, contrast and reduced-motion consideration.
- Localization: Bengali text, Bangladesh phone validation, `Asia/Dhaka`, configurable ৳ formatting; add English without changing data model.
- Observability: structured application logs, payment webhook log with redacted payload, alerts for failed jobs and payment/order discrepancies.
- Backup & recovery: automated encrypted database/media backup and tested restore procedure before public launch.

## ১১. Analytics and events

Track consent-appropriate, privacy-minimized Meta events on web: `PageView`, `ViewContent`, `Search`, `AddToCart`, `InitiateCheckout`, `Lead`, and `Purchase`. The Pixel script and Conversions API are disabled until marketing consent is explicitly accepted; rejection/revocation blocks subsequent events. Server Purchase jobs are encrypted in the queue and contain only event/product/value data plus optional browser identifiers and request metadata—never customer name, phone, email, or address. Browser and server Purchase events share an order-reference event ID for deduplication. No browser Pixel script is loaded in native Expo screens.

## ১২. Delivery roadmap

1. **Foundation (complete):** Farin's Kitchen branding, responsive visual prototype, original mock artwork, persistent local cart, product details, search and guest checkout.
2. **Storefront/API MVP (in progress):** Laravel API integration for catalog, product details, delivery quotes, guest COD orders and custom cake requests; remaining work includes robust retries, API loading/error polish, and production content.
3. **Laravel core (in progress):** catalog/order/zone/custom-request schema and public APIs are implemented. Admin role-gated sign-in, catalog and delivery management, custom-request status actions, and guarded order status transitions with actor/time history are now implemented. Stock, payment, notifications, and deployment hardening remain.
4. **Admin CMS (in progress):** Filament admin, editable home announcement/hero copy, published information pages, scheduled image campaigns, and admin-managed Meta Pixel/CAPI settings are implemented. Campaigns are served only when active and inside their schedule. The storefront renders campaigns and gates Meta events behind saved opt-in consent. General page builder, media library, reports, previews, staff permission management, and full audit coverage remain.
5. **Payments & communication:** COD workflow, chosen provider sandbox/live onboarding, signed callbacks, SMS/email notifications.
6. **QA & launch:** integration/e2e, device/browser checks, security review, accessibility/performance checks, backup/restore, production configuration and staff training.

## ১৩. Open decisions before production

- Final logo, Bengali/English typography and licensed food photography.
- Exact Rajshahi delivery areas, delivery fee per zone, free-delivery threshold, minimum order and operating/cutoff hours.
- Product list, sizes/servings, prices, preparation lead time, daily capacity, ingredient/allergen data and cancellation/refund policy.
- Payment provider(s), merchant account, COD eligibility, payment settlement/reconciliation owner.
- SMS/OTP, email, WhatsApp and customer-support channel/provider.
- Whether customer accounts launch with MVP or remain guest-first.
- Hosting, domain, object storage, backup, analytics/consent and data retention requirements.

## ১৪. Prototype status and boundaries

The Expo storefront fetches the catalog, home announcement/hero copy, published information pages, scheduled campaigns, Meta Pixel configuration, and delivery zones from Laravel; if the API is offline, it keeps built-in copy and demo products and does not allow checkout without a server quote. CMS pages render as plain text, not trusted HTML. Cart and web marketing preference are persisted locally. When the API is running, delivery fees are quoted by the server, COD checkout creates an unpaid `pending_confirmation` order, and custom-cake requests receive a reference. The Laravel `/admin` panel is protected by admin-only sign-in created via the trusted CLI and manages catalog, delivery areas, orders, CMS pages/campaigns, and Meta Pixel/CAPI credentials. Campaign uploads require a publicly served Laravel storage disk. CAPI Purchase delivery requires an operational queue worker; verify events in Meta Events Manager and clear the optional test-event code before launch. Seeded products, delivery fees, named areas, and sample legal/policy text remain placeholders and do **not** establish actual delivery coverage or constitute approved legal terms. Online payments, live customer tracking, SMS notifications, inventory management, a general page builder, staff permission management, and production service verification are not implemented. Do not accept real orders until actual service zones, product data, reviewed policies, privacy consent language, credentials, hosting, queue monitoring, and operations are configured and reviewed.
