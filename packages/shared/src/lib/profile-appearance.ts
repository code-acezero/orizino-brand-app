// Catalog of 10 typography pairs and 10 layout variants for Profile + Settings.

export type ProfileTypographyPair = {
  id: string;
  label: string;
  heading: string;
  body: string;
  // Google Fonts CSS2 URL fragment, e.g. "Instrument+Serif:wght@400&family=Work+Sans:wght@400;500;600;700"
  gfUrl: string;
};

export const PROFILE_TYPOGRAPHY_PAIRS: ProfileTypographyPair[] = [
  { id: "instrument-serif-work-sans", label: "Instrument Serif + Work Sans",
    heading: '"Instrument Serif", ui-serif, Georgia, serif',
    body: '"Work Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700" },
  { id: "cormorant-karla", label: "Cormorant + Karla",
    heading: '"Cormorant Garamond", ui-serif, Georgia, serif',
    body: '"Karla", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Cormorant+Garamond:wght@400;500;600;700&family=Karla:wght@400;500;600;700" },
  { id: "syne-plus-jakarta", label: "Syne + Plus Jakarta",
    heading: '"Syne", ui-sans-serif, system-ui, sans-serif',
    body: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Syne:wght@500;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700" },
  { id: "outfit-figtree", label: "Outfit + Figtree",
    heading: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    body: '"Figtree", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Outfit:wght@400;500;600;700;800&family=Figtree:wght@400;500;600;700" },
  { id: "space-grotesk-dm-sans", label: "Space Grotesk + DM Sans",
    heading: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    body: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700" },
  { id: "sora-manrope", label: "Sora + Manrope",
    heading: '"Sora", ui-sans-serif, system-ui, sans-serif',
    body: '"Manrope", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Sora:wght@500;600;700;800&family=Manrope:wght@400;500;600;700" },
  { id: "urbanist-epilogue", label: "Urbanist + Epilogue",
    heading: '"Urbanist", ui-sans-serif, system-ui, sans-serif',
    body: '"Epilogue", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Urbanist:wght@500;600;700;800&family=Epilogue:wght@400;500;600;700" },
  { id: "dm-serif-display-fira-sans", label: "DM Serif Display + Fira Sans",
    heading: '"DM Serif Display", ui-serif, Georgia, serif',
    body: '"Fira Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "DM+Serif+Display&family=Fira+Sans:wght@400;500;600;700" },
  { id: "libre-baskerville-ibm-plex", label: "Libre Baskerville + IBM Plex Sans",
    heading: '"Libre Baskerville", ui-serif, Georgia, serif',
    body: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Libre+Baskerville:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700" },
  { id: "lora-nunito-sans", label: "Lora + Nunito Sans",
    heading: '"Lora", ui-serif, Georgia, serif',
    body: '"Nunito Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Lora:wght@500;600;700&family=Nunito+Sans:wght@400;500;600;700" },
];

export type ProfileLayoutVariant = {
  id: string;
  label: string;
  description: string;
};

export const PROFILE_LAYOUT_VARIANTS: ProfileLayoutVariant[] = [
  { id: "hero-grid", label: "Hero Grid", description: "Editorial hero with glass cards (default)" },
  { id: "magazine", label: "Magazine", description: "Oversized serif header, narrow column" },
  { id: "bento-grid", label: "Bento", description: "Asymmetric rounded tiles" },
  { id: "asymmetric", label: "Asymmetric", description: "60/40 split, sticky side panel" },
  { id: "sidebar", label: "Sidebar", description: "Persistent left navigation" },
  { id: "split-screen", label: "Split Screen", description: "50/50 hero with vivid cover" },
  { id: "single-column", label: "Single Column", description: "Narrow centered stack" },
  { id: "minimal", label: "Minimal", description: "Flat, no glass, generous whitespace" },
  { id: "card-grid", label: "Card Grid", description: "Uniform tile grid" },
  { id: "editorial", label: "Editorial", description: "Display-scale headings, refined spacing" },
];

export type ProfileDensity = "compact" | "comfortable" | "spacious";
export type ProfileMobileNav = "tabs" | "segmented" | "sheet" | "pill";

export interface ProfileAppearanceConfig {
  typography_pair: string;
  layout_variant: string;
  accent_hsl?: string | null; // e.g. "262 83% 58%"
  density?: ProfileDensity;
  mobile_nav?: ProfileMobileNav;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const ACCENT_PRESETS: { id: string; label: string; hsl: string }[] = [
  { id: "default", label: "Brand default", hsl: "" },
  { id: "indigo", label: "Indigo", hsl: "243 75% 59%" },
  { id: "violet", label: "Violet", hsl: "262 83% 58%" },
  { id: "rose", label: "Rose", hsl: "346 77% 60%" },
  { id: "emerald", label: "Emerald", hsl: "160 64% 43%" },
  { id: "amber", label: "Amber", hsl: "38 92% 50%" },
  { id: "sky", label: "Sky", hsl: "199 89% 52%" },
  { id: "slate", label: "Slate", hsl: "215 25% 35%" },
];

export const defaultProfileAppearance: ProfileAppearanceConfig = {
  typography_pair: "instrument-serif-work-sans",
  layout_variant: "hero-grid",
  accent_hsl: null,
  density: "comfortable",
  mobile_nav: "tabs",
  rounded: "2xl",
};

export function getTypographyPair(id: string | undefined): ProfileTypographyPair {
  return PROFILE_TYPOGRAPHY_PAIRS.find((p) => p.id === id) ?? PROFILE_TYPOGRAPHY_PAIRS[0];
}

export function getLayoutVariant(id: string | undefined): ProfileLayoutVariant {
  return PROFILE_LAYOUT_VARIANTS.find((l) => l.id === id) ?? PROFILE_LAYOUT_VARIANTS[0];
}
// code:4ce0
