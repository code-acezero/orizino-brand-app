/**
 * Cross-app URL resolution
 *
 * Priority order:
 *   1. Runtime override — an in-memory cache populated from
 *      site_settings.external_redirects (admins edit these via the Master
 *      Panel → Settings → Redirects UI).
 *   2. Build-time env (NEXT_PUBLIC_STOREFRONT_URL, NEXT_PUBLIC_COMPANY_URL,
 *      NEXT_PUBLIC_MASTERPANEL_URL).
 *   3. Localhost fallback (dev).
 *
 * IMPORTANT — why this is a plain module variable, not `window.__X__`:
 * These apps render server-side first (TanStack Start SSR) — the HTML the
 * browser actually receives is produced in Node, where `window` doesn't
 * exist. A `window.__ORIZINO_URLS__` cache populated by a client-only
 * `useEffect` (as this used to work) is therefore *always* empty during the
 * SSR pass, so every button's `href` gets permanently baked in with the
 * fallback (localhost) value in the initial HTML — and because nothing
 * about that mutation is reactive, no subsequent client render ever fixes
 * it either. A plain module-scope variable works identically during SSR
 * (Node) and in the browser, and — critically — each app's root route
 * loader (see e.g. apps/company/src/routes/__root.tsx) populates it via
 * `setExternalRedirects()` *before* any page component renders, on every
 * request/navigation. That's what actually makes admin-configured
 * redirects take effect, both for the first SSR paint and afterwards.
 */

export interface ExternalRedirects {
  storefront_url?: string;
  brandhome_url?: string;
  masterpanel_url?: string;
  /** Order Ops — the mobile-first order management app (dashboard, scanner, online/offline orders). */
  orderops_url?: string;
  /** Explore App — the interactive brand exploration and discovery app. */
  explore_url?: string;
  shop_url?: string;
  start_shopping_url?: string;
  explore_categories_url?: string;
  /** Label for the company landing nav "Shop" button. */
  shop_label?: string;
  /** Label for the master panel sidebar "Back to Shop" button (desktop). */
  back_to_shop_label?: string;
  /** Label for the master panel sidebar "Back to Shop" button (mobile / compact). */
  back_to_shop_label_short?: string;
  /** Automatically preserve and forward URL query parameters (e.g. UTM tracking, referral tags) across app redirects. */
  preserve_query_params?: boolean;
  /** Custom route alias mappings (e.g. /pos -> Order Ops scanner). */
  custom_routes?: Array<{ id: string; from: string; to: string; app: "storefront" | "brandhome" | "masterpanel" | "orderops" | "explore" | "custom"; active: boolean }>;
}

// Module-scope, isomorphic (works in Node SSR and the browser alike).
// Deliberately NOT `window.__X__` — see the block comment above.
let cache: ExternalRedirects = {};

function clean(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().replace(/\/$/, "");
}
function env(...keys: string[]): string {
  if (typeof process === "undefined") return "";
  for (const k of keys) {
    const val = process.env[k];
    if (val) return clean(val);
  }
  return "";
}
function runtime<K extends keyof ExternalRedirects>(key: K): string {
  const val = cache[key];
  return typeof val === "string" ? clean(val) : "";
}

/**
 * Push admin-configured redirect URLs into the runtime cache. Call this from
 * each app's root route `loader` (so it resolves before any page renders,
 * during SSR too — not just from a client-side effect) and, optionally,
 * again from a client-side effect to pick up live edits without a full
 * reload.
 */
export function setExternalRedirects(next: ExternalRedirects | null | undefined): void {
  cache = { ...cache, ...(next || {}) };
}

function isDev(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" && window.location.hostname === "localhost")
  );
}

/** Returns the storefront origin. */
export function getStorefrontUrl(): string {
  const custom = runtime("storefront_url") || env("NEXT_PUBLIC_STOREFRONT_URL", "VITE_STOREFRONT_URL", "STOREFRONT_URL");
  if (custom) return custom;
  if (isDev()) return "http://localhost:3001";
  return "https://shop.orizino.com";
}
/** Returns the brandhome/landing page origin for local development. */
export function getBrandHomeUrl(): string {
  const custom = runtime("brandhome_url") || env("NEXT_PUBLIC_BRANDHOME_URL", "NEXT_PUBLIC_COMPANY_URL", "VITE_BRANDHOME_URL", "BRANDHOME_URL");
  if (custom) return custom;
  if (isDev()) return "http://localhost:3000";
  return "https://orizino.com";
}

/** Returns the live production domain for the brandhome landing page. */
export function getLiveBrandHomeUrl(path = "/"): string {
  return joinPath("https://orizino.com", path);
}
/** Returns the master panel origin. */
export function getMasterpanelUrl(): string {
  const custom = runtime("masterpanel_url") || env("NEXT_PUBLIC_MASTERPANEL_URL", "VITE_MASTERPANEL_URL", "MASTERPANEL_URL");
  if (custom) return custom;
  if (isDev()) return "http://localhost:3002";
  return "https://mp.orizino.com";
}
/** Returns the Order Ops (mobile order management) app origin. */
export function getOrderOpsUrl(): string {
  const custom = runtime("orderops_url") || env("NEXT_PUBLIC_ORDEROPS_URL", "VITE_ORDEROPS_URL", "ORDEROPS_URL");
  if (custom) return custom;
  if (isDev()) return "http://localhost:3003";
  return "https://om.orizino.com";
}
/** Returns the Explore app origin. */
export function getExploreUrl(): string {
  const custom = runtime("explore_url") || env("NEXT_PUBLIC_EXPLORE_URL", "VITE_EXPLORE_URL", "EXPLORE_URL");
  if (custom) return custom;
  if (isDev()) return "http://localhost:3004";
  return "https://explore.orizino.com";
}

function joinPath(base: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Navigate to a storefront path from any app. */
export function storefrontHref(path = "/"): string {
  return joinPath(getStorefrontUrl(), path);
}
/** Navigate to the brandhome/landing page from any app. */
export function brandHomeHref(path = "/"): string {
  return joinPath(getBrandHomeUrl(), path);
}
/** Navigate to the Master Panel from any app. */
export function masterpanelHref(path = "/"): string {
  return joinPath(getMasterpanelUrl(), path);
}
/** Navigate to an Order Ops path from any app. */
export function orderOpsHref(path = "/"): string {
  return joinPath(getOrderOpsUrl(), path);
}
/** Navigate to the Explore app from any app. */
export function exploreHref(path = "/"): string {
  return joinPath(getExploreUrl(), path);
}

/** Configurable button targets — full URL overrides (absolute or path). */
export function shopHref(): string {
  return runtime("shop_url") || storefrontHref("/");
}
export function startShoppingHref(): string {
  return runtime("start_shopping_url") || storefrontHref("/");
}
export function exploreCategoriesHref(): string {
  return runtime("explore_categories_url") || storefrontHref("/categories");
}

/** Configurable button labels — fall back to sensible defaults. */
export function getShopLabel(fallback = "Shop"): string {
  return runtime("shop_label") || fallback;
}
export function getBackToShopLabel(fallback = "Back to Shop"): string {
  return runtime("back_to_shop_label") || fallback;
}
export function getBackToShopLabelShort(fallback = "Shop"): string {
  return runtime("back_to_shop_label_short") || fallback;
}
// code:4ce0

