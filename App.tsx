import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Image,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';

type Category = {
  id: number;
  name: string;
  slug: string;
};

type StorefrontTab = 'home' | 'cart' | 'orders' | 'profile';

type Product = {
  id: number;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  price: number;
  category: string;
  category_slug?: string;
  badge?: string | null;
  images: { url: string; alt_text: string }[];
  tone: string;
  frosting: string;
  accent: string;
};

const defaultCategories: Category[] = [
  { id: 0, name: 'সব', slug: 'all' },
  { id: 1, name: 'কেক', slug: 'cakes' },
  { id: 2, name: 'পুডিং', slug: 'puddings' },
  { id: 3, name: 'কুকিজ', slug: 'cookies' },
];
const CART_STORAGE_KEY = '@farins-kitchen/cart';
const ORDERS_STORAGE_KEY = '@farins-kitchen/recent-orders';
const FAVORITES_STORAGE_KEY = '@farins-kitchen/favorites';
const MARKETING_CONSENT_STORAGE_KEY = '@farins-kitchen/marketing-consent';
const API_BASE_URL = resolveApiBaseUrl();

function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (__DEV__ && Platform.OS !== 'web') {
    const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1' && expoHost !== '0.0.0.0') {
      return `http://${expoHost}:8000/api/v1`;
    }

    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000/api/v1';
    }
  }

  return 'http://localhost:8000/api/v1';
}

type DeliveryZone = {
  id: number;
  name: string;
  area_code: string;
  delivery_fee: number;
  free_delivery_threshold: number | null;
};

type RecentOrder = {
  reference: string;
  status: string;
  total: number;
  created_at: string;
  items: { name: string; quantity: number }[];
};

type ApiCategory = {
  id: number;
  name: string;
  slug: string;
};

type DeliveryQuote = {
  delivery_zone: { id: number; name: string };
  item_subtotal: number;
  delivery_fee: number;
  total: number;
  free_delivery_threshold: number | null;
  free_delivery: boolean;
};

type HomeContent = {
  announcement_text: string;
  announcement_enabled: boolean;
  announcement_side_text: string | null;
  hero_eyebrow: string;
  hero_title_line_one: string;
  hero_title_line_two: string;
  hero_title_accent: string;
  hero_description: string;
  hero_note: string;
};

type ContentPageSummary = {
  title: string;
  slug: string;
  summary: string | null;
};

type ContentPage = ContentPageSummary & {
  body: string;
  seo_title: string | null;
  seo_description: string | null;
};

type StorefrontCampaign = {
  id: number;
  title: string;
  eyebrow: string | null;
  body: string | null;
  image_url: string;
  image_alt: string;
  cta_label: string | null;
  cta_action: 'menu' | 'custom_cake';
};

type MetaTrackingConfig = {
  enabled: boolean;
  pixel_id: string | null;
};

type PixelArgument = string | number | Record<string, string | number | boolean | string[]>;
type MetaPixelFunction = ((...args: PixelArgument[]) => void) & {
  callMethod?: (...args: PixelArgument[]) => void;
  queue?: PixelArgument[][];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
  }
}

let initializedMetaPixelId: string | null = null;
let metaPixelConsentRevoked = false;

function initializeMetaPixel(pixelId: string): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  let pixel = window.fbq;
  if (!pixel) {
    const queue: MetaPixelFunction = (...args: PixelArgument[]) => {
      if (queue.callMethod) {
        queue.callMethod(...args);
      } else {
        queue.queue?.push(args);
      }
    };
    queue.queue = [];
    queue.loaded = true;
    queue.version = '2.0';
    pixel = queue;
    window.fbq = pixel;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  if (initializedMetaPixelId !== pixelId) {
    pixel('init', pixelId);
    pixel('track', 'PageView');
    initializedMetaPixelId = pixelId;
  }

  pixel('consent', 'grant');
  if (metaPixelConsentRevoked) {
    pixel('track', 'PageView');
    metaPixelConsentRevoked = false;
  }
}

function trackMetaEvent(
  eventName: string,
  parameters?: Record<string, string | number | string[]>,
  eventId?: string,
): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.fbq) {
    return;
  }

  if (eventId) {
    window.fbq('track', eventName, parameters ?? {}, { eventID: eventId });
  } else if (parameters) {
    window.fbq('track', eventName, parameters);
  } else {
    window.fbq('track', eventName);
  }
}

function readMetaCookie(cookieName: '_fbp' | '_fbc'): string | undefined {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return undefined;
  }

  const prefix = `${cookieName}=`;
  const cookie = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : undefined;
}

function clearMetaCookies(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  for (const cookieName of ['_fbp', '_fbc']) {
    document.cookie = `${cookieName}=; Max-Age=0; path=/; SameSite=Lax`;
  }
}

type ApiResponse<T> = {
  data: T;
  links?: { next: string | null; previous: string | null };
  meta?: { is_demo?: boolean; last_page?: number };
  message?: string;
  errors?: Record<string, string[]>;
};

async function requestApi<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok) {
    const validationMessage = payload.errors ? Object.values(payload.errors).flat()[0] : undefined;
    throw new Error(validationMessage ?? payload.message ?? 'সার্ভারে অনুরোধটি সম্পন্ন হয়নি।');
  }
  return payload;
}

function readProductSlugFromLocation(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const match = window.location.hash.match(/^#\/products\/([^/?#]+)$/);
  if (!match) {
    return null;
  }

  try {
    const slug = decodeURIComponent(match[1]);
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
  } catch {
    return null;
  }
}

const products: Product[] = [
  {
    id: 1,
    name: 'স্ট্রবেরি ড্রিম',
    slug: 'strawberry-dream',
    subtitle: 'ভ্যানিলা স্পঞ্জ · ফ্রেশ ক্রিম',
    description: 'রাজশাহীতে আপনার উদযাপনের জন্য যত্ন করে তৈরি ভ্যানিলা কেক।',
    price: 1250,
    category: 'কেক',
    category_slug: 'cakes',
    badge: 'বেস্টসেলার',
    images: [],
    tone: '#F2D8C7',
    frosting: '#FFF4E8',
    accent: '#C96657',
  },
  {
    id: 2,
    name: 'ক্লাসিক ক্যারামেল',
    slug: 'classic-caramel-pudding',
    subtitle: 'সিল্কি ক্যারামেল · ৬ পিস',
    description: 'মসৃণ ক্যারামেল পুডিং, শেয়ার করার জন্য ছয়টি পরিবেশন।',
    price: 450,
    category: 'পুডিং',
    category_slug: 'puddings',
    badge: 'জনপ্রিয়',
    images: [],
    tone: '#F3DBBB',
    frosting: '#D4934B',
    accent: '#9C592E',
  },
  {
    id: 3,
    name: 'চকলেট ফাজ কেক',
    slug: 'chocolate-fudge-cake',
    subtitle: 'ডার্ক চকলেট · ১ পাউন্ড',
    description: 'ডার্ক চকলেটের সমৃদ্ধ স্বাদের এক পাউন্ড কেক।',
    price: 1450,
    category: 'কেক',
    category_slug: 'cakes',
    images: [],
    tone: '#E8C8B0',
    frosting: '#6C4237',
    accent: '#E4B879',
  },
  {
    id: 4,
    name: 'বাটার কুকিজ বক্স',
    slug: 'butter-cookies-box',
    subtitle: 'হ্যান্ডমেড · ১২ পিস',
    description: 'চায়ের সঙ্গে পরিবেশনের জন্য বারোটি হাতে তৈরি বাটার কুকিজ।',
    price: 380,
    category: 'কুকিজ',
    category_slug: 'cookies',
    images: [],
    tone: '#F5E5CD',
    frosting: '#D2A36D',
    accent: '#A86D42',
  },
];

const defaultHomeContent: HomeContent = {
  announcement_text: 'রাজশাহীতে ফ্রি ডেলিভারি ৳১,৫০০+ অর্ডারে',
  announcement_enabled: true,
  announcement_side_text: 'প্রতিদিন, সকাল ১০টা — রাত ১০টা',
  hero_eyebrow: 'রাজশাহীর ছোট্ট বেকারি, অনেকটা ভালোবাসা',
  hero_title_line_one: 'প্রতিটি',
  hero_title_line_two: 'উদযাপনে',
  hero_title_accent: 'একটু মিষ্টি।',
  hero_description: 'যত্ন করে বানানো কেক আর পুডিং—আপনার বিশেষ মুহূর্তকে আরও মনে রাখার মতো করে তুলতে।',
  hero_note: 'প্রতিটি অর্ডার ফ্রেশলি বেকড',
};

const defaultContentPages: ContentPageSummary[] = [
  { title: 'আমাদের গল্প', slug: 'about', summary: null },
  { title: 'প্রায়শই জিজ্ঞাসিত প্রশ্ন', slug: 'faq', summary: null },
  { title: 'ডেলিভারি ও রিটার্ন নীতি', slug: 'delivery-policy', summary: null },
  { title: 'গোপনীয়তা নীতি', slug: 'privacy', summary: null },
  { title: 'শর্তাবলি', slug: 'terms', summary: null },
];

const taka = (amount: number) => `৳${amount.toLocaleString('en-IN')}`;

function CakeArtwork({
  product,
  compact = false,
}: {
  product: Pick<Product, 'tone' | 'frosting' | 'accent' | 'category'>;
  compact?: boolean;
}) {
  const isPudding = product.category === 'পুডিং';
  const isCookies = product.category === 'কুকিজ';

  return (
    <View style={[styles.artwork, { backgroundColor: product.tone }, compact && styles.artworkCompact]}>
      <View style={[styles.artGlow, { backgroundColor: product.frosting }]} />
      <View style={styles.artSparkleOne} />
      <View style={styles.artSparkleTwo} />
      {isCookies ? (
        <View style={styles.cookieArrangement}>
          {[0, 1, 2, 3, 4].map((cookie) => (
            <View
              key={cookie}
              style={[
                styles.cookie,
                { backgroundColor: product.frosting, borderColor: product.accent },
                cookie === 0 && styles.cookieTop,
                cookie === 3 && styles.cookieBottom,
              ]}
            >
              <View style={[styles.cookieDot, { backgroundColor: product.accent }]} />
              <View style={[styles.cookieDot, styles.cookieDotTwo, { backgroundColor: product.accent }]} />
              <View style={[styles.cookieDot, styles.cookieDotThree, { backgroundColor: product.accent }]} />
            </View>
          ))}
        </View>
      ) : isPudding ? (
        <View style={styles.puddingArrangement}>
          <View style={[styles.puddingCup, { backgroundColor: product.frosting }]}>
            <View style={[styles.puddingTop, { backgroundColor: product.accent }]} />
            <View style={styles.puddingShine} />
          </View>
          <View style={[styles.puddingPlate, { backgroundColor: product.frosting }]} />
        </View>
      ) : (
        <View style={styles.cakeArrangement}>
          <View style={[styles.cakeTop, { backgroundColor: product.frosting }]}>
            <View style={[styles.berry, { backgroundColor: product.accent }]} />
            <View style={[styles.berry, styles.berryTwo, { backgroundColor: product.accent }]} />
            <View style={[styles.leaf, { backgroundColor: '#708766' }]} />
          </View>
          <View style={[styles.cakeBody, { backgroundColor: product.frosting }]}>
            <View style={[styles.cakeLayer, { backgroundColor: product.accent }]} />
            <View style={[styles.cakeDrip, { backgroundColor: product.frosting }]} />
          </View>
          <View style={[styles.cakePlate, { backgroundColor: '#FFF8F0' }]} />
        </View>
      )}
      <View style={styles.artLabel}>
        <Text style={styles.artLabelText}>FRESHLY MADE</Text>
      </View>
    </View>
  );
}

function ProductVisual({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const image = product.images[0];

  if (!image) {
    return <CakeArtwork product={product} compact={compact} />;
  }

  return (
    <Image
      source={{ uri: image.url }}
      style={[styles.artwork, styles.productPhoto, compact && styles.artworkCompact]}
      resizeMode="cover"
      accessibilityLabel={image.alt_text || product.name}
    />
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const [activeTab, setActiveTab] = useState<StorefrontTab>('home');
  const [activeCategory, setActiveCategory] = useState('all');
  const [storeCategories, setStoreCategories] = useState<Category[]>(defaultCategories);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<number[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [localStorefrontDataReady, setLocalStorefrontDataReady] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(products);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [catalogIsDemo, setCatalogIsDemo] = useState(true);
  const [storefrontSyncVersion, setStorefrontSyncVersion] = useState(0);
  const [homeContent, setHomeContent] = useState<HomeContent>(defaultHomeContent);
  const [contentPages, setContentPages] = useState<ContentPageSummary[]>(defaultContentPages);
  const [activeContentPage, setActiveContentPage] = useState<ContentPage | null>(null);
  const [contentPageLoading, setContentPageLoading] = useState(false);
  const [contentPageError, setContentPageError] = useState('');
  const [contentLoadError, setContentLoadError] = useState('');
  const contentPageController = useRef<AbortController | null>(null);
  const storefrontScrollRef = useRef<ScrollViewInstance | null>(null);
  const menuSectionY = useRef(0);
  const [availableZones, setAvailableZones] = useState<DeliveryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [customCakeBusy, setCustomCakeBusy] = useState(false);
  const [orderReference, setOrderReference] = useState('');
  const [orderIdempotencyKey, setOrderIdempotencyKey] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [cartVisible, setCartVisible] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [cartReady, setCartReady] = useState(false);
  const [cartStorageError, setCartStorageError] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productPageSlug, setProductPageSlug] = useState<string | null>(null);
  const [productPageLoading, setProductPageLoading] = useState(false);
  const [productPageError, setProductPageError] = useState('');
  const [productLoadAttempt, setProductLoadAttempt] = useState(0);
  const [productPageQuantity, setProductPageQuantity] = useState(1);
  const [productImageIndex, setProductImageIndex] = useState(0);
  const productDetailController = useRef<AbortController | null>(null);
  const trackedProductSlug = useRef<string | null>(null);
  const [customCakeVisible, setCustomCakeVisible] = useState(false);
  const [customCakeSubmitted, setCustomCakeSubmitted] = useState(false);
  const [customCakeName, setCustomCakeName] = useState('');
  const [customCakePhone, setCustomCakePhone] = useState('');
  const [customCakeDetails, setCustomCakeDetails] = useState('');
  const [customCakeError, setCustomCakeError] = useState('');
  const [customCakeReference, setCustomCakeReference] = useState<number | null>(null);
  const [campaigns, setCampaigns] = useState<StorefrontCampaign[]>([]);
  const [metaTracking, setMetaTracking] = useState<MetaTrackingConfig>({ enabled: false, pixel_id: null });
  const [metaTrackingLoaded, setMetaTrackingLoaded] = useState(false);
  const [metaTrackingError, setMetaTrackingError] = useState('');
  const [consentReady, setConsentReady] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState<'unknown' | 'accepted' | 'rejected'>('unknown');
  const [consentSettingsVisible, setConsentSettingsVisible] = useState(false);
  const [consentStorageError, setConsentStorageError] = useState('');

  useEffect(() => {
    const syncProductRoute = () => setProductPageSlug(readProductSlugFromLocation());
    syncProductRoute();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('popstate', syncProductRoute);
      window.addEventListener('hashchange', syncProductRoute);
      return () => {
        window.removeEventListener('popstate', syncProductRoute);
        window.removeEventListener('hashchange', syncProductRoute);
      };
    }
  }, []);

  useEffect(() => {
    let lastSyncRequestedAt = Date.now();
    const refreshIfNeeded = () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      if (Date.now() - lastSyncRequestedAt < 15000) {
        return;
      }
      lastSyncRequestedAt = Date.now();
      setStorefrontSyncVersion((version) => version + 1);
    };

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshIfNeeded();
      }
    });
    const interval = setInterval(refreshIfNeeded, 60000);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          refreshIfNeeded();
        }
      };
      window.addEventListener('focus', refreshIfNeeded);
      document.addEventListener('visibilitychange', onVisibilityChange);
      return () => {
        appStateSubscription.remove();
        clearInterval(interval);
        window.removeEventListener('focus', refreshIfNeeded);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    }

    return () => {
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    productDetailController.current?.abort();
    productDetailController.current = null;

    if (!productPageSlug) {
      setProductPageLoading(false);
      setProductPageError('');
      setProductPageQuantity(1);
      setProductImageIndex(0);
      trackedProductSlug.current = null;
      return;
    }

    const controller = new AbortController();
    productDetailController.current = controller;
    setSelectedProduct((current) => current?.slug === productPageSlug ? current : null);
    setProductPageQuantity(1);
    setProductPageLoading(true);
    setProductPageError('');

    const loadProduct = async () => {
      try {
        const response = await requestApi<Product>(`/products/${encodeURIComponent(productPageSlug)}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setSelectedProduct(response.data);
          setCatalogProducts((current) => {
            const existingIndex = current.findIndex((product) => product.id === response.data.id);
            if (existingIndex < 0) {
              return [...current, response.data];
            }
            if (current[existingIndex].slug === response.data.slug) {
              return current;
            }
            return current.map((product, index) => index === existingIndex ? response.data : product);
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Unable to load the product detail API.', error);
          setProductPageError(
            error instanceof Error ? error.message : 'পণ্যের তথ্য লোড করা যায়নি। আবার চেষ্টা করুন।',
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setProductPageLoading(false);
          productDetailController.current = null;
        }
      }
    };

    void loadProduct();
    return () => controller.abort();
  }, [productPageSlug, productLoadAttempt]);

  useEffect(() => {
    if (
      !productPageSlug ||
      selectedProduct?.slug !== productPageSlug ||
      trackedProductSlug.current === productPageSlug ||
      !consentReady ||
      marketingConsent !== 'accepted' ||
      !metaTrackingLoaded ||
      !metaTracking.enabled
    ) {
      return;
    }

    trackMetaEvent('ViewContent', {
      content_ids: [String(selectedProduct.id)],
      content_type: 'product',
      content_name: selectedProduct.name,
      value: selectedProduct.price,
      currency: 'BDT',
    });
    trackedProductSlug.current = productPageSlug;
  }, [productPageSlug, selectedProduct, consentReady, marketingConsent, metaTrackingLoaded, metaTracking.enabled]);

  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      try {
        const catalog: Product[] = [];
        let page = 1;
        let lastPage = 1;
        let meta: ApiResponse<Product[]>['meta'];

        do {
          const response = await requestApi<Product[]>(`/catalog?per_page=100&page=${page}`);
          catalog.push(...response.data);
          meta = response.meta;
          lastPage = Math.max(1, response.meta?.last_page ?? 1);
          page += 1;
        } while (page <= lastPage && page <= 100);

        if (page <= lastPage) {
          throw new Error('Catalog pagination exceeded the supported limit.');
        }

        if (!isMounted) {
          return;
        }
        setCatalogProducts(catalog);
        setCatalogIsDemo(meta?.is_demo ?? false);
        setCatalogState('ready');
        setCatalogError('');
      } catch (error) {
        console.error('Unable to load the catalog API.', error);
        if (isMounted) {
          setCatalogState('offline');
          setCatalogError('ক্যাটালগ সার্ভারে সংযোগ করা যায়নি। আবার চেষ্টা করুন; অর্ডারের আগে সার্ভার পণ্যের দাম যাচাই করবে।');
        }
      }
    };

    const loadCategories = async () => {
      try {
        const response = await requestApi<ApiCategory[]>('/categories');
        if (isMounted) {
          setStoreCategories([{ id: 0, name: 'সব', slug: 'all' }, ...response.data]);
        }
      } catch (error) {
        console.error('Unable to load the categories API.', error);
      }
    };

    const loadDeliveryZones = async () => {
      try {
        const response = await requestApi<DeliveryZone[]>('/delivery/zones');
        if (isMounted) {
          setAvailableZones(response.data);
        }
      } catch (error) {
        console.error('Unable to load delivery zones.', error);
        if (isMounted) {
          setQuoteError('ডেলিভারি এলাকা লোড হয়নি; পরে আবার চেষ্টা করুন।');
        }
      }
    };

    const loadHomeContent = async () => {
      try {
        const response = await requestApi<HomeContent>('/content/home');
        if (isMounted) {
          setHomeContent(response.data);
          setContentLoadError('');
        }
      } catch (error) {
        console.error('Unable to load CMS home content.', error);
        if (isMounted) {
          setContentLoadError('হোমপেজের কনটেন্ট সার্ভার থেকে লোড করা যায়নি; সংরক্ষিত ডিফল্ট কনটেন্ট দেখানো হচ্ছে।');
        }
      }
    };

    const loadContentPages = async () => {
      try {
        const response = await requestApi<ContentPageSummary[]>('/content/pages');
        if (isMounted) {
          setContentPages(response.data);
        }
      } catch (error) {
        console.error('Unable to load CMS information pages.', error);
      }
    };

    const loadCampaigns = async () => {
      try {
        const response = await requestApi<StorefrontCampaign[]>('/content/campaigns');
        if (isMounted) {
          setCampaigns(response.data);
        }
      } catch (error) {
        console.error('Unable to load CMS campaigns.', error);
      }
    };

    const loadMetaTracking = async () => {
      try {
        const response = await requestApi<MetaTrackingConfig>('/tracking/meta');
        if (isMounted) {
          setMetaTracking(response.data);
          setMetaTrackingLoaded(true);
          setMetaTrackingError('');
        }
      } catch (error) {
        console.error('Unable to load Meta tracking settings.', error);
        if (isMounted) {
          setMetaTrackingLoaded(false);
          setMetaTrackingError('Meta tracking configuration backend থেকে লোড করা যায়নি।');
        }
      }
    };

    void loadCatalog();
    void loadCategories();
    void loadDeliveryZones();
    void loadHomeContent();
    void loadContentPages();
    void loadCampaigns();
    void loadMetaTracking();

    return () => {
      isMounted = false;
    };
  }, [storefrontSyncVersion]);

  useEffect(() => {
    let isMounted = true;

    const restoreLocalStorefrontData = async () => {
      try {
        const [savedOrders, savedFavorites] = await Promise.all([
          AsyncStorage.getItem(ORDERS_STORAGE_KEY),
          AsyncStorage.getItem(FAVORITES_STORAGE_KEY),
        ]);
        if (isMounted && savedOrders) {
          const parsedOrders: unknown = JSON.parse(savedOrders);
          if (Array.isArray(parsedOrders)) {
            setRecentOrders(parsedOrders.filter((order): order is RecentOrder =>
              typeof order === 'object' &&
              order !== null &&
              'reference' in order &&
              typeof order.reference === 'string' &&
              'status' in order &&
              typeof order.status === 'string' &&
              'total' in order &&
              typeof order.total === 'number' &&
              'created_at' in order &&
              typeof order.created_at === 'string' &&
              'items' in order &&
              Array.isArray(order.items) &&
              order.items.every((item: unknown) =>
                typeof item === 'object' &&
                item !== null &&
                'name' in item &&
                typeof item.name === 'string' &&
                'quantity' in item &&
                typeof item.quantity === 'number',
              ),
            ));
          }
        }
        if (isMounted && savedFavorites) {
          const parsedFavorites: unknown = JSON.parse(savedFavorites);
          if (Array.isArray(parsedFavorites) && parsedFavorites.every((id) => Number.isSafeInteger(id))) {
            setFavoriteProductIds(parsedFavorites.filter((id): id is number => typeof id === 'number'));
          }
        }
      } catch (error) {
        console.error('Unable to restore local storefront data.', error);
        if (isMounted) {
          setCartStorageError('সংরক্ষিত তথ্য লোড করা যায়নি; এই সেশনে নতুন করে শুরু করুন।');
        }
      } finally {
        if (isMounted) {
          setLocalStorefrontDataReady(true);
        }
      }
    };

    void restoreLocalStorefrontData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!localStorefrontDataReady) {
      return;
    }

    const persistOrders = async () => {
      try {
        await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(recentOrders));
      } catch (error) {
        console.error('Unable to save local order references.', error);
        setCartStorageError('অর্ডার রেফারেন্স এই ডিভাইসে সংরক্ষণ করা যায়নি।');
      }
    };

    void persistOrders();
  }, [recentOrders, localStorefrontDataReady]);

  useEffect(() => {
    if (!localStorefrontDataReady) {
      return;
    }

    const persistFavorites = async () => {
      try {
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteProductIds));
      } catch (error) {
        console.error('Unable to save favorite products.', error);
      }
    };

    void persistFavorites();
  }, [favoriteProductIds, localStorefrontDataReady]);

  useEffect(() => {
    let isMounted = true;

    const restoreMarketingConsent = async () => {
      try {
        const savedConsent = await AsyncStorage.getItem(MARKETING_CONSENT_STORAGE_KEY);
        if (isMounted && (savedConsent === 'accepted' || savedConsent === 'rejected')) {
          setMarketingConsent(savedConsent);
        }
      } catch (error) {
        console.error('Unable to restore marketing consent.', error);
        if (isMounted) {
          setConsentStorageError('আপনার কুকি পছন্দ সংরক্ষণ করা যায়নি; এই সেশনের জন্য পছন্দটি কার্যকর থাকবে।');
        }
      } finally {
        if (isMounted) {
          setConsentReady(true);
        }
      }
    };

    void restoreMarketingConsent();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (consentReady && metaTrackingLoaded && marketingConsent === 'accepted' && metaTracking.enabled && metaTracking.pixel_id) {
      initializeMetaPixel(metaTracking.pixel_id);
    } else if (
      Platform.OS === 'web' &&
      consentReady &&
      (marketingConsent === 'rejected' ||
        (metaTrackingLoaded && marketingConsent === 'accepted' && (!metaTracking.enabled || !metaTracking.pixel_id))) &&
      typeof window !== 'undefined' &&
      window.fbq
    ) {
      window.fbq('consent', 'revoke');
      metaPixelConsentRevoked = true;
      clearMetaCookies();
    }
  }, [consentReady, marketingConsent, metaTracking, metaTrackingLoaded]);

  useEffect(() => {
    if (!searchQuery.trim() || !consentReady || marketingConsent !== 'accepted' || !metaTrackingLoaded || !metaTracking.enabled) {
      return;
    }

    const timeout = setTimeout(() => {
      trackMetaEvent('Search', { search_string: searchQuery.trim() });
    }, 700);
    return () => clearTimeout(timeout);
  }, [searchQuery, consentReady, marketingConsent, metaTrackingLoaded, metaTracking.enabled]);

  useEffect(() => {
    let isMounted = true;

    const loadCart = async () => {
      try {
        const savedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (!savedCart || !isMounted) {
          return;
        }

        const parsed: unknown = JSON.parse(savedCart);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('Saved cart has an invalid format.');
        }

        const restoredCart: Record<number, number> = {};
        for (const [productId, quantity] of Object.entries(parsed)) {
          const id = Number(productId);
          if (
            products.some((product) => product.id === id) &&
            typeof quantity === 'number' &&
            Number.isSafeInteger(quantity) &&
            quantity > 0
          ) {
            restoredCart[id] = quantity;
          }
        }
        setCart(restoredCart);
      } catch (error) {
        console.error('Unable to restore the saved cart.', error);
        if (isMounted) {
          setCartStorageError('আগের কার্টটি লোড করা যায়নি; এই সেশনে নতুন কার্ট ব্যবহার করুন।');
        }
      } finally {
        if (isMounted) {
          setCartReady(true);
        }
      }
    };

    void loadCart();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!cartReady) {
      return;
    }

    const saveCart = async () => {
      try {
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        setCartStorageError('');
      } catch (error) {
        console.error('Unable to save the cart.', error);
        setCartStorageError('কার্টটি ডিভাইসে সংরক্ষণ করা যায়নি; অ্যাপ বন্ধ করলে কার্ট হারাতে পারে।');
      }
    };

    void saveCart();
  }, [cart, cartReady]);

  const shownProducts = useMemo(
    () =>
      catalogProducts.filter((product) => {
        const matchesCategory = activeCategory === 'all' || product.category_slug === activeCategory;
        const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
        const matchesSearch =
          !normalizedQuery ||
          `${product.name} ${product.subtitle} ${product.category}`.toLocaleLowerCase().includes(normalizedQuery);
        const matchesFavorite = !showFavoritesOnly || favoriteProductIds.includes(product.id);
        return matchesCategory && matchesSearch && matchesFavorite;
      }),
    [activeCategory, searchQuery, catalogProducts, showFavoritesOnly, favoriteProductIds],
  );
  const cartEntries = catalogProducts.filter((product) => (cart[product.id] ?? 0) > 0);
  const itemCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  const subtotal = cartEntries.reduce((total, product) => total + product.price * cart[product.id], 0);
  const featuredCake = catalogProducts.find((product) => product.category_slug === 'cakes') ?? products[0];

  useEffect(() => {
    if (!isCheckout || !selectedZoneId) {
      setDeliveryQuote(null);
      setQuoteLoading(false);
      return;
    }

    const controller = new AbortController();
    setQuoteLoading(true);
    setQuoteError('');

    const loadDeliveryQuote = async () => {
      try {
        const response = await requestApi<DeliveryQuote>('/delivery/quote', {
          method: 'POST',
          body: JSON.stringify({
            delivery_zone_id: selectedZoneId,
            item_subtotal: subtotal,
          }),
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setDeliveryQuote(response.data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Unable to calculate delivery fee.', error);
          setDeliveryQuote(null);
          setQuoteError(error instanceof Error ? error.message : 'ডেলিভারি ফি গণনা করা যায়নি।');
        }
      } finally {
        if (!controller.signal.aborted) {
          setQuoteLoading(false);
        }
      }
    };

    void loadDeliveryQuote();
    return () => controller.abort();
  }, [isCheckout, selectedZoneId, subtotal]);

  const addToCart = (productId: number, quantity = 1) => {
    setCart((current) => ({ ...current, [productId]: (current[productId] ?? 0) + quantity }));
    setOrderIdempotencyKey(null);
    setDeliveryQuote(null);
    const product = catalogProducts.find((item) => item.id === productId);
    if (product) {
      trackMarketingEvent('AddToCart', {
        content_ids: [String(product.id)],
        content_type: 'product',
        content_name: product.name,
        value: product.price * quantity,
        currency: 'BDT',
      });
    }
  };

  const changeQuantity = (productId: number, change: number) => {
    setCart((current) => {
      const nextQuantity = (current[productId] ?? 0) + change;
      const next = { ...current };
      if (nextQuantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = nextQuantity;
      }
      return next;
    });
    setOrderIdempotencyKey(null);
    setDeliveryQuote(null);
  };

  const openCart = () => {
    setActiveTab('cart');
    setIsCheckout(false);
    setOrderPlaced(false);
    setOrderReference('');
    setCartVisible(true);
  };

  const toggleFavorite = (productId: number) => {
    setFavoriteProductIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
    );
  };

  const navigateTab = (tab: StorefrontTab) => {
    closeProductPage();
    setActiveTab(tab);
    if (tab === 'cart') {
      setCartVisible(false);
      setIsCheckout(false);
      setOrderPlaced(false);
      return;
    }
    setCartVisible(false);
    setIsCheckout(false);
    if (tab === 'home') {
      setShowFavoritesOnly(false);
      storefrontScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const openProductDetails = (product: Product) => {
    setActiveTab('home');
    setSelectedProduct(product);
    setProductPageError('');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.pushState(
        {},
        '',
        `${window.location.pathname}${window.location.search}#/products/${encodeURIComponent(product.slug)}`,
      );
    }
    setProductPageSlug(product.slug);
    storefrontScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const openCustomCakeForm = () => {
    setCustomCakeSubmitted(false);
    setCustomCakeError('');
    setCustomCakeReference(null);
    setCustomCakeVisible(true);
  };

  const updateMarketingConsent = async (consent: 'accepted' | 'rejected') => {
    setMarketingConsent(consent);
    setConsentSettingsVisible(false);
    try {
      await AsyncStorage.setItem(MARKETING_CONSENT_STORAGE_KEY, consent);
      setConsentStorageError('');
    } catch (error) {
      console.error('Unable to save marketing consent.', error);
      setConsentStorageError('আপনার কুকি পছন্দ সংরক্ষণ করা যায়নি; এই সেশনের জন্য পছন্দটি কার্যকর থাকবে।');
    }
  };

  const trackMarketingEvent = (
    eventName: string,
    parameters?: Record<string, string | number | string[]>,
    eventId?: string,
  ) => {
    if (consentReady && marketingConsent === 'accepted' && metaTrackingLoaded && metaTracking.enabled) {
      trackMetaEvent(eventName, parameters, eventId);
    }
  };

  const closeProductPage = () => {
    productDetailController.current?.abort();
    productDetailController.current = null;
    setProductPageSlug(null);
    setSelectedProduct(null);
    setProductPageError('');
    if (Platform.OS === 'web' && typeof window !== 'undefined' && readProductSlugFromLocation()) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    }
  };

  const showMenu = () => {
    closeProductPage();
    setActiveTab('home');
    setActiveCategory('all');
    setShowFavoritesOnly(false);
    storefrontScrollRef.current?.scrollTo({ y: menuSectionY.current, animated: true });
  };

  const openCampaign = (campaign: StorefrontCampaign) => {
    if (campaign.cta_action === 'custom_cake') {
      openCustomCakeForm();
      return;
    }

    showMenu();
  };

  const openContentPage = async (slug: string) => {
    contentPageController.current?.abort();
    const controller = new AbortController();
    contentPageController.current = controller;
    setActiveContentPage(null);
    setContentPageError('');
    setContentPageLoading(true);

    try {
      const response = await requestApi<ContentPage>(`/content/pages/${encodeURIComponent(slug)}`, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setActiveContentPage(response.data);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Unable to load CMS information page.', error);
        setContentPageError(error instanceof Error ? error.message : 'পাতাটি লোড করা যায়নি। পরে আবার চেষ্টা করুন।');
      }
    } finally {
      if (!controller.signal.aborted) {
        setContentPageLoading(false);
        contentPageController.current = null;
      }
    }
  };

  const closeContentPage = () => {
    contentPageController.current?.abort();
    contentPageController.current = null;
    setContentPageLoading(false);
    setActiveContentPage(null);
    setContentPageError('');
  };

  const placeOrder = async () => {
    const validBangladeshPhone = /^(?:\+?88)?01[3-9]\d{8}$/.test(customerPhone.replace(/[\s-]/g, ''));
    if (!customerName.trim() || !validBangladeshPhone || !deliveryAddress.trim() || !selectedZoneId) {
      setCheckoutError('নাম, সঠিক বাংলাদেশি মোবাইল নম্বর, রাজশাহীর ডেলিভারি এলাকা ও পূর্ণ ঠিকানা দিন।');
      return;
    }
    if (!deliveryQuote || quoteLoading) {
      setCheckoutError('অর্ডারের আগে ডেলিভারি চার্জ নিশ্চিত হওয়া দরকার।');
      return;
    }

    setCheckoutError('');
    setCheckoutBusy(true);
    const idempotencyKey =
      orderIdempotencyKey ?? `${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
    setOrderIdempotencyKey(idempotencyKey);

    try {
      const response = await requestApi<{ reference: string; status: string }>('/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          delivery_address: deliveryAddress.trim(),
          delivery_zone_id: selectedZoneId,
          payment_method: 'cod',
          ...(marketingConsent === 'accepted'
            ? {
                marketing_consent: true,
                fbp: readMetaCookie('_fbp'),
                fbc: readMetaCookie('_fbc'),
              }
            : { marketing_consent: false }),
          items: cartEntries.map((product) => ({
            product_id: product.id,
            quantity: cart[product.id],
          })),
        }),
      });
      setOrderReference(response.data.reference);
      setOrderPlaced(true);
      setRecentOrders((current) => [
        {
          reference: response.data.reference,
          status: response.data.status,
          total: deliveryQuote.total,
          created_at: new Date().toISOString(),
          items: cartEntries.map((product) => ({ name: product.name, quantity: cart[product.id] })),
        },
        ...current.filter((order) => order.reference !== response.data.reference),
      ].slice(0, 20));
      trackMarketingEvent(
        'Purchase',
        {
          content_ids: cartEntries.map((product) => String(product.id)),
          content_type: 'product',
          value: deliveryQuote.total,
          currency: 'BDT',
        },
        response.data.reference,
      );
      setCart({});
      setOrderIdempotencyKey(null);
    } catch (error) {
      console.error('Unable to place guest order.', error);
      setCheckoutError(error instanceof Error ? error.message : 'অর্ডার জমা দেওয়া যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const submitCustomCakeRequest = async () => {
    const validBangladeshPhone = /^(?:\+?88)?01[3-9]\d{8}$/.test(customCakePhone.replace(/[\s-]/g, ''));
    if (!customCakeName.trim() || !validBangladeshPhone || !customCakeDetails.trim()) {
      setCustomCakeError('নাম, সঠিক বাংলাদেশি মোবাইল নম্বর ও কেকের বিবরণ দিন।');
      return;
    }

    setCustomCakeError('');
    setCustomCakeBusy(true);
    try {
      const response = await requestApi<{ reference: number }>('/custom-cake-requests', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: customCakeName.trim(),
          customer_phone: customCakePhone.trim(),
          details: customCakeDetails.trim(),
        }),
      });
      setCustomCakeReference(response.data.reference);
      setCustomCakeSubmitted(true);
      trackMarketingEvent('Lead');
    } catch (error) {
      console.error('Unable to submit custom cake request.', error);
      setCustomCakeError(error instanceof Error ? error.message : 'অনুরোধ জমা দেওয়া যায়নি। পরে আবার চেষ্টা করুন।');
    } finally {
      setCustomCakeBusy(false);
    }
  };

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      {homeContent.announcement_enabled ? (
        <View style={styles.announcement}>
          <Text style={styles.announcementText}>{homeContent.announcement_text}</Text>
          {isWide && homeContent.announcement_side_text ? (
            <Text style={styles.announcementRight}>{homeContent.announcement_side_text}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.header, isWide && styles.headerWide]}>
        <Pressable style={styles.brand} onPress={showMenu} accessibilityRole="button" accessibilityLabel="হোম">
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>F</Text>
            <Text style={styles.brandHeart}>♥</Text>
          </View>
          <View>
            <View style={styles.brandLogoRow}>
              <Text style={styles.brandName}>Farin’s Kitchen</Text>
              <Text style={styles.chefHat}>♧</Text>
            </View>
            <Text style={styles.brandTagline}>BAKED WITH A LITTLE LOVE</Text>
          </View>
        </Pressable>
        {isWide && (
          <View style={styles.navLinks}>
            <Pressable onPress={showMenu}><Text style={[styles.navLink, styles.navLinkActive]}>হোম</Text></Pressable>
            <Pressable onPress={showMenu}><Text style={styles.navLink}>আমাদের মেনু</Text></Pressable>
            <Pressable onPress={openCustomCakeForm}><Text style={styles.navLink}>কাস্টম কেক</Text></Pressable>
            <Pressable onPress={openCustomCakeForm}><Text style={styles.navLink}>যোগাযোগ</Text></Pressable>
          </View>
        )}
        <View style={styles.headerActions}>
          <Pressable
            style={styles.searchButton}
            accessibilityLabel="সার্চ"
            accessibilityRole="button"
            onPress={() => setSearchVisible((visible) => !visible)}
          >
              <Text style={styles.searchIcon}>⌕</Text>
          </Pressable>
          <Pressable
            style={styles.cartButton}
            onPress={openCart}
            accessibilityRole="button"
            accessibilityLabel={`কার্ট, ${itemCount}টি পণ্য`}
          >
            <Text style={styles.cartIcon}>♧</Text>
            <Text style={styles.cartButtonText}>{isWide ? 'কার্ট' : ''}</Text>
            <View style={styles.cartCount}>
              <Text style={styles.cartCountText}>{itemCount}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {!isWide ? (
        <View style={styles.mobileSearchArea}>
          <Pressable style={styles.deliveryLocation} onPress={() => setZonePickerVisible(true)} accessibilityRole="button">
            <Text style={styles.locationPin}>⌖</Text>
            <View style={styles.locationCopy}>
              <Text style={styles.locationLabel}>ডেলিভারি হবে</Text>
              <Text style={styles.locationValue}>
                {availableZones.find((zone) => zone.id === selectedZoneId)?.name ?? 'রাজশাহী শহর'}
              </Text>
            </View>
            <Text style={styles.locationChevron}>⌄</Text>
          </Pressable>
          <Pressable
            style={styles.mobileSearchButton}
            onPress={() => {
              setActiveTab('home');
              setSearchVisible((visible) => !visible);
              showMenu();
            }}
            accessibilityRole="button"
            accessibilityLabel="কেক, পুডিং বা কুকিজ খুঁজুন"
          >
            <Text style={styles.searchIcon}>⌕</Text>
            <Text style={styles.mobileSearchPlaceholder}>কী খেতে ইচ্ছে করছে?</Text>
          </Pressable>
        </View>
      ) : null}

      {cartStorageError ? <Text style={styles.storageWarning}>{cartStorageError}</Text> : null}
      {catalogState === 'offline' || contentLoadError ? (
        <Pressable
          style={styles.apiNotice}
          onPress={() => setStorefrontSyncVersion((version) => version + 1)}
          accessibilityRole="button"
        >
          <Text style={styles.apiNoticeText}>
            {catalogError || contentLoadError} · আবার চেষ্টা করতে চাপ দিন
          </Text>
        </Pressable>
      ) : null}

      <ScrollView ref={storefrontScrollRef} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {activeTab === 'home' ? productPageSlug ? (
          <View style={[styles.productPage, isWide && styles.productPageWide]}>
            <Pressable
              style={styles.productBackButton}
              onPress={closeProductPage}
              accessibilityRole="button"
              accessibilityLabel="মেনুতে ফিরে যান"
            >
              <Text style={styles.productBackText}>← মেনুতে ফিরে যান</Text>
            </Pressable>
            <View style={[styles.productPageLayout, isWide && styles.productPageLayoutWide]}>
              {selectedProduct?.slug === productPageSlug ? (
                <>
                  <View style={[styles.productGallery, isWide && styles.productGalleryWide]}>
                    <View style={[styles.productDetailArtwork, isWide && styles.productDetailArtworkWide]}>
                      {selectedProduct.images.length > 0 ? (
                        <Image
                          source={{ uri: selectedProduct.images[Math.min(productImageIndex, selectedProduct.images.length - 1)].url }}
                          style={styles.productDetailMainImage}
                          resizeMode="cover"
                          accessibilityLabel={selectedProduct.images[Math.min(productImageIndex, selectedProduct.images.length - 1)].alt_text || selectedProduct.name}
                        />
                      ) : (
                        <ProductVisual product={selectedProduct} />
                      )}
                      {selectedProduct.badge ? (
                        <Text style={styles.productDetailBadge}>{selectedProduct.badge}</Text>
                      ) : null}
                    </View>
                    {selectedProduct.images.length > 1 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.productImageThumbnails}
                      >
                        {selectedProduct.images.map((image, index) => (
                          <Pressable
                            key={`${selectedProduct.id}-${image.url}`}
                            onPress={() => setProductImageIndex(index)}
                            accessibilityRole="button"
                            accessibilityLabel={`পণ্যের ছবি ${index + 1}`}
                            accessibilityState={{ selected: productImageIndex === index }}
                            style={[
                              styles.productImageThumbnail,
                              productImageIndex === index && styles.productImageThumbnailSelected,
                            ]}
                          >
                            <Image source={{ uri: image.url }} style={styles.productImageThumbnailImage} resizeMode="cover" accessibilityLabel={image.alt_text || selectedProduct.name} />
                          </Pressable>
                        ))}
                      </ScrollView>
                    ) : null}
                  </View>
                  <View style={styles.productDetailCopy}>
                    <Text style={styles.sectionEyebrow}>{selectedProduct.category} · ফ্রেশলি তৈরি</Text>
                    <Text style={styles.productDetailTitle}>{selectedProduct.name}</Text>
                    <Text style={styles.productDetailSubtitle}>{selectedProduct.subtitle}</Text>
                    <Text style={styles.productDetailPrice}>{taka(selectedProduct.price)}</Text>
                    <View style={styles.productDetailRule} />
                    <Text style={styles.productDetailDescription}>{selectedProduct.description}</Text>
                    <View style={styles.productDetailPromise}>
                      <Text style={styles.promiseIcon}>✳</Text>
                      <Text style={styles.productDetailPromiseText}>
                        অর্ডারের পর ফ্রেশলি তৈরি · রাজশাহী শহরে ডেলিভারি
                      </Text>
                    </View>
                    {productPageError ? (
                      <Text style={styles.productDetailError}>
                        সার্ভার থেকে পণ্যের তথ্য যাচাই করা যায়নি। কেনাকাটা চালিয়ে যেতে আবার চেষ্টা করুন।
                      </Text>
                    ) : null}
                    <View style={styles.productDetailActions}>
                      <View style={styles.productDetailQuantity}>
                        <Pressable
                          onPress={() => setProductPageQuantity((quantity) => Math.max(1, quantity - 1))}
                          style={styles.quantityButton}
                          accessibilityRole="button"
                          accessibilityLabel="পরিমাণ কমান"
                        >
                          <Text style={styles.quantityButtonText}>−</Text>
                        </Pressable>
                        <Text style={styles.quantityValue}>{productPageQuantity}</Text>
                        <Pressable
                          onPress={() => setProductPageQuantity((quantity) => quantity + 1)}
                          style={styles.quantityButton}
                          accessibilityRole="button"
                          accessibilityLabel="পরিমাণ বাড়ান"
                        >
                          <Text style={styles.quantityButtonText}>+</Text>
                        </Pressable>
                      </View>
                      <Pressable
                        style={[
                          styles.productDetailAddButton,
                          (productPageLoading || Boolean(productPageError)) && styles.disabledButton,
                        ]}
                        onPress={() => {
                          addToCart(selectedProduct.id, productPageQuantity);
                          setProductPageQuantity(1);
                        }}
                        disabled={productPageLoading || Boolean(productPageError)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.productDetailAddText}>
                          {productPageLoading ? 'তথ্য যাচাই হচ্ছে…' : `কার্টে যোগ করুন · ${taka(selectedProduct.price * productPageQuantity)}`}
                        </Text>
                      </Pressable>
                    </View>
                    <Pressable
                      style={styles.productDetailFavorite}
                      onPress={() => toggleFavorite(selectedProduct.id)}
                      accessibilityRole="button"
                      accessibilityLabel={favoriteProductIds.includes(selectedProduct.id) ? 'পছন্দ থেকে সরান' : 'পছন্দে যোগ করুন'}
                    >
                      <Text style={[styles.favoriteIcon, favoriteProductIds.includes(selectedProduct.id) && styles.favoriteSelected]}>
                        {favoriteProductIds.includes(selectedProduct.id) ? '♥' : '♡'}
                      </Text>
                      <Text style={styles.productDetailFavoriteText}>
                        {favoriteProductIds.includes(selectedProduct.id) ? 'পছন্দের তালিকায় আছে' : 'পছন্দের তালিকায় যোগ করুন'}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : productPageError ? (
                <View style={styles.productPageMessage}>
                  <Text style={styles.pageEmptyIcon}>🍰</Text>
                  <Text style={styles.pageEmptyTitle}>পণ্যটি পাওয়া যায়নি</Text>
                  <Text style={styles.pageEmptyCopy}>{productPageError}</Text>
                  <View style={styles.productPageMessageActions}>
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => setProductLoadAttempt((attempt) => attempt + 1)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.primaryButtonText}>আবার চেষ্টা করুন</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={closeProductPage} accessibilityRole="button">
                      <Text style={styles.secondaryButtonText}>মেনুতে ফিরুন</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.productPageMessage}>
                  <Text style={styles.pageEmptyIcon}>🍰</Text>
                  <Text style={styles.pageEmptyTitle}>পণ্যের তথ্য লোড হচ্ছে…</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <>
        {isWide ? (
          <View style={[styles.hero, styles.heroWide]}>
          <View style={styles.heroCopy}>
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrowText}>{homeContent.hero_eyebrow}</Text>
            </View>
            <Text style={[styles.heroTitle, isWide ? styles.heroTitleWide : styles.heroTitleMobile]}>
              {homeContent.hero_title_line_one}{'\n'}{homeContent.hero_title_line_two}{'\n'}
              <Text style={styles.heroTitleAccent}>{homeContent.hero_title_accent}</Text>
            </Text>
            <Text style={[styles.heroDescription, !isWide && styles.heroDescriptionMobile]}>
              {homeContent.hero_description}
            </Text>
            <View style={styles.heroActions}>
              <Pressable style={styles.primaryButton} onPress={showMenu}>
                <Text style={styles.primaryButtonText}>মেনু দেখুন</Text>
                <Text style={styles.buttonArrow}>↗</Text>
              </Pressable>
              {isWide ? <Text style={styles.heroNote}>{homeContent.hero_note}</Text> : null}
            </View>
            {isWide ? (
              <View style={styles.socialProof}>
                <View style={styles.avatarStack}>
                  <Text style={styles.avatar}>স</Text>
                  <Text style={[styles.avatar, styles.avatarTwo]}>আ</Text>
                  <Text style={[styles.avatar, styles.avatarThree]}>ম</Text>
                </View>
                <View>
                  <Text style={styles.ratingText}>★★★★★ <Text style={styles.ratingValue}>৪.৯/৫</Text></Text>
                  <Text style={styles.ratingCaption}>রাজশাহীর ৫০০+ মিষ্টিপ্রেমীর পছন্দ</Text>
                </View>
              </View>
            ) : null}
          </View>
          {isWide ? (
            <View style={styles.heroArtWrap}>
              <View style={styles.heroArtBackdrop} />
              <View style={styles.heroArt}>
                <CakeArtwork
                  product={{ category: 'কেক', tone: '#E8C5AE', frosting: '#FFF3E4', accent: '#B95454' }}
                />
              </View>
              <View style={styles.heroFloatingNote}>
                <Text style={styles.floatingNoteStar}>✳</Text>
                <View>
                  <Text style={styles.floatingNoteTitle}>আজই বেকড</Text>
                  <Text style={styles.floatingNoteCaption}>ফ্রেশ উপকরণে, হাতে তৈরি</Text>
                </View>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeTop}>100%</Text>
                <Text style={styles.heroBadgeBottom}>ভালোবাসা</Text>
              </View>
            </View>
          ) : null}
          </View>
        ) : null}

        {!isWide ? (
          <View style={styles.mobileHeroCard}>
            <View style={styles.mobileHeroCopy}>
              <Text style={styles.mobileHeroEyebrow}>{homeContent.hero_eyebrow}</Text>
              <Text style={styles.mobileHeroTitle}>
                {homeContent.hero_title_line_one} {homeContent.hero_title_line_two}
              </Text>
              <Text style={styles.mobileHeroCaption}>{homeContent.hero_description}</Text>
              <Pressable style={styles.mobileHeroButton} onPress={showMenu} accessibilityRole="button">
                <Text style={styles.mobileHeroButtonText}>মেনু দেখুন →</Text>
              </Pressable>
            </View>
            <View style={styles.mobileHeroArtwork}>
              <ProductVisual product={featuredCake} compact />
            </View>
          </View>
        ) : null}

        {isWide ? (
          <View style={styles.promiseStrip}>
            <View style={styles.promiseItem}>
              <Text style={styles.promiseIcon}>✳</Text>
              <View><Text style={styles.promiseTitle}>প্রতিদিন ফ্রেশ</Text><Text style={styles.promiseCaption}>অর্ডারের পর তৈরি</Text></View>
            </View>
            <View style={styles.promiseDivider} />
            <View style={styles.promiseItem}>
              <Text style={styles.promiseIcon}>⌂</Text>
              <View><Text style={styles.promiseTitle}>রাজশাহী জুড়ে</Text><Text style={styles.promiseCaption}>সতর্ক ডেলিভারি</Text></View>
            </View>
            <View style={styles.promiseDivider} />
            <View style={styles.promiseItem}>
              <Text style={styles.promiseIcon}>♡</Text>
              <View><Text style={styles.promiseTitle}>যত্নে তৈরি</Text><Text style={styles.promiseCaption}>প্রিমিয়াম উপকরণ</Text></View>
            </View>
          </View>
        ) : null}

        {campaigns.length > 0 ? (
          <View style={[styles.campaignSection, isWide && styles.campaignSectionWide]}>
            {campaigns.map((campaign) => (
              <View key={campaign.id} style={[styles.campaignCard, isWide && styles.campaignCardWide]}>
                <Image
                  source={{ uri: campaign.image_url }}
                  style={[styles.campaignImage, isWide && styles.campaignImageWide]}
                  resizeMode="cover"
                  accessibilityLabel={campaign.image_alt}
                />
                <View style={styles.campaignCopy}>
                  {campaign.eyebrow ? <Text style={styles.campaignEyebrow}>{campaign.eyebrow}</Text> : null}
                  <Text style={styles.campaignTitle}>{campaign.title}</Text>
                  {campaign.body ? <Text style={styles.campaignBody}>{campaign.body}</Text> : null}
                  {campaign.cta_label ? (
                    <Pressable
                      style={styles.campaignButton}
                      onPress={() => openCampaign(campaign)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.campaignButtonText}>{campaign.cta_label}</Text>
                      <Text style={styles.buttonArrow}>↗</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View
          style={styles.menuSection}
          onLayout={(event) => {
            menuSectionY.current = event.nativeEvent.layout.y;
          }}
        >
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>কী খেতে ইচ্ছে করছে?</Text>
              <Text style={styles.sectionTitle}>ক্যাটাগরি দেখুন</Text>
            </View>
            <Pressable onPress={showMenu}><Text style={styles.viewAllLink}>সব দেখুন  →</Text></Pressable>
          </View>
          <View style={styles.categoryGrid}>
            {storeCategories.filter((category) => category.slug !== 'all').map((category, index) => {
              const artwork = category.slug === 'cakes'
                ? { emoji: '🎂', color: '#F7B7D0' }
                : category.slug === 'puddings'
                  ? { emoji: '🍮', color: '#A9DCE4' }
                  : category.slug === 'cookies'
                    ? { emoji: '🍪', color: '#C9A8E9' }
                    : { emoji: '🧁', color: ['#F2C77B', '#A9DCE4', '#E9A6BC'][index % 3] };

              return (
                <Pressable
                  key={category.id}
                  onPress={() => {
                    setShowFavoritesOnly(false);
                    setActiveCategory(category.slug);
                    storefrontScrollRef.current?.scrollTo({ y: menuSectionY.current, animated: true });
                  }}
                  style={styles.categoryTile}
                  accessibilityRole="button"
                >
                  <View style={[styles.categoryArtwork, { backgroundColor: artwork.color }]}>
                    <Text style={styles.categoryEmoji}>{artwork.emoji}</Text>
                  </View>
                  <Text style={styles.categoryTileName} numberOfLines={1}>{category.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>আপনার জন্য বাছাই</Text>
              <Text style={styles.sectionTitle}>আজকের সেরা পছন্দ</Text>
            </View>
            <Pressable onPress={showMenu}><Text style={styles.viewAllLink}>সব দেখুন  →</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealList}>
            {catalogProducts.slice(0, 8).map((product, index) => (
              <View key={product.id} style={[styles.dealCard, { backgroundColor: ['#D8F0EB', '#F8D5E3', '#E6D8F1'][index % 3] }]}>
                <Pressable onPress={() => openProductDetails(product)} accessibilityRole="button">
                  <View style={styles.dealArtwork}><ProductVisual product={product} compact /></View>
                </Pressable>
                {product.badge ? <Text style={styles.dealBadge}>{product.badge}</Text> : null}
                <Text style={styles.dealName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.dealSubtitle}>◷ ৩০–৪৫ মিনিট</Text>
                <View style={styles.dealPriceRow}>
                  <Text style={styles.dealPrice}>{taka(product.price)}</Text>
                  <Pressable
                    style={styles.dealAddButton}
                    onPress={() => addToCart(product.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${product.name} কার্টে যোগ করুন`}
                  >
                    <Text style={styles.dealAddText}>+</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>ফ্রেশলি তৈরি</Text>
              <Text style={styles.sectionTitle}>{showFavoritesOnly ? 'পছন্দের পণ্য' : 'আমাদের মেনু'}</Text>
            </View>
            {showFavoritesOnly ? (
              <Pressable
                onPress={() => setShowFavoritesOnly(false)}
                accessibilityRole="button"
                accessibilityLabel="সম্পূর্ণ মেনু দেখুন"
              >
                <Text style={styles.viewAllLink}>সম্পূর্ণ মেনু →</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setStorefrontSyncVersion((version) => version + 1)}
                accessibilityRole="button"
                accessibilityLabel="মেনু ও CMS তথ্য রিফ্রেশ করুন"
              >
                <Text style={styles.sectionAside}>মেনু রিফ্রেশ ↻</Text>
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
            {storeCategories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => {
                  setShowFavoritesOnly(false);
                  setActiveCategory(category.slug);
                }}
                style={[styles.categoryChip, activeCategory === category.slug && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryText, activeCategory === category.slug && styles.categoryTextActive]}>
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {searchVisible ? (
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="কেক, পুডিং বা কুকিজ খুঁজুন"
              style={styles.searchInput}
              accessibilityLabel="মেনুতে পণ্য খুঁজুন"
            />
          ) : null}
          <View style={[styles.productGrid, isWide && styles.productGridWide]}>
            {shownProducts.map((product) => (
              <View key={product.id} style={[styles.productCard, isWide && styles.productCardWide]}>
                <View style={styles.productArtWrap}>
                  <Pressable onPress={() => openProductDetails(product)} accessibilityRole="button" accessibilityLabel={`${product.name} বিস্তারিত`}>
                    <ProductVisual product={product} compact />
                  </Pressable>
                  {product.badge && <Text style={styles.productBadge}>{product.badge}</Text>}
                  <Pressable
                    style={styles.favoriteButton}
                    onPress={() => toggleFavorite(product.id)}
                    accessibilityLabel={`${product.name} ${favoriteProductIds.includes(product.id) ? 'পছন্দ থেকে সরান' : 'পছন্দে যোগ করুন'}`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.favoriteIcon, favoriteProductIds.includes(product.id) && styles.favoriteSelected]}>
                      {favoriteProductIds.includes(product.id) ? '♥' : '♡'}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.productInfo}>
                  <View style={styles.productTitleRow}>
                    <Pressable onPress={() => openProductDetails(product)}>
                      <Text style={styles.productName}>{product.name}</Text>
                    </Pressable>
                    <Text style={styles.productRating}>★ ৪.৯</Text>
                  </View>
                  <Text style={styles.productSubtitle}>{product.subtitle}</Text>
                  <View style={styles.productBuyRow}>
                    <Text style={styles.productPrice}>{taka(product.price)}</Text>
                    <Pressable
                      style={[styles.addButton, (cart[product.id] ?? 0) > 0 && styles.addButtonSelected]}
                      onPress={() => addToCart(product.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${product.name} কার্টে যোগ করুন`}
                    >
                      <Text style={[styles.addButtonText, (cart[product.id] ?? 0) > 0 && styles.addButtonTextSelected]}>
                        {(cart[product.id] ?? 0) > 0 ? `যোগ হয়েছে · ${cart[product.id]}` : '+ যোগ করুন'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
          {shownProducts.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.emptyCartTitle}>
                {showFavoritesOnly ? 'এখনো পছন্দের পণ্য নেই' : 'কোনো পণ্য পাওয়া যায়নি'}
              </Text>
              <Text style={styles.emptyCartText}>
                {showFavoritesOnly
                  ? 'মেনুতে থাকা হৃদয় চিহ্নে চাপ দিয়ে পছন্দের পণ্য যোগ করুন।'
                  : 'অন্য শব্দ দিয়ে খুঁজুন অথবা অন্য ক্যাটাগরি বেছে নিন।'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.customBanner, isWide && styles.customBannerWide]}>
          <View style={styles.customCopy}>
            <Text style={styles.customEyebrow}>আপনার ভাবনা, আমাদের হাতে</Text>
            <Text style={styles.customTitle}>বিশেষ দিনের কেক{'\n'}হোক একদম আপনার মতো।</Text>
            <Text style={styles.customDescription}>কাস্টম ডিজাইন, পছন্দের ফ্লেভার আর কেকের ওপর আপনার মনের কথাটি—সব একসাথে।</Text>
            <Pressable style={styles.lightButton} onPress={openCustomCakeForm}>
              <Text style={styles.lightButtonText}>কাস্টম কেক অর্ডার করুন</Text>
              <Text style={styles.buttonArrow}>↗</Text>
            </Pressable>
          </View>
          <View style={styles.customArt}>
            <CakeArtwork
              product={{ category: 'কেক', tone: '#D8B28E', frosting: '#FFF4E8', accent: '#C65F4E' }}
            />
            <View style={styles.customFlower}><Text style={styles.customFlowerText}>✿</Text></View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <Text style={styles.brandName}>Farin's Kitchen</Text>
            <Text style={styles.footerNote}>আপনার প্রতিটি মিষ্টি মুহূর্তে।</Text>
          </View>
          <View style={styles.footerPages}>
            {contentPages.map((page) => (
              <Pressable key={page.slug} onPress={() => void openContentPage(page.slug)}>
                <Text style={styles.footerPageLink}>{page.title}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.footerLocation}>রাজশাহী, বাংলাদেশ · সকাল ১০টা — রাত ১০টা</Text>
          {Platform.OS === 'web' ? (
            <>
              <Pressable
                onPress={() => setConsentSettingsVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="কুকি ও মার্কেটিং পছন্দ সেট করুন"
              >
                <Text style={styles.footerPageLink}>কুকি ও মার্কেটিং পছন্দ</Text>
              </Pressable>
              {consentStorageError ? <Text style={styles.footerConsentNotice}>{consentStorageError}</Text> : null}
            </>
          ) : null}
          <Text style={styles.copyright}>© ২০২৬ Farin's Kitchen</Text>
        </View>
          </>
        ) : activeTab === 'cart' ? (
          <View style={styles.appPage}>
            <View style={styles.pageTitleBlock}>
              <Text style={styles.sectionEyebrow}>আপনার পছন্দ</Text>
              <Text style={styles.pageTitle}>আমার কার্ট</Text>
              <Text style={styles.pageSubtitle}>{itemCount}টি পণ্য · অর্ডার দেওয়ার আগে সব দেখে নিন</Text>
            </View>
            {cartEntries.length === 0 ? (
              <View style={styles.pageEmptyState}>
                <Text style={styles.pageEmptyIcon}>🛍️</Text>
                <Text style={styles.pageEmptyTitle}>কার্ট এখনো খালি</Text>
                <Text style={styles.pageEmptyCopy}>পছন্দের কেক বা পুডিং যোগ করে আপনার অর্ডার শুরু করুন।</Text>
                <Pressable style={styles.primaryButton} onPress={() => navigateTab('home')}>
                  <Text style={styles.primaryButtonText}>মেনু ঘুরে দেখি</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.cartPageItems}>
                  {cartEntries.map((product) => (
                    <View key={product.id} style={styles.cartPageItem}>
                      <View style={styles.cartPageArt}><ProductVisual product={product} compact /></View>
                      <View style={styles.cartPageCopy}>
                        <Text style={styles.cartPageName}>{product.name}</Text>
                        <Text style={styles.cartPageSubtitle}>{product.subtitle}</Text>
                        <Text style={styles.cartPagePrice}>{taka(product.price * cart[product.id])}</Text>
                      </View>
                      <View style={styles.quantityControl}>
                        <Pressable onPress={() => changeQuantity(product.id, 1)} style={styles.quantityButton}>
                          <Text style={styles.quantityButtonText}>+</Text>
                        </Pressable>
                        <Text style={styles.quantityValue}>{cart[product.id]}</Text>
                        <Pressable onPress={() => changeQuantity(product.id, -1)} style={styles.quantityButton}>
                          <Text style={styles.quantityButtonText}>−</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
                <View style={styles.cartPageSummary}>
                  <Text style={styles.summaryHeading}>অর্ডার সারাংশ</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>পণ্যের দাম</Text><Text style={styles.totalLabel}>{taka(subtotal)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>ডেলিভারি চার্জ</Text>
                    <Text style={styles.totalLabel}>এলাকা বেছে নিলে হিসাব হবে</Text>
                  </View>
                  <Text style={styles.deliveryHint}>সঠিক ডেলিভারি ফি চেকআউটে সার্ভার থেকে হিসাব করা হবে।</Text>
                  <Pressable
                    style={styles.gradientOrderButton}
                    onPress={() => {
                      setIsCheckout(true);
                      setCartVisible(true);
                      trackMarketingEvent('InitiateCheckout', {
                        content_ids: cartEntries.map((product) => String(product.id)),
                        content_type: 'product',
                        num_items: itemCount,
                        value: subtotal,
                        currency: 'BDT',
                      });
                    }}
                  >
                    <Text style={styles.gradientOrderButtonText}>অর্ডার করুন · {taka(subtotal)}</Text>
                    <Text style={styles.gradientOrderArrow}>→</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ) : activeTab === 'orders' ? (
          <View style={styles.appPage}>
            <View style={styles.pageTitleBlock}>
              <Text style={styles.sectionEyebrow}>অর্ডার আপডেট</Text>
              <Text style={styles.pageTitle}>আমার অর্ডার</Text>
              <Text style={styles.pageSubtitle}>এই ডিভাইসে করা সাম্প্রতিক অর্ডারগুলো</Text>
            </View>
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <View key={order.reference} style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.orderCardEyebrow}>অর্ডার রেফারেন্স</Text>
                    <Text style={styles.orderCardReference}>{order.reference.slice(0, 8).toUpperCase()}</Text>
                  </View>
                  <View style={styles.orderStatusPill}>
                    <Text style={styles.orderStatusText}>
                      {order.status === 'pending_confirmation' ? 'নিশ্চিতকরণের অপেক্ষায়' : order.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderCardDate}>{new Date(order.created_at).toLocaleString('bn-BD')}</Text>
                {order.items.map((item) => (
                  <View key={`${order.reference}-${item.name}`} style={styles.orderItemRow}>
                    <Text style={styles.orderItemName}>{item.name} × {item.quantity}</Text>
                  </View>
                ))}
                <View style={styles.orderCardFooter}>
                  <Text style={styles.totalLabel}>ক্যাশ অন ডেলিভারি</Text>
                  <Text style={styles.totalAmount}>{taka(order.total)}</Text>
                </View>
              </View>
            )) : (
              <View style={styles.pageEmptyState}>
                <Text style={styles.pageEmptyIcon}>🧾</Text>
                <Text style={styles.pageEmptyTitle}>এখনো কোনো অর্ডার নেই</Text>
                <Text style={styles.pageEmptyCopy}>আপনার প্রথম মিষ্টি অর্ডারটি এখানেই দেখা যাবে।</Text>
                <Pressable style={styles.primaryButton} onPress={() => navigateTab('home')}>
                  <Text style={styles.primaryButtonText}>মেনু দেখুন</Text>
                </Pressable>
              </View>
            )}
            <Text style={styles.noticeCard}>এই তালিকা শুধু এই ডিভাইসে সংরক্ষিত অর্ডার রেফারেন্স দেখায়। লাইভ status tracking-এর API এখনো চালু নেই।</Text>
          </View>
        ) : (
          <View style={styles.appPage}>
            <View style={styles.profileHero}>
              <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>F</Text></View>
              <Text style={styles.pageTitle}>Farin’s Kitchen</Text>
              <Text style={styles.pageSubtitle}>আপনার প্রতিটি মিষ্টি মুহূর্তে</Text>
              <View style={styles.guestBadge}><Text style={styles.guestBadgeText}>গেস্ট হিসেবে অর্ডার করুন</Text></View>
            </View>
            <Text style={styles.profileSectionTitle}>আপনার পছন্দ</Text>
            <Pressable
              style={styles.profileAction}
              onPress={() => {
                setShowFavoritesOnly(true);
                setActiveCategory('all');
                setActiveTab('home');
                storefrontScrollRef.current?.scrollTo({ y: menuSectionY.current, animated: true });
              }}
            >
              <Text style={styles.profileActionIcon}>♥</Text>
              <View style={styles.profileActionCopy}>
                <Text style={styles.profileActionTitle}>পছন্দের পণ্য</Text>
                <Text style={styles.profileActionHint}>{favoriteProductIds.length}টি পছন্দের পণ্য</Text>
              </View>
              <Text style={styles.locationChevron}>›</Text>
            </Pressable>
            <Pressable style={styles.profileAction} onPress={() => setActiveTab('orders')}>
              <Text style={styles.profileActionIcon}>▤</Text>
              <View style={styles.profileActionCopy}>
                <Text style={styles.profileActionTitle}>আমার অর্ডার</Text>
                <Text style={styles.profileActionHint}>{recentOrders.length}টি সাম্প্রতিক অর্ডার</Text>
              </View>
              <Text style={styles.locationChevron}>›</Text>
            </Pressable>
            <Pressable style={styles.profileAction} onPress={() => setConsentSettingsVisible(true)}>
              <Text style={styles.profileActionIcon}>♡</Text>
              <View style={styles.profileActionCopy}>
                <Text style={styles.profileActionTitle}>গোপনীয়তা ও কুকি পছন্দ</Text>
                <Text style={styles.profileActionHint}>মার্কেটিং অনুমতি দেখুন বা বদলান</Text>
              </View>
              <Text style={styles.locationChevron}>›</Text>
            </Pressable>
            <Pressable style={styles.profileAction} onPress={openCustomCakeForm}>
              <Text style={styles.profileActionIcon}>✿</Text>
              <View style={styles.profileActionCopy}>
                <Text style={styles.profileActionTitle}>কাস্টম কেকের অনুরোধ</Text>
                <Text style={styles.profileActionHint}>বিশেষ দিনের কেক নিজের মতো করে বলুন</Text>
              </View>
              <Text style={styles.locationChevron}>›</Text>
            </Pressable>
            <Text style={styles.profileSectionTitle}>তথ্য ও নীতিমালা</Text>
            {contentPages.map((page) => (
              <Pressable key={page.slug} style={styles.profileAction} onPress={() => void openContentPage(page.slug)}>
                <Text style={styles.profileActionIcon}>⌕</Text>
                <View style={styles.profileActionCopy}>
                  <Text style={styles.profileActionTitle}>{page.title}</Text>
                  {page.summary ? <Text style={styles.profileActionHint}>{page.summary}</Text> : null}
                </View>
                <Text style={styles.locationChevron}>›</Text>
              </Pressable>
            ))}
            <Text style={styles.profileFooter}>সেবা এলাকা: রাজশাহী শহর · Farin’s Kitchen</Text>
          </View>
        )}
      </ScrollView>

      {!isWide ? (
        <View style={styles.bottomNavigation}>
          {([
            { id: 'home', label: 'হোম', icon: '⌂' },
            { id: 'cart', label: 'কার্ট', icon: '♧' },
            { id: 'orders', label: 'অর্ডার', icon: '▤' },
            { id: 'profile', label: 'প্রোফাইল', icon: '♙' },
          ] as const).map((item) => (
            <Pressable
              key={item.id}
              style={[styles.bottomNavigationItem, activeTab === item.id && styles.bottomNavigationItemActive]}
              onPress={() => navigateTab(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === item.id }}
            >
              <View style={styles.bottomNavigationIconWrap}>
                <Text style={[styles.bottomNavigationIcon, activeTab === item.id && styles.bottomNavigationIconActive]}>
                  {item.icon}
                </Text>
                {item.id === 'cart' && itemCount > 0 ? (
                  <View style={styles.bottomCartCount}><Text style={styles.bottomCartCountText}>{itemCount}</Text></View>
                ) : null}
              </View>
              <Text style={[styles.bottomNavigationLabel, activeTab === item.id && styles.bottomNavigationLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Modal
        animationType="slide"
        transparent
        visible={zonePickerVisible}
        onRequestClose={() => setZonePickerVisible(false)}
      >
        <View style={styles.modalScrim}>
          <Pressable style={styles.modalDismissArea} onPress={() => setZonePickerVisible(false)} />
          <View style={[styles.cartSheet, isWide && styles.cartSheetWide]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>রাজশাহী শহর</Text>
                <Text style={styles.sheetTitle}>ডেলিভারি এলাকা</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setZonePickerVisible(false)} accessibilityLabel="বন্ধ করুন">
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            {availableZones.length > 0 ? availableZones.map((zone) => (
              <Pressable
                key={zone.id}
                style={[styles.zoneOption, styles.zonePickerOption, selectedZoneId === zone.id && styles.zoneOptionSelected]}
                onPress={() => {
                  setSelectedZoneId(zone.id);
                  setOrderIdempotencyKey(null);
                  setZonePickerVisible(false);
                }}
                accessibilityRole="button"
              >
                <View>
                  <Text style={[styles.zoneOptionName, selectedZoneId === zone.id && styles.zoneOptionNameSelected]}>{zone.name}</Text>
                  <Text style={styles.zonePickerArea}>{zone.area_code}</Text>
                </View>
                <Text style={styles.zoneOptionFee}>{taka(zone.delivery_fee)} ডেলিভারি</Text>
              </Pressable>
            )) : (
              <Text style={styles.formHint}>ডেলিভারি এলাকা লোড হয়নি। API সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।</Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={consentReady && (
          consentSettingsVisible ||
          (marketingConsent === 'unknown' && metaTrackingLoaded && metaTracking.enabled && Platform.OS === 'web')
        )}
        onRequestClose={() => setConsentSettingsVisible(false)}
      >
        <View style={styles.modalScrim}>
          <View style={[styles.consentCard, isWide && styles.consentCardWide]}>
            <Text style={styles.sheetEyebrow}>আপনার গোপনীয়তা</Text>
            <Text style={styles.sheetTitle}>মার্কেটিং কুকি পছন্দ</Text>
            <Text style={styles.consentCopy}>
              {metaTrackingError
                ? metaTrackingError
                : !metaTrackingLoaded
                  ? 'Meta tracking configuration backend থেকে যাচাই করা হচ্ছে।'
                  : metaTracking.enabled
                ? 'আপনি অনুমতি দিলে আমরা Meta Pixel ব্যবহার করে পেজ দেখা, পণ্য দেখা ও অর্ডারের মতো ইভেন্ট পরিমাপ করব। অনুমতি না দিলে Pixel বা Conversions API চালু হবে না।'
                : 'Meta Pixel backend-এ এখনো চালু বা configure করা হয়নি। Admin panel থেকে Pixel ID সেট করে চালু করুন।'}
            </Text>
            {metaTracking.enabled ? (
              <Text style={styles.consentStatus}>Pixel ID: {metaTracking.pixel_id} · আপনার অনুমতি ছাড়া event পাঠানো হবে না।</Text>
            ) : null}
            <Text style={styles.consentCopy}>প্রয়োজনীয় কার্ট ও অর্ডার কার্যকারিতা এই পছন্দের ওপর নির্ভর করে না।</Text>
            <Pressable
              style={[styles.primaryButton, styles.consentButton]}
              onPress={() => void updateMarketingConsent('accepted')}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>মার্কেটিং পরিমাপ অনুমতি দিন</Text>
            </Pressable>
            <Pressable
              style={styles.consentRejectButton}
              onPress={() => void updateMarketingConsent('rejected')}
              accessibilityRole="button"
            >
              <Text style={styles.consentRejectText}>না, ধন্যবাদ</Text>
            </Pressable>
            <Text style={styles.consentStatus}>
              বর্তমান পছন্দ: {marketingConsent === 'accepted' ? 'অনুমতি দেওয়া হয়েছে' : marketingConsent === 'rejected' ? 'অনুমতি দেওয়া হয়নি' : 'এখনো নির্বাচন করা হয়নি'}
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={contentPageLoading || Boolean(activeContentPage) || Boolean(contentPageError)}
        onRequestClose={closeContentPage}
      >
        <View style={styles.modalScrim}>
          <Pressable style={styles.modalDismissArea} onPress={closeContentPage} />
          <View style={[styles.cartSheet, isWide && styles.cartSheetWide]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>FARIN'S KITCHEN</Text>
                <Text style={styles.sheetTitle}>{activeContentPage?.title ?? 'তথ্যপাতা'}</Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={closeContentPage}
                accessibilityLabel="বন্ধ করুন"
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            {contentPageLoading ? (
              <Text style={styles.formHint}>পাতা লোড হচ্ছে…</Text>
            ) : contentPageError ? (
              <Text style={styles.requiredHint}>{contentPageError}</Text>
            ) : activeContentPage ? (
              <ScrollView style={styles.contentPageBody}>
                {activeContentPage.summary ? (
                  <Text style={styles.contentPageSummary}>{activeContentPage.summary}</Text>
                ) : null}
                <Text style={styles.contentPageText}>{activeContentPage.body}</Text>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={cartVisible}
        onRequestClose={() => setCartVisible(false)}
      >
        <View style={styles.modalScrim}>
          <Pressable style={styles.modalDismissArea} onPress={() => setCartVisible(false)} />
          <View style={[styles.cartSheet, isWide && styles.cartSheetWide]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>{isCheckout ? 'শেষ ধাপ' : 'আপনার পছন্দ'}</Text>
                <Text style={styles.sheetTitle}>
                  {orderPlaced ? 'অর্ডার পেয়েছি!' : isCheckout ? 'ডেলিভারির তথ্য' : `আপনার কার্ট · ${itemCount}`}
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setCartVisible(false)} accessibilityLabel="বন্ধ করুন">
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            {orderPlaced ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartIcon}>♡</Text>
                <Text style={styles.emptyCartTitle}>অর্ডার পেয়েছি, {customerName}!</Text>
                <Text style={styles.orderReference}>অর্ডার রেফারেন্স: {orderReference}</Text>
                <Text style={styles.emptyCartText}>COD অর্ডারটি সার্ভারে জমা হয়েছে এবং নিশ্চিতকরণের অপেক্ষায় আছে। এই পরিবেশে অনলাইন পেমেন্ট চালু নেই।</Text>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => setCartVisible(false)}
                >
                  <Text style={styles.primaryButtonText}>শপিং চালিয়ে যান</Text>
                </Pressable>
              </View>
            ) : isCheckout ? (
              <ScrollView style={styles.checkoutForm} keyboardShouldPersistTaps="handled">
                <Text style={styles.formHint}>অ্যাকাউন্ট লাগবে না—গেস্ট হিসেবেই অর্ডার করুন।</Text>
                <Text style={styles.inputLabel}>আপনার নাম</Text>
                <TextInput
                  value={customerName}
                  onChangeText={(value) => {
                    setCustomerName(value);
                    setCheckoutError('');
                    setOrderIdempotencyKey(null);
                  }}
                  placeholder="নাম লিখুন"
                  style={styles.input}
                />
                <Text style={styles.inputLabel}>মোবাইল নম্বর</Text>
                <TextInput
                  value={customerPhone}
                  onChangeText={(value) => {
                    setCustomerPhone(value);
                    setCheckoutError('');
                    setOrderIdempotencyKey(null);
                  }}
                  placeholder="01XXXXXXXXX"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
                <Text style={styles.inputLabel}>ডেলিভারি এলাকা · রাজশাহী</Text>
                {availableZones.length > 0 ? (
                  <View style={styles.zoneList}>
                    {availableZones.map((zone) => (
                      <Pressable
                        key={zone.id}
                        onPress={() => {
                          setSelectedZoneId(zone.id);
                          setOrderIdempotencyKey(null);
                          setCheckoutError('');
                        }}
                        style={[styles.zoneOption, selectedZoneId === zone.id && styles.zoneOptionSelected]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedZoneId === zone.id }}
                      >
                        <Text style={[styles.zoneOptionName, selectedZoneId === zone.id && styles.zoneOptionNameSelected]}>
                          {zone.name}
                        </Text>
                        <Text style={[styles.zoneOptionFee, selectedZoneId === zone.id && styles.zoneOptionNameSelected]}>
                          {taka(zone.delivery_fee)} ডেলিভারি
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.requiredHint}>সার্ভার থেকে ডেলিভারি এলাকা পাওয়া যায়নি। অর্ডারের আগে API সংযোগ করুন।</Text>
                )}
                <Text style={styles.inputLabel}>ডেলিভারি ঠিকানা · রাজশাহী</Text>
                <TextInput
                  value={deliveryAddress}
                  onChangeText={(value) => {
                    setDeliveryAddress(value);
                    setCheckoutError('');
                    setOrderIdempotencyKey(null);
                  }}
                  placeholder="বাড়ি, রোড, এলাকা"
                  style={[styles.input, styles.addressInput]}
                  multiline
                />
                <Text style={styles.inputLabel}>পেমেন্ট পদ্ধতি</Text>
                <View style={styles.paymentPlaceholder}><Text style={styles.paymentPlaceholderText}>ক্যাশ অন ডেলিভারি · অনলাইন পেমেন্ট পরে যুক্ত হবে</Text></View>
                <View style={styles.checkoutTotal}><Text style={styles.totalLabel}>পণ্যের সাবটোটাল</Text><Text style={styles.totalAmount}>{taka(subtotal)}</Text></View>
                {quoteLoading ? <Text style={styles.formHint}>ডেলিভারি চার্জ গণনা হচ্ছে…</Text> : null}
                {deliveryQuote ? (
                  <>
                    <View style={styles.checkoutTotal}>
                      <Text style={styles.totalLabel}>ডেলিভারি চার্জ · {deliveryQuote.delivery_zone.name}</Text>
                      <Text style={styles.totalLabel}>{deliveryQuote.free_delivery ? 'ফ্রি' : taka(deliveryQuote.delivery_fee)}</Text>
                    </View>
                    <View style={styles.checkoutTotal}>
                      <Text style={styles.totalLabel}>সর্বমোট</Text>
                      <Text style={styles.totalAmount}>{taka(deliveryQuote.total)}</Text>
                    </View>
                  </>
                ) : null}
                {quoteError ? <Text style={styles.requiredHint}>{quoteError}</Text> : null}
                <Text style={styles.prototypeNote}>COD অর্ডার সার্ভারে যাচাই করে জমা হবে। অনলাইন পেমেন্ট এই পরিবেশে চালু নেই।</Text>
                <Pressable
                  style={[styles.primaryButton, styles.checkoutButton, (checkoutBusy || !deliveryQuote) && styles.disabledButton]}
                  onPress={placeOrder}
                  accessibilityRole="button"
                  disabled={checkoutBusy || !deliveryQuote}
                >
                  <Text style={styles.primaryButtonText}>{checkoutBusy ? 'অর্ডার জমা হচ্ছে…' : 'COD অর্ডার জমা দিন'}</Text>
                  {!checkoutBusy ? <Text style={styles.buttonArrow}>↗</Text> : null}
                </Pressable>
                {checkoutError ? (
                  <Text style={styles.requiredHint}>{checkoutError}</Text>
                ) : (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) ? (
                  <Text style={styles.requiredHint}>চালিয়ে যেতে নাম, ফোন ও ঠিকানা পূরণ করুন।</Text>
                ) : null}
              </ScrollView>
            ) : cartEntries.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartIcon}>♧</Text>
                <Text style={styles.emptyCartTitle}>কার্ট এখনো খালি</Text>
                <Text style={styles.emptyCartText}>পছন্দের কেক বা পুডিং যোগ করে মিষ্টি মুহূর্ত শুরু করুন।</Text>
                <Pressable style={styles.primaryButton} onPress={() => setCartVisible(false)}>
                  <Text style={styles.primaryButtonText}>মেনু দেখুন</Text>
                  <Text style={styles.buttonArrow}>↗</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <ScrollView style={styles.cartItems} showsVerticalScrollIndicator={false}>
                  {cartEntries.map((product) => (
                    <View key={product.id} style={styles.cartItem}>
                      <CakeArtwork product={product} compact />
                      <View style={styles.cartItemCopy}>
                        <Text style={styles.cartItemName}>{product.name}</Text>
                        <Text style={styles.cartItemSubtitle}>{product.subtitle}</Text>
                        <Text style={styles.cartItemPrice}>{taka(product.price)}</Text>
                      </View>
                      <View style={styles.quantityControl}>
                        <Pressable onPress={() => changeQuantity(product.id, -1)} style={styles.quantityButton}>
                          <Text style={styles.quantityButtonText}>−</Text>
                        </Pressable>
                        <Text style={styles.quantityValue}>{cart[product.id]}</Text>
                        <Pressable onPress={() => changeQuantity(product.id, 1)} style={styles.quantityButton}>
                          <Text style={styles.quantityButtonText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.cartSummary}>
                  <View style={styles.checkoutTotal}><Text style={styles.totalLabel}>সাবটোটাল</Text><Text style={styles.totalAmount}>{taka(subtotal)}</Text></View>
                  <Text style={styles.deliveryHint}>৳১,৫০০+ অর্ডারে ডেলিভারি ফ্রি · ডেলিভারি চার্জ চেকআউটে</Text>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => {
                      setIsCheckout(true);
                      trackMarketingEvent('InitiateCheckout', {
                        content_ids: cartEntries.map((product) => String(product.id)),
                        content_type: 'product',
                        num_items: itemCount,
                        value: subtotal,
                        currency: 'BDT',
                      });
                    }}
                  >
                    <Text style={styles.primaryButtonText}>গেস্ট চেকআউটে যান</Text>
                    <Text style={styles.buttonArrow}>↗</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={customCakeVisible}
        onRequestClose={() => setCustomCakeVisible(false)}
      >
        <View style={styles.modalScrim}>
          <Pressable style={styles.modalDismissArea} onPress={() => setCustomCakeVisible(false)} />
          <View style={[styles.cartSheet, isWide && styles.cartSheetWide]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>বিশেষ দিনের জন্য</Text>
                <Text style={styles.sheetTitle}>{customCakeSubmitted ? 'অনুরোধ তৈরি হয়েছে' : 'কাস্টম কেক'}</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setCustomCakeVisible(false)} accessibilityLabel="বন্ধ করুন">
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            {customCakeSubmitted ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartIcon}>✿</Text>
                <Text style={styles.emptyCartTitle}>ধন্যবাদ, {customCakeName}!</Text>
                <Text style={styles.emptyCartText}>
                  আপনার কাস্টম কেকের অনুরোধ backend-এ জমা হয়েছে। রেফারেন্স: {customCakeReference}
                </Text>
                <Pressable style={styles.primaryButton} onPress={() => setCustomCakeVisible(false)}>
                  <Text style={styles.primaryButtonText}>ঠিক আছে</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={styles.checkoutForm} keyboardShouldPersistTaps="handled">
                <Text style={styles.formHint}>আপনার আইডিয়া জানান—দাম ও প্রস্তুতির সময় নিশ্চিত করতে যোগাযোগ করা হবে।</Text>
                <Text style={styles.inputLabel}>আপনার নাম</Text>
                <TextInput value={customCakeName} onChangeText={setCustomCakeName} placeholder="নাম লিখুন" style={styles.input} />
                <Text style={styles.inputLabel}>মোবাইল নম্বর</Text>
                <TextInput
                  value={customCakePhone}
                  onChangeText={(value) => {
                    setCustomCakePhone(value);
                    setCustomCakeError('');
                  }}
                  placeholder="01XXXXXXXXX"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
                <Text style={styles.inputLabel}>কেকের আকার, ফ্লেভার ও ডিজাইন</Text>
                <TextInput
                  value={customCakeDetails}
                  onChangeText={(value) => {
                    setCustomCakeDetails(value);
                    setCustomCakeError('');
                  }}
                  placeholder="কতজনের জন্য, পছন্দের ফ্লেভার, ডিজাইন ও তারিখ"
                  style={[styles.input, styles.addressInput]}
                  multiline
                />
                <Text style={styles.prototypeNote}>API সংযোগ না থাকলে অনুরোধ জমা হবে না। যোগাযোগের পর দাম ও প্রস্তুতির সময় নিশ্চিত করা হবে।</Text>
                <Pressable
                  style={[styles.primaryButton, styles.checkoutButton, customCakeBusy && styles.disabledButton]}
                  onPress={submitCustomCakeRequest}
                  disabled={customCakeBusy}
                >
                  <Text style={styles.primaryButtonText}>{customCakeBusy ? 'অনুরোধ জমা হচ্ছে…' : 'কেকের অনুরোধ জমা দিন'}</Text>
                  {!customCakeBusy ? <Text style={styles.buttonArrow}>↗</Text> : null}
                </Pressable>
                {customCakeError ? <Text style={styles.requiredHint}>{customCakeError}</Text> : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#FBF6D8' },
  storageWarning: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF1E7', color: '#80593D', textAlign: 'center', fontSize: 10 },
  apiNotice: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F1E7AC' },
  apiNoticeText: { color: '#735D43', textAlign: 'center', fontSize: 10, lineHeight: 16 },
  announcement: {
    minHeight: 34,
    paddingHorizontal: 20,
    backgroundColor: '#F1E7AC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  announcementText: { flexShrink: 1, paddingVertical: 6, color: '#363127', textAlign: 'center', fontSize: 11, lineHeight: 16, letterSpacing: 0.2 },
  announcementRight: { color: '#73694D', fontSize: 10, letterSpacing: 0.2 },
  header: {
    minHeight: 76,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F2EBC8',
    backgroundColor: '#FBF6D8',
    zIndex: 2,
  },
  headerWide: { paddingHorizontal: '7%' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 39, height: 39, borderRadius: 20, backgroundColor: '#F2E1A1', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#1A1815', fontSize: 23, fontFamily: 'Georgia', fontStyle: 'italic' },
  brandHeart: { position: 'absolute', right: -2, top: -3, color: '#E86278', fontSize: 13 },
  brandLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandName: { color: '#171512', fontSize: 20, fontFamily: 'Georgia', fontStyle: 'italic', letterSpacing: 0.1 },
  chefHat: { color: '#5D4739', fontSize: 18, transform: [{ rotate: '-12deg' }] },
  brandTagline: { marginTop: 1, color: '#8C8B7C', fontSize: 7, letterSpacing: 1.6 },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 34 },
  navLink: { color: '#6D7166', fontSize: 13 },
  navLinkActive: { color: '#25493D' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchButton: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center' },
  searchIcon: { color: '#25493D', fontSize: 29, transform: [{ rotate: '-25deg' }] },
  cartButton: { height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E8E4DA', borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cartIcon: { color: '#25493D', fontSize: 21 },
  cartButtonText: { color: '#25493D', fontSize: 12 },
  cartCount: { minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#DDAA74', alignItems: 'center', justifyContent: 'center' },
  cartCountText: { color: '#25493D', fontSize: 10, fontWeight: '700' },
  page: { paddingBottom: 24 },
  hero: { paddingTop: 12, paddingHorizontal: 19, paddingBottom: 14, overflow: 'hidden' },
  heroWide: { minHeight: 500, paddingTop: 65, paddingHorizontal: '10%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCopy: { flex: 1, zIndex: 1 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 17 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C9815D' },
  eyebrowText: { color: '#877C6B', fontSize: 11, letterSpacing: 0.3 },
  heroTitle: { color: '#25493D', fontFamily: 'Georgia', fontSize: 50, lineHeight: 60, fontWeight: '400' },
  heroTitleMobile: { color: '#25493D', fontFamily: 'Georgia', fontSize: 31, lineHeight: 36, fontWeight: '400' },
  heroTitleWide: { fontSize: 68, lineHeight: 77 },
  heroTitleAccent: { color: '#B86C50', fontStyle: 'italic' },
  heroDescription: { maxWidth: 405, marginTop: 16, color: '#73766B', fontSize: 14, lineHeight: 24 },
  heroDescriptionMobile: { maxWidth: 340, marginTop: 7, color: '#73766B', fontSize: 10, lineHeight: 16 },
  heroActions: { marginTop: 11, flexDirection: 'row', alignItems: 'center', gap: 15, flexWrap: 'wrap' },
  primaryButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 4, backgroundColor: '#25493D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  primaryButtonText: { color: '#FFF9F0', fontSize: 13, fontWeight: '600' },
  buttonArrow: { color: '#E8CDAA', fontSize: 16 },
  heroNote: { color: '#8C8B7C', fontSize: 10 },
  socialProof: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 30 },
  avatarStack: { flexDirection: 'row', paddingLeft: 4 },
  avatar: { width: 27, height: 27, marginLeft: -4, borderRadius: 14, borderWidth: 2, borderColor: '#FCFAF7', backgroundColor: '#D6A78C', textAlign: 'center', textAlignVertical: 'center', color: '#FFF8EF', fontSize: 11, overflow: 'hidden' },
  avatarTwo: { backgroundColor: '#899987' },
  avatarThree: { backgroundColor: '#C97F65' },
  ratingText: { color: '#C78B4E', fontSize: 11, letterSpacing: 1 },
  ratingValue: { color: '#405446', fontSize: 10, letterSpacing: 0 },
  ratingCaption: { marginTop: 2, color: '#898A80', fontSize: 9 },
  heroArtWrap: { height: 370, flex: 1, maxWidth: 475, marginLeft: 20, alignItems: 'center', justifyContent: 'center' },
  heroArtBackdrop: { position: 'absolute', width: 330, height: 330, borderRadius: 170, backgroundColor: '#F2E9DD' },
  heroArt: { width: '89%', height: '86%', transform: [{ rotate: '3deg' }] },
  artwork: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  artworkCompact: { width: '100%', height: 166 },
  artGlow: { position: 'absolute', width: '72%', height: '82%', opacity: 0.38, borderRadius: 120, transform: [{ rotate: '-17deg' }] },
  artSparkleOne: { position: 'absolute', width: 8, height: 8, borderRadius: 5, backgroundColor: '#FFFAEF', top: '19%', right: '19%' },
  artSparkleTwo: { position: 'absolute', width: 5, height: 5, borderRadius: 4, backgroundColor: '#FFFAEF', top: '30%', left: '18%' },
  cakeArrangement: { width: '65%', height: '63%', alignItems: 'center', justifyContent: 'flex-end' },
  cakeTop: { width: '73%', height: '25%', position: 'absolute', top: 7, zIndex: 2, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  cakeBody: { width: '100%', height: '69%', overflow: 'hidden', borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#573D2D', shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  cakeLayer: { position: 'absolute', top: '52%', left: 0, right: 0, height: '11%' },
  cakeDrip: { position: 'absolute', top: -5, left: 0, right: 0, height: 14, borderRadius: 14 },
  cakePlate: { width: '116%', height: 12, position: 'absolute', bottom: -7, borderRadius: 8, elevation: 2 },
  berry: { width: 16, height: 18, position: 'absolute', borderRadius: 11, top: -6, left: '34%', transform: [{ rotate: '-28deg' }] },
  berryTwo: { left: '54%', top: 2, transform: [{ rotate: '28deg' }] },
  leaf: { width: 15, height: 7, position: 'absolute', top: 1, left: '46%', borderTopLeftRadius: 9, borderBottomRightRadius: 9, transform: [{ rotate: '-20deg' }] },
  puddingArrangement: { width: '58%', height: '69%', alignItems: 'center', justifyContent: 'center' },
  puddingCup: { width: '70%', height: '69%', zIndex: 2, alignItems: 'center', justifyContent: 'flex-start', borderBottomLeftRadius: 27, borderBottomRightRadius: 27, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderWidth: 1, borderColor: 'rgba(118,79,52,0.16)', overflow: 'hidden', shadowColor: '#573D2D', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  puddingTop: { width: '100%', height: '25%', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  puddingShine: { position: 'absolute', left: '18%', top: '38%', width: 9, height: '35%', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.42)' },
  puddingPlate: { position: 'absolute', width: '99%', height: 13, bottom: '7%', borderRadius: 10 },
  cookieArrangement: { width: '72%', height: '68%', alignItems: 'center', justifyContent: 'center' },
  cookie: { width: 57, height: 57, position: 'absolute', borderRadius: 30, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowColor: '#573D2D', shadowOpacity: 0.13, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cookieTop: { top: 2, left: '27%', zIndex: 2 },
  cookieBottom: { bottom: 0, right: '18%' },
  cookieDot: { width: 6, height: 6, position: 'absolute', borderRadius: 4, top: 14, left: 18 },
  cookieDotTwo: { top: 31, left: 28 },
  cookieDotThree: { top: 19, left: 38 },
  artLabel: { position: 'absolute', bottom: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,250,240,0.7)' },
  artLabelText: { color: '#756958', fontSize: 6, letterSpacing: 1.7 },
  heroFloatingNote: { position: 'absolute', left: 1, bottom: 39, paddingVertical: 12, paddingHorizontal: 13, borderRadius: 4, backgroundColor: '#FFFCF7', flexDirection: 'row', alignItems: 'center', gap: 9, shadowColor: '#4C3A2C', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  floatingNoteStar: { color: '#C6825A', fontSize: 22 },
  floatingNoteTitle: { color: '#394A3D', fontSize: 10, fontWeight: '600' },
  floatingNoteCaption: { marginTop: 3, color: '#8E8A7D', fontSize: 8 },
  heroBadge: { position: 'absolute', top: 27, right: 0, width: 66, height: 66, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2B37E', transform: [{ rotate: '12deg' }] },
  heroBadgeTop: { color: '#25493D', fontFamily: 'Georgia', fontSize: 18 },
  heroBadgeBottom: { color: '#25493D', fontSize: 8 },
  mobileSearchArea: { paddingHorizontal: 18, paddingBottom: 12, backgroundColor: '#FBF6D8' },
  deliveryLocation: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 9 },
  locationPin: { color: '#24221D', fontSize: 23 },
  locationCopy: { flex: 1 },
  locationLabel: { color: '#827D6E', fontSize: 10 },
  locationValue: { marginTop: 1, color: '#25231D', fontSize: 13, fontWeight: '700' },
  locationChevron: { color: '#4A4539', fontSize: 20 },
  mobileSearchButton: { height: 43, marginTop: 8, paddingHorizontal: 12, borderRadius: 11, backgroundColor: '#FFFDF4', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#EEE6C2' },
  mobileSearchPlaceholder: { color: '#898577', fontSize: 12 },
  mobileHeroCard: { minHeight: 155, marginHorizontal: 17, marginTop: 10, marginBottom: 7, padding: 15, borderRadius: 18, backgroundColor: '#F1E7AC', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  mobileHeroCopy: { flex: 1, zIndex: 1 },
  mobileHeroEyebrow: { color: '#8B6A43', fontSize: 10, fontWeight: '700' },
  mobileHeroTitle: { marginTop: 5, color: '#211D17', fontFamily: 'Georgia', fontSize: 26, lineHeight: 30, fontWeight: '700' },
  mobileHeroCaption: { maxWidth: 200, marginTop: 5, color: '#66604F', fontSize: 10 },
  mobileHeroButton: { alignSelf: 'flex-start', marginTop: 9, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 3, backgroundColor: '#25493D' },
  mobileHeroButtonText: { color: '#FFF9F0', fontSize: 10, fontWeight: '600' },
  mobileHeroArtwork: { width: '37%', height: 125, marginLeft: 8, overflow: 'hidden', borderRadius: 16 },
  promiseStrip: { minHeight: 76, marginHorizontal: 17, paddingHorizontal: 5, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EAE5DB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  promiseItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  promiseIcon: { color: '#B8795B', fontSize: 20 },
  promiseTitle: { color: '#354B3D', fontSize: 10, fontWeight: '600' },
  promiseCaption: { marginTop: 3, color: '#8E8B7F', fontSize: 8 },
  promiseDivider: { width: 1, height: 34, backgroundColor: '#EAE5DB' },
  viewAllLink: { color: '#5B5648', fontSize: 10, fontWeight: '700' },
  categoryGrid: { marginTop: 17, marginBottom: 28, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 16 },
  categoryTile: { width: '33.333%', minHeight: 106, alignItems: 'center', justifyContent: 'flex-start' },
  categoryArtwork: { width: 76, height: 76, borderRadius: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.7)' },
  categoryEmoji: { fontSize: 37 },
  categoryTileName: { maxWidth: 100, marginTop: 7, color: '#26231D', fontFamily: 'Georgia', fontSize: 13, textAlign: 'center' },
  dealList: { paddingTop: 16, paddingBottom: 27, gap: 12 },
  dealCard: { width: 157, minHeight: 222, padding: 9, borderRadius: 17, overflow: 'hidden' },
  dealArtwork: { height: 111, borderRadius: 13, overflow: 'hidden', backgroundColor: '#FFFBEC' },
  dealBadge: { position: 'absolute', top: 15, left: 15, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FFFDF4', color: '#765D3F', fontSize: 8 },
  dealName: { minHeight: 34, marginTop: 7, color: '#25231D', fontFamily: 'Georgia', fontSize: 13, fontWeight: '600' },
  dealSubtitle: { marginTop: 3, color: '#6E6A5C', fontSize: 9 },
  dealPriceRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dealPrice: { color: '#26231D', fontSize: 14, fontWeight: '800' },
  dealAddButton: { width: 31, height: 31, borderRadius: 17, backgroundColor: '#FFFDF3', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  dealAddText: { color: '#222019', fontSize: 22, lineHeight: 25 },
  favoriteSelected: { color: '#E86278' },
  campaignSection: { paddingHorizontal: 18, paddingTop: 30 },
  campaignSectionWide: { paddingHorizontal: '7%', gap: 16 },
  campaignCard: { marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#EAE5DB', borderRadius: 6, backgroundColor: '#FFFEFC' },
  campaignCardWide: { flexDirection: 'row', alignItems: 'stretch' },
  campaignImage: { width: '100%', height: 205, backgroundColor: '#F2E9DD' },
  campaignImageWide: { width: '45%', height: 270 },
  campaignCopy: { flex: 1, padding: 20, alignItems: 'flex-start', justifyContent: 'center' },
  campaignEyebrow: { color: '#B8795B', fontSize: 10, letterSpacing: 1 },
  campaignTitle: { marginTop: 7, color: '#25493D', fontFamily: 'Georgia', fontSize: 23 },
  campaignBody: { marginTop: 8, color: '#73766B', fontSize: 12, lineHeight: 19 },
  campaignButton: { minHeight: 42, marginTop: 15, paddingHorizontal: 16, borderRadius: 4, backgroundColor: '#25493D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  campaignButtonText: { color: '#FFF9F0', fontSize: 11, fontWeight: '600' },
  productPage: { minHeight: 570, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 },
  productPageWide: { paddingHorizontal: '9%', paddingTop: 34 },
  productBackButton: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center', marginBottom: 18 },
  productBackText: { color: '#52634A', fontSize: 12, fontWeight: '600' },
  productPageLayout: { gap: 22 },
  productPageLayoutWide: { flexDirection: 'row', alignItems: 'center', gap: 54, minHeight: 470 },
  productGallery: { gap: 10 },
  productGalleryWide: { flex: 1 },
  productDetailArtwork: { height: 280, position: 'relative', overflow: 'hidden', borderRadius: 8, backgroundColor: '#F2E9DD', padding: 13 },
  productDetailArtworkWide: { height: 410 },
  productDetailMainImage: { width: '100%', height: '100%', borderRadius: 5 },
  productImageThumbnails: { gap: 9, paddingVertical: 2 },
  productImageThumbnail: { width: 62, height: 62, borderWidth: 2, borderColor: 'transparent', borderRadius: 5, overflow: 'hidden' },
  productImageThumbnailSelected: { borderColor: '#25493D' },
  productImageThumbnailImage: { width: '100%', height: '100%' },
  productPhoto: { borderRadius: 8 },
  productDetailBadge: { position: 'absolute', top: 24, left: 24, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 3, backgroundColor: '#FFF9F0', color: '#72644E', fontSize: 10 },
  productDetailCopy: { flex: 1, paddingBottom: 12 },
  productDetailTitle: { marginTop: 9, color: '#25493D', fontFamily: 'Georgia', fontSize: 32, lineHeight: 40 },
  productDetailSubtitle: { marginTop: 8, color: '#77786F', fontSize: 13 },
  productDetailPrice: { marginTop: 17, color: '#25493D', fontSize: 24, fontWeight: '700' },
  productDetailRule: { height: 1, marginTop: 19, marginBottom: 16, backgroundColor: '#E8E1D1' },
  productDetailDescription: { color: '#57594F', fontSize: 13, lineHeight: 23 },
  productDetailPromise: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17 },
  productDetailPromiseText: { flex: 1, color: '#77786F', fontSize: 10, lineHeight: 16 },
  productDetailError: { marginTop: 14, color: '#A24A3D', fontSize: 11, lineHeight: 18 },
  productDetailActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 21 },
  productDetailQuantity: { minHeight: 48, paddingHorizontal: 10, borderWidth: 1, borderColor: '#DCD8CE', borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 11 },
  productDetailAddButton: { minHeight: 48, flex: 1, paddingHorizontal: 14, borderRadius: 4, backgroundColor: '#25493D', alignItems: 'center', justifyContent: 'center' },
  productDetailAddText: { color: '#FFF9F0', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  productDetailFavorite: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', minHeight: 40, marginTop: 9, paddingHorizontal: 4 },
  productDetailFavoriteText: { color: '#6D7166', fontSize: 10 },
  productPageMessage: { minHeight: 350, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  productPageMessageActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8 },
  secondaryButton: { minHeight: 48, paddingHorizontal: 17, borderWidth: 1, borderColor: '#25493D', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#25493D', fontSize: 12, fontWeight: '600' },
  menuSection: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 30 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { color: '#B8795B', fontSize: 10, letterSpacing: 1 },
  sectionTitle: { marginTop: 7, color: '#25493D', fontFamily: 'Georgia', fontSize: 30 },
  sectionAside: { paddingBottom: 5, color: '#898A80', fontSize: 10 },
  categoryList: { paddingVertical: 19, gap: 8 },
  categoryChip: { paddingVertical: 8, paddingHorizontal: 18, borderWidth: 1, borderColor: '#E9E5DB', borderRadius: 30 },
  categoryChipActive: { backgroundColor: '#25493D', borderColor: '#25493D' },
  categoryText: { color: '#77786F', fontSize: 11 },
  categoryTextActive: { color: '#FFF9F0' },
  searchInput: { minHeight: 44, marginBottom: 16, paddingHorizontal: 13, borderWidth: 1, borderColor: '#E5DFD4', borderRadius: 4, backgroundColor: '#FFFEFC', color: '#34483A', fontSize: 12 },
  noResults: { minHeight: 150, alignItems: 'center', justifyContent: 'center' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 20 },
  productGridWide: { justifyContent: 'flex-start', gap: 20 },
  productCard: { width: '48.4%', overflow: 'hidden', borderWidth: 1, borderColor: '#EEE9DF', borderRadius: 6, backgroundColor: '#FFFEFC' },
  productCardWide: { width: '23.5%', minWidth: 205, flexGrow: 1, flexBasis: 205 },
  productArtWrap: { position: 'relative', padding: 8 },
  productBadge: { position: 'absolute', top: 15, left: 15, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 2, backgroundColor: '#FFF9F0', color: '#72644E', fontSize: 8 },
  favoriteButton: { position: 'absolute', top: 13, right: 13, width: 27, height: 27, borderRadius: 14, backgroundColor: 'rgba(255,251,246,0.9)', alignItems: 'center', justifyContent: 'center' },
  favoriteIcon: { color: '#845D4B', fontSize: 17 },
  productInfo: { paddingHorizontal: 12, paddingBottom: 14 },
  productTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 3 },
  productName: { flexShrink: 1, color: '#34483A', fontFamily: 'Georgia', fontSize: 14 },
  productRating: { color: '#B88952', fontSize: 8 },
  productSubtitle: { marginTop: 6, color: '#918F83', fontSize: 9 },
  productBuyRow: { marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  productPrice: { color: '#25493D', fontSize: 13, fontWeight: '700' },
  addButton: { minHeight: 31, paddingHorizontal: 8, borderRadius: 3, borderWidth: 1, borderColor: '#D8E0D9', alignItems: 'center', justifyContent: 'center' },
  addButtonSelected: { borderColor: '#25493D', backgroundColor: '#25493D' },
  addButtonText: { color: '#355447', fontSize: 8 },
  addButtonTextSelected: { color: '#FFF9F0' },
  customBanner: { minHeight: 330, paddingVertical: 31, paddingHorizontal: 24, backgroundColor: '#25493D', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  customBannerWide: { paddingHorizontal: '10%', minHeight: 365 },
  customCopy: { flex: 1, zIndex: 1 },
  customEyebrow: { color: '#D7B891', fontSize: 10, letterSpacing: 1 },
  customTitle: { marginTop: 12, color: '#FFF8EE', fontFamily: 'Georgia', fontSize: 29, lineHeight: 37 },
  customDescription: { maxWidth: 370, marginTop: 10, color: '#D6E0D8', fontSize: 11, lineHeight: 19 },
  lightButton: { alignSelf: 'flex-start', minHeight: 43, marginTop: 17, paddingHorizontal: 14, borderRadius: 3, backgroundColor: '#FFF8EE', flexDirection: 'row', alignItems: 'center', gap: 12 },
  lightButtonText: { color: '#25493D', fontSize: 10, fontWeight: '600' },
  customArt: { width: '41%', height: 245, marginLeft: 14, alignItems: 'center', justifyContent: 'center' },
  customFlower: { position: 'absolute', right: 3, top: 3, width: 52, height: 52, borderRadius: 30, backgroundColor: '#D7B891', alignItems: 'center', justifyContent: 'center' },
  customFlowerText: { color: '#25493D', fontSize: 25 },
  footer: { paddingTop: 32, paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 15 },
  footerBrand: { gap: 3 },
  footerNote: { color: '#8D8C80', fontSize: 9 },
  footerPages: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginVertical: 10 },
  footerPageLink: { color: '#52634A', fontSize: 10, textDecorationLine: 'underline' },
  footerLocation: { color: '#73776D', fontSize: 9 },
  appPage: { flex: 1, minHeight: 550, paddingHorizontal: 18, paddingTop: 26, paddingBottom: 34 },
  pageTitleBlock: { marginBottom: 20 },
  pageTitle: { marginTop: 5, color: '#201E19', fontFamily: 'Georgia', fontSize: 29, fontWeight: '700' },
  pageSubtitle: { marginTop: 5, color: '#777262', fontSize: 11, lineHeight: 17 },
  pageEmptyState: { minHeight: 300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25 },
  pageEmptyIcon: { fontSize: 48 },
  pageEmptyTitle: { marginTop: 12, color: '#2A271F', fontFamily: 'Georgia', fontSize: 21 },
  pageEmptyCopy: { maxWidth: 280, marginTop: 7, marginBottom: 17, color: '#797465', fontSize: 11, lineHeight: 18, textAlign: 'center' },
  cartPageItems: { paddingHorizontal: 12, borderRadius: 17, backgroundColor: '#FFFDF5' },
  cartPageItem: { minHeight: 93, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#EEEAD9', flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartPageArt: { width: 66, height: 66, overflow: 'hidden', borderRadius: 12 },
  cartPageCopy: { flex: 1 },
  cartPageName: { color: '#25231D', fontFamily: 'Georgia', fontSize: 13, fontWeight: '600' },
  cartPageSubtitle: { marginTop: 3, color: '#8A8577', fontSize: 9 },
  cartPagePrice: { marginTop: 5, color: '#2A271F', fontSize: 12, fontWeight: '700' },
  cartPageSummary: { marginTop: 16, padding: 16, borderRadius: 17, backgroundColor: '#FFFDF5' },
  summaryHeading: { marginBottom: 9, color: '#29261F', fontFamily: 'Georgia', fontSize: 17, fontWeight: '700' },
  summaryRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gradientOrderButton: { minHeight: 49, marginTop: 11, paddingHorizontal: 17, borderRadius: 25, backgroundColor: '#E5B33E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  gradientOrderButtonText: { color: '#201E19', fontSize: 13, fontWeight: '800' },
  gradientOrderArrow: { color: '#201E19', fontSize: 18 },
  orderCard: { marginBottom: 13, padding: 15, borderRadius: 16, backgroundColor: '#FFFDF5', borderWidth: 1, borderColor: '#EFE9D2' },
  orderCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderCardEyebrow: { color: '#847D6C', fontSize: 9 },
  orderCardReference: { marginTop: 2, color: '#25231D', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  orderStatusPill: { maxWidth: '48%', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F5E6AD' },
  orderStatusText: { color: '#6C5422', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  orderCardDate: { marginTop: 8, marginBottom: 5, color: '#8A8577', fontSize: 9 },
  orderItemRow: { paddingVertical: 5 },
  orderItemName: { color: '#575346', fontSize: 11 },
  orderCardFooter: { marginTop: 8, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#EEEAD9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeCard: { marginTop: 4, padding: 12, borderRadius: 12, backgroundColor: '#F1E7AC', color: '#685B3D', fontSize: 10, lineHeight: 17 },
  profileHero: { alignItems: 'center', paddingVertical: 17, marginBottom: 22 },
  profileAvatar: { width: 75, height: 75, borderRadius: 38, backgroundColor: '#E9C968', alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: '#201E19', fontFamily: 'Georgia', fontSize: 36, fontStyle: 'italic' },
  guestBadge: { marginTop: 11, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, backgroundColor: '#F1E7AC' },
  guestBadgeText: { color: '#665A38', fontSize: 9, fontWeight: '700' },
  profileSectionTitle: { marginTop: 12, marginBottom: 7, color: '#756F60', fontSize: 10, fontWeight: '700' },
  profileAction: { minHeight: 64, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#EEEAD9', backgroundColor: '#FFFDF5', flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileActionIcon: { width: 34, height: 34, borderRadius: 18, backgroundColor: '#F5EFCF', color: '#57513E', fontSize: 19, textAlign: 'center', textAlignVertical: 'center' },
  profileActionCopy: { flex: 1 },
  profileActionTitle: { color: '#302D25', fontSize: 11, fontWeight: '700' },
  profileActionHint: { marginTop: 3, color: '#8A8577', fontSize: 9 },
  profileFooter: { marginTop: 22, color: '#8A8577', fontSize: 10, textAlign: 'center' },
  bottomNavigation: { minHeight: 67, paddingHorizontal: 9, paddingTop: 7, paddingBottom: Platform.OS === 'web' ? 6 : 15, backgroundColor: '#191919', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopLeftRadius: 21, borderTopRightRadius: 21 },
  bottomNavigationItem: { minWidth: 62, height: 51, paddingHorizontal: 8, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  bottomNavigationItemActive: { backgroundColor: '#FBF6D8' },
  bottomNavigationIconWrap: { position: 'relative' },
  bottomNavigationIcon: { color: '#F7F2DE', fontSize: 20, lineHeight: 23 },
  bottomNavigationIconActive: { color: '#25231D' },
  bottomNavigationLabel: { marginTop: 1, color: '#E7E1CC', fontSize: 9 },
  bottomNavigationLabelActive: { color: '#25231D', fontWeight: '700' },
  bottomCartCount: { position: 'absolute', top: -5, right: -9, minWidth: 14, height: 14, paddingHorizontal: 3, borderRadius: 7, backgroundColor: '#F186A2', alignItems: 'center', justifyContent: 'center' },
  bottomCartCountText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  zonePickerOption: { marginTop: 10, minHeight: 56, paddingHorizontal: 13 },
  zonePickerArea: { marginTop: 3, color: '#898477', fontSize: 9 },
  footerConsentNotice: { maxWidth: 420, marginTop: 8, color: '#A05E48', fontSize: 10, lineHeight: 16, textAlign: 'center' },
  copyright: { color: '#9E9B8F', fontSize: 8 },
  consentCard: { width: '90%', maxWidth: 440, alignSelf: 'center', padding: 23, borderRadius: 8, backgroundColor: '#FFFCF7' },
  consentCardWide: { padding: 30 },
  consentCopy: { marginTop: 12, color: '#666D61', fontSize: 12, lineHeight: 20 },
  consentButton: { width: '100%', marginTop: 19 },
  consentRejectButton: { minHeight: 42, marginTop: 5, alignItems: 'center', justifyContent: 'center' },
  consentRejectText: { color: '#4B5D50', fontSize: 12, textDecorationLine: 'underline' },
  consentStatus: { marginTop: 8, color: '#8E8A7D', fontSize: 10, textAlign: 'center' },
  contentPageBody: { maxHeight: 360, marginTop: 12 },
  contentPageSummary: { marginBottom: 16, color: '#52634A', fontSize: 14, lineHeight: 23, fontWeight: '600' },
  contentPageText: { color: '#686D61', fontSize: 13, lineHeight: 24 },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26,38,31,0.43)' },
  modalDismissArea: { flex: 1 },
  cartSheet: { maxHeight: '88%', minHeight: 310, paddingTop: 22, paddingHorizontal: 22, paddingBottom: 25, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: '#FCFAF7' },
  cartSheetWide: { width: 470, maxHeight: '88%', alignSelf: 'flex-end', borderTopLeftRadius: 16 },
  sheetHeader: { paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#EAE5DB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetEyebrow: { color: '#B8795B', fontSize: 9, letterSpacing: 1 },
  sheetTitle: { marginTop: 4, color: '#25493D', fontFamily: 'Georgia', fontSize: 23 },
  closeButton: { width: 33, height: 33, borderRadius: 18, backgroundColor: '#F0ECE4', alignItems: 'center', justifyContent: 'center' },
  closeButtonText: { color: '#34483A', fontSize: 24, lineHeight: 27 },
  emptyCart: { flex: 1, minHeight: 250, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  emptyCartIcon: { color: '#B8795B', fontSize: 32 },
  emptyCartTitle: { marginTop: 10, color: '#25493D', fontFamily: 'Georgia', fontSize: 22 },
  emptyCartText: { maxWidth: 300, marginTop: 7, marginBottom: 17, color: '#838579', textAlign: 'center', fontSize: 11, lineHeight: 18 },
  cartItems: { flexGrow: 0, maxHeight: 290, paddingVertical: 8 },
  cartItem: { minHeight: 99, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#EEE9DF', flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartItemCopy: { flex: 1 },
  cartItemName: { color: '#34483A', fontFamily: 'Georgia', fontSize: 14 },
  cartItemSubtitle: { marginTop: 4, color: '#918F83', fontSize: 8 },
  cartItemPrice: { marginTop: 7, color: '#25493D', fontSize: 11, fontWeight: '700' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  quantityButton: { width: 25, height: 25, borderRadius: 14, borderWidth: 1, borderColor: '#DCD8CE', alignItems: 'center', justifyContent: 'center' },
  quantityButtonText: { color: '#25493D', fontSize: 16, lineHeight: 20 },
  quantityValue: { color: '#354B3D', fontSize: 11 },
  cartSummary: { paddingTop: 11 },
  checkoutTotal: { paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  zoneList: { gap: 7, marginBottom: 13 },
  zoneOption: { minHeight: 42, paddingHorizontal: 11, borderWidth: 1, borderColor: '#E5DFD4', borderRadius: 4, backgroundColor: '#FFFEFC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  zoneOptionSelected: { borderColor: '#25493D', backgroundColor: '#EDF2EC' },
  zoneOptionName: { color: '#526052', fontSize: 10 },
  zoneOptionNameSelected: { color: '#25493D', fontWeight: '700' },
  zoneOptionFee: { color: '#73776D', fontSize: 9 },
  disabledButton: { opacity: 0.55 },
  totalLabel: { color: '#73776D', fontSize: 11 },
  totalAmount: { color: '#25493D', fontSize: 17, fontWeight: '700' },
  deliveryHint: { marginBottom: 12, color: '#898A80', fontSize: 9 },
  checkoutForm: { paddingTop: 14 },
  formHint: { marginBottom: 15, color: '#73776D', fontSize: 10 },
  inputLabel: { marginBottom: 6, color: '#4F5E50', fontSize: 10, fontWeight: '600' },
  input: { minHeight: 43, marginBottom: 13, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5DFD4', borderRadius: 4, backgroundColor: '#FFFEFC', color: '#34483A', fontSize: 11 },
  addressInput: { minHeight: 66, paddingTop: 12, textAlignVertical: 'top' },
  paymentPlaceholder: { paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E5DFD4', borderRadius: 4, backgroundColor: '#F5F1E9' },
  paymentPlaceholderText: { color: '#6E756A', fontSize: 9 },
  prototypeNote: { marginTop: 2, color: '#9A826E', fontSize: 9 },
  checkoutButton: { marginTop: 12, marginBottom: 8 },
  requiredHint: { marginBottom: 3, color: '#9A826E', textAlign: 'center', fontSize: 9 },
  orderReference: { marginTop: 7, color: '#8A7257', fontSize: 10, fontWeight: '600' },
});
