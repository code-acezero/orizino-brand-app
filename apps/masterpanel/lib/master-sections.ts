/**
 * SINGLE SOURCE OF TRUTH for master panel sections.
 *
 * Every place that needs to map between:
 *   - URL segment (`/sales`, `/marketing`, ...)
 *   - display label ("Sales & Operations", ...)
 *   - sidebar nav group label (from admin-nav.ts)
 *   - staff_sections gating key
 *
 * MUST import from here. Never duplicate these strings elsewhere.
 */

export type MasterSectionKey =
  | "sales"
  | "products"
  | "seo"
  | "email"
  | "affiliate"
  | "brand"
  | "system"
  | "settings"
  | "team"
  | "master";

export interface MasterSection {
  /** Stable internal key. */
  key: MasterSectionKey;
  /** First URL segment, e.g. "sales" for /sales/orders. No leading slash. */
  segment: string;
  /** Display label used in sidebar header + admin-nav.ts group label. */
  label: string;
  /** Short button/nav label. */
  shortLabel?: string;
  /** Landing path (== `/${segment}`). Precomputed for convenience. */
  path: string;
}

export const MASTER_SECTIONS: readonly MasterSection[] = [
  { key: "sales",     segment: "sales",             label: "Sales & Customers",           shortLabel: "Sales",  path: "/sales" },
  { key: "products",  segment: "products-payments", label: "PSO Management",              shortLabel: "PSO",    path: "/sales/products-management?tab=products" },
  { key: "seo",       segment: "marketing",         label: "SEO & Ads Management",        shortLabel: "SEO",    path: "/marketing" },
  { key: "email",     segment: "email",             label: "Emails & Marketing",          shortLabel: "Email",  path: "/email" },
  { key: "affiliate", segment: "affiliate",         label: "Affiliate Hub",              shortLabel: "Affiliate", path: "/affiliate" },
  { key: "brand",     segment: "brand",             label: "Public Contents & UI",        shortLabel: "Brand",  path: "/brand/home" },
  { key: "system",    segment: "system",            label: "Backend & System",            shortLabel: "System", path: "/system" },
  { key: "settings",  segment: "settings-ai",       label: "Settings & AI",               shortLabel: "Settings", path: "/settings-ai" },
  { key: "team",      segment: "team",              label: "Team & Access",               shortLabel: "Team",   path: "/team" },
  { key: "master",    segment: "master",            label: "All Sections",                shortLabel: "All",    path: "/master" },
] as const;

/** Lookup by first URL segment (no leading slash). */
export const SECTION_BY_SEGMENT: Record<string, MasterSection> =
  Object.fromEntries(MASTER_SECTIONS.map((s) => [s.segment, s]));

/** Header label shown in the sidebar for a given URL segment. */
export const SECTION_LABELS: Record<string, string> = {
  "": "Master Controls",
  ...Object.fromEntries(MASTER_SECTIONS.map((s) => [s.segment, s.label])),
  sales: "Sales & Customers",
  products: "PSO Management",
  "products-payments": "PSO Management",
};

/** Short nav button label for a given URL segment. */
export const SECTION_SHORT_LABELS: Record<string, string> = {
  "": "Master",
  ...Object.fromEntries(MASTER_SECTIONS.map((s) => [s.segment, s.shortLabel || s.label])),
  sales: "Sales",
  products: "PSO",
  "products-payments": "PSO",
};

/** Every section landing path — used by the sidebar to require exact match. */
export const SECTION_LANDING_PATHS: ReadonlySet<string> = new Set(
  MASTER_SECTIONS.map((s) => s.path),
);

/**
 * Which admin-nav.ts group labels are visible on each URL segment.
 * Every screen shows its own group or Master Controls on home.
 * On /master, every group is shown.
 */
export const SEGMENT_TO_NAV_LABELS: Record<string, string[]> = {
  "": ["Master Controls"],     // Master Panel Home shows Master Controls section
  master: ["Master Controls"], // /master merged with home
  sales: ["Sales & Customers"],
  products: ["PSO Management"],
  "products-payments": ["PSO Management"],
  affiliate: ["Affiliate Hub"],
  ...Object.fromEntries(
    MASTER_SECTIONS.filter((s) => s.key !== "master" && s.key !== "sales" && s.key !== "products" && s.key !== "affiliate").map((s) => [
      s.segment,
      [s.label],
    ]),
  ),
};

/** Legacy → new segment map. Used for one-off redirects if needed. */
export const LEGACY_SEGMENT_REDIRECTS: Record<string, string> = {
  admin: "sales",
  seo: "marketing",
  brandconfig: "brand",
  backend: "system",
  settings: "settings-ai",
  corporate: "team",
};
