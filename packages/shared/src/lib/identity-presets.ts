// 10 layout presets for public employee identity pages.
// Layouts are CSS-driven via `[data-identity-layout="..."]` selectors —
// see apps/company/src/styles/identity-layouts.css.
export interface IdentityLayoutPreset {
  id: string;
  name: string;
  description: string;
}

export const IDENTITY_LAYOUT_PRESETS: IdentityLayoutPreset[] = [
  { id: "classic",      name: "Classic",       description: "Cover hero with rounded avatar card — safe default." },
  { id: "minimal",      name: "Minimal",       description: "No cover, quiet typography, plenty of whitespace." },
  { id: "editorial",    name: "Editorial",     description: "Oversized serif headline, magazine layout." },
  { id: "business",     name: "Business Card", description: "Landscape ID-card centred on the page." },
  { id: "gradient",     name: "Gradient",      description: "Full-bleed accent gradient behind the profile." },
  { id: "polaroid",     name: "Polaroid",      description: "Photo-first with a slight tilt and paper feel." },
  { id: "terminal",     name: "Terminal",      description: "Monospaced, dark, developer aesthetic." },
  { id: "brutalist",    name: "Brutalist",     description: "Hard borders, oversized labels, no shadows." },
  { id: "neon",         name: "Neon",          description: "Glow rings and vivid accent highlights." },
  { id: "mono",         name: "Mono",          description: "Grayscale card with a single accent." },
];

// Theme preset id used when the profile should follow the brand site theme
// currently applied by SiteThemeProvider (no per-profile override).
export const IDENTITY_THEME_SYSTEM = "system";
// Theme preset id used to skip any palette scoping (raw dark canvas).
export const IDENTITY_THEME_BRAND_DARK = "brand_dark";
