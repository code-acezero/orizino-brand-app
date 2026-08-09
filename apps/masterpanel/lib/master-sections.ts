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
  /** Landing path (== `/${segment}`). Precomputed for convenience. */
  path: string;
}

export const MASTER_SECTIONS: readonly MasterSection[] = [
  { key: "sales",     segment: "sales",       label: "Sales & Operations",   path: "/sales" },
  { key: "seo",       segment: "marketing",     label: "Marketing Management", path: "/marketing" },
  { key: "email",     segment: "email",       label: "Email Marketing",      path: "/email" },
  { key: "affiliate", segment: "affiliate",   label: "Affiliate Program",    path: "/affiliate" },
  { key: "brand",     segment: "brand",       label: "Brand & Storefront",   path: "/brand" },
  { key: "system",    segment: "system",      label: "Backend & System",     path: "/system" },
  { key: "settings",  segment: "settings-ai", label: "Settings & AI",        path: "/settings-ai" },
  { key: "team",      segment: "team",        label: "Team & Access",        path: "/team" },
  { key: "master",    segment: "master",      label: "All Sections",         path: "/master" },
] as const;

/** Lookup by first URL segment (no leading slash). */
export const SECTION_BY_SEGMENT: Record<string, MasterSection> =
  Object.fromEntries(MASTER_SECTIONS.map((s) => [s.segment, s]));

/** Header label shown in the sidebar for a given URL segment. */
export const SECTION_LABELS: Record<string, string> = {
  "": "Admin Management",
  ...Object.fromEntries(MASTER_SECTIONS.map((s) => [s.segment, s.label])),
};

/** Every section landing path — used by the sidebar to require exact match. */
export const SECTION_LANDING_PATHS: ReadonlySet<string> = new Set(
  MASTER_SECTIONS.map((s) => s.path),
);

/**
 * Which admin-nav.ts group labels are visible on each URL segment.
 * Every screen shows the "Overview" group (Dashboard) plus its own group.
 * On /master, every group is shown.
 */
const ALL_NAV_LABELS = [
  "Overview",
  ...MASTER_SECTIONS.filter((s) => s.key !== "master").map((s) => s.label),
];

export const SEGMENT_TO_NAV_LABELS: Record<string, string[]> = {
  "": ["Overview"], // master panel home — only back-link
  master: ALL_NAV_LABELS,
  ...Object.fromEntries(
    MASTER_SECTIONS.filter((s) => s.key !== "master").map((s) => [
      s.segment,
      ["Overview", s.label],
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
