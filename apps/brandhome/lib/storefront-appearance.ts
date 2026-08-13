// Storefront appearance: 10 typography pairs + 10 layout variants, admin-switchable.
// Re-uses the same Google Fonts catalog as profile-appearance for consistency.

import {
  PROFILE_TYPOGRAPHY_PAIRS,
  ACCENT_PRESETS as PROFILE_ACCENT_PRESETS,
  type ProfileTypographyPair,
} from "./profile-appearance";

export const STOREFRONT_TYPOGRAPHY_PAIRS: ProfileTypographyPair[] = PROFILE_TYPOGRAPHY_PAIRS;
export const STOREFRONT_ACCENT_PRESETS = PROFILE_ACCENT_PRESETS;

export type StorefrontLayoutVariant = {
  id: string;
  label: string;
  description: string;
};

export const STOREFRONT_LAYOUT_VARIANTS: StorefrontLayoutVariant[] = [
  { id: "hero-grid", label: "Hero Grid", description: "Editorial hero + product grid (default)" },
  { id: "magazine", label: "Magazine", description: "Oversized serif hero, narrow column flow" },
  { id: "bento", label: "Bento", description: "Asymmetric rounded tiles, mixed sizes" },
  { id: "split-screen", label: "Split Screen", description: "50/50 hero with vivid cover image" },
  { id: "full-bleed", label: "Full Bleed", description: "Edge-to-edge sections, parallax accents" },
  { id: "minimal", label: "Minimal", description: "Flat surfaces, generous whitespace" },
  { id: "editorial", label: "Editorial", description: "Display-scale headings, magazine spacing" },
  { id: "compact-grid", label: "Compact Grid", description: "Dense product tiles, fast scanning" },
  { id: "boutique", label: "Boutique", description: "Centered narrow stack, luxury feel" },
  { id: "showcase", label: "Showcase", description: "Featured carousel + secondary rail" },
];

export type StorefrontDensity = "compact" | "comfortable" | "spacious";
export type StorefrontMobileNav = "tabs" | "segmented" | "pill" | "sheet";

export interface StorefrontAppearanceConfig {
  typography_pair: string;
  layout_variant: string;
  accent_hsl?: string | null;
  density?: StorefrontDensity;
  mobile_nav?: StorefrontMobileNav;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const defaultStorefrontAppearance: StorefrontAppearanceConfig = {
  typography_pair: "instrument-serif-work-sans",
  layout_variant: "hero-grid",
  accent_hsl: null,
  density: "comfortable",
  mobile_nav: "tabs",
  rounded: "2xl",
};

export function getStorefrontTypographyPair(id: string | undefined): ProfileTypographyPair {
  return STOREFRONT_TYPOGRAPHY_PAIRS.find((p) => p.id === id) ?? STOREFRONT_TYPOGRAPHY_PAIRS[0];
}

export function getStorefrontLayoutVariant(id: string | undefined): StorefrontLayoutVariant {
  return STOREFRONT_LAYOUT_VARIANTS.find((l) => l.id === id) ?? STOREFRONT_LAYOUT_VARIANTS[0];
}
