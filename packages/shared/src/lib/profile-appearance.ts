// Catalog of typography pairs and layout variants for Storefront and Profile.

export type TypographyCategory = "all" | "custom" | "editorial" | "classic" | "creative" | "minimal" | "geometric";

export type ProfileTypographyPair = {
  id: string;
  label: string;
  category: "custom" | "editorial" | "classic" | "creative" | "minimal" | "geometric";
  tag: string;
  heading: string;
  body: string;
  /** Google Fonts CSS2 URL fragment; empty string for bundled custom fonts */
  gfUrl: string;
  description?: string;
};

export const PROFILE_TYPOGRAPHY_PAIRS: ProfileTypographyPair[] = [
  // ── CUSTOM BRAND LOCAL FONTS ──
  {
    id: "orangeavenue-inter",
    label: "OrangeAvenue + Inter",
    category: "custom",
    tag: "Brand Core",
    heading: '"OrangeAvenue", sans-serif',
    body: '"Inter", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Inter:wght@300;400;500;600;700",
    description: "Signature ORIZINO custom display font with razor-sharp neutral body",
  },
  {
    id: "nevera-outfit",
    label: "Nevera + Outfit",
    category: "custom",
    tag: "Brand Custom",
    heading: '"Nevera", sans-serif',
    body: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Outfit:wght@300;400;500;600;700",
    description: "Futuristic luxury geometric display font with smooth rounded body",
  },
  {
    id: "bilderberg-dmsans",
    label: "Bilderberg + DM Sans",
    category: "custom",
    tag: "Brand Custom",
    heading: '"Bilderberg", sans-serif',
    body: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "DM+Sans:wght@400;500;600;700",
    description: "High-contrast architectural serif display font with humanist sans",
  },
  {
    id: "agraham-worksans",
    label: "Agraham + Work Sans",
    category: "custom",
    tag: "Brand Custom",
    heading: '"Agraham", sans-serif',
    body: '"Work Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Work+Sans:wght@400;500;600;700",
    description: "Artistic luxury headline font with clean modernist body typography",
  },
  {
    id: "primor-plusjakarta",
    label: "PrimorStylish + Plus Jakarta",
    category: "custom",
    tag: "Brand Custom",
    heading: '"PrimorStylish", sans-serif',
    body: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Plus+Jakarta+Sans:wght@400;500;600;700",
    description: "Haute couture display serif with tech-forward digital sans",
  },
  {
    id: "prodes-spacegrotesk",
    label: "ProdesStencil + Space Grotesk",
    category: "custom",
    tag: "Brand Custom",
    heading: '"ProdesStencil", sans-serif',
    body: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Space+Grotesk:wght@400;500;600;700",
    description: "Architectural modern stencil with engineered geometric proportions",
  },
  {
    id: "rostex-sora",
    label: "Rostex + Sora",
    category: "custom",
    tag: "Brand Custom",
    heading: '"Rostex", sans-serif',
    body: '"Sora", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Sora:wght@400;500;600;700",
    description: "Bold futuristic street-luxury letterforms with crisp display sans",
  },
  {
    id: "transcity-manrope",
    label: "Transcity + Manrope",
    category: "custom",
    tag: "Brand Custom",
    heading: '"Transcity", sans-serif',
    body: '"Manrope", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Manrope:wght@400;500;600;700",
    description: "Metropolitan condensed display paired with semi-geometric body",
  },
  {
    id: "zaslia-karla",
    label: "Zaslia + Karla",
    category: "custom",
    tag: "Brand Custom",
    heading: '"Zaslia", sans-serif',
    body: '"Karla", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Karla:wght@400;500;600;700",
    description: "Avant-garde stylized headline font with warm humanist body",
  },
  {
    id: "goca-urbanist",
    label: "Goca + Urbanist",
    category: "custom",
    tag: "Brand Custom",
    heading: '"Goca", sans-serif',
    body: '"Urbanist", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Urbanist:wght@400;500;600;700",
    description: "Heavy block modernist display font with Scandinavian clean sans",
  },
  {
    id: "logofontik-figtree",
    label: "Logofontik + Figtree",
    category: "custom",
    tag: "Brand Custom",
    heading: '"Logofontik", sans-serif',
    body: '"Figtree", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Figtree:wght@400;500;600;700",
    description: "High-fashion emblem font paired with friendly contemporary sans",
  },

  // ── GOOGLE FONTS LUXURY CATALOG ──
  {
    id: "instrument-serif-work-sans",
    label: "Instrument Serif + Work Sans",
    category: "editorial",
    tag: "Modern Luxury",
    heading: '"Instrument Serif", ui-serif, Georgia, serif',
    body: '"Work Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700",
    description: "High-end bespoke editorial with ultra-clean modernist body text",
  },
  {
    id: "cormorant-karla",
    label: "Cormorant Garamond + Karla",
    category: "classic",
    tag: "Haute Couture",
    heading: '"Cormorant Garamond", ui-serif, Georgia, serif',
    body: '"Karla", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Karla:wght@400;500;600;700",
    description: "Parisian luxury aesthetic with delicate serifs and warm geometric sans",
  },
  {
    id: "playfair-inter",
    label: "Playfair Display + Inter",
    category: "classic",
    tag: "Vogue Classic",
    heading: '"Playfair Display", ui-serif, Georgia, serif',
    body: '"Inter", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Inter:wght@300;400;500;600;700",
    description: "High-contrast fashion masthead paired with razor-sharp neutral body",
  },
  {
    id: "cinzel-montserrat",
    label: "Cinzel + Montserrat",
    category: "classic",
    tag: "Neo-Classical",
    heading: '"Cinzel", ui-serif, Georgia, serif',
    body: '"Montserrat", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Cinzel:wght@400;600;700;800&family=Montserrat:wght@300;400;500;600;700",
    description: "Architectural Roman proportions inspired by classic stone engraving",
  },
  {
    id: "bodoni-outfit",
    label: "Bodoni Moda + Outfit",
    category: "editorial",
    tag: "High Glamour",
    heading: '"Bodoni Moda", ui-serif, Georgia, serif',
    body: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,600;0,6..96,700;1,6..96,400&family=Outfit:wght@300;400;500;600;700",
    description: "Dramatic extreme thick/thin contrast with futuristic rounded geometric body",
  },
  {
    id: "syne-plus-jakarta",
    label: "Syne + Plus Jakarta",
    category: "creative",
    tag: "Avant-Garde",
    heading: '"Syne", ui-sans-serif, system-ui, sans-serif',
    body: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Syne:wght@500;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700",
    description: "Ultra-expressive brutalist luxury with clean tech-forward body",
  },
  {
    id: "prata-dm-sans",
    label: "Prata + DM Sans",
    category: "editorial",
    tag: "Refined Editorial",
    heading: '"Prata", ui-serif, Georgia, serif',
    body: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Prata&family=DM+Sans:wght@400;500;600;700",
    description: "Elegant teardrop terminals and soft luxury serifs with clear humanist sans",
  },
  {
    id: "fraunces-newsreader",
    label: "Fraunces + Newsreader",
    category: "creative",
    tag: "Vintage Bespoke",
    heading: '"Fraunces", ui-serif, Georgia, serif',
    body: '"Newsreader", ui-serif, Georgia, serif',
    gfUrl: "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400",
    description: "Warm optical serif personality with literary book typesetting feel",
  },
  {
    id: "space-grotesk-dm-sans",
    label: "Space Grotesk + DM Sans",
    category: "creative",
    tag: "Technical Brutalism",
    heading: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    body: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700",
    description: "Engineered monospace-proportional blend for modern digital brands",
  },
  {
    id: "outfit-figtree",
    label: "Outfit + Figtree",
    category: "geometric",
    tag: "Contemporary Studio",
    heading: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    body: '"Figtree", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Outfit:wght@400;500;600;700;800&family=Figtree:wght@400;500;600;700",
    description: "Sleek geometric curves and modern digital brand clarity",
  },
  {
    id: "sora-manrope",
    label: "Sora + Manrope",
    category: "geometric",
    tag: "Neo-Grotesk",
    heading: '"Sora", ui-sans-serif, system-ui, sans-serif',
    body: '"Manrope", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Sora:wght@500;600;700;800&family=Manrope:wght@400;500;600;700",
    description: "Crisp futuristic display with semi-geometric structural text",
  },
  {
    id: "urbanist-epilogue",
    label: "Urbanist + Epilogue",
    category: "minimal",
    tag: "Nordic Minimal",
    heading: '"Urbanist", ui-sans-serif, system-ui, sans-serif',
    body: '"Epilogue", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Urbanist:wght@500;600;700;800&family=Epilogue:wght@400;500;600;700",
    description: "Neutral Scandinavian simplicity with refined typographic balance",
  },
  {
    id: "dm-serif-display-fira-sans",
    label: "DM Serif Display + Fira Sans",
    category: "editorial",
    tag: "Bold Impact",
    heading: '"DM Serif Display", ui-serif, Georgia, serif',
    body: '"Fira Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "DM+Serif+Display:ital@0;1&family=Fira+Sans:wght@400;500;600;700",
    description: "High-impact editorial weight with high-legibility German sans",
  },
  {
    id: "libre-baskerville-ibm-plex",
    label: "Libre Baskerville + IBM Plex Sans",
    category: "classic",
    tag: "Heritage Craft",
    heading: '"Libre Baskerville", ui-serif, Georgia, serif',
    body: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Sans:wght@400;500;600;700",
    description: "Timeless Anglo-American heritage serif with industrial precision sans",
  },
  {
    id: "lora-nunito-sans",
    label: "Lora + Nunito Sans",
    category: "minimal",
    tag: "Humanist Flow",
    heading: '"Lora", ui-serif, Georgia, serif',
    body: '"Nunito Sans", ui-sans-serif, system-ui, sans-serif',
    gfUrl: "Lora:ital,wght@0,500;0,600;0,700;1,400&family=Nunito+Sans:wght@400;500;600;700",
    description: "Contemporary brush-stroke serifs with rounded, highly readable body",
  },
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
  { id: "minimal-cards", label: "Minimal Cards", description: "Clean borderless grid" },
  { id: "split-screen", label: "Split Screen", description: "Avatar & summary left, forms right" },
  { id: "full-bleed", label: "Full Bleed", description: "Edge-to-edge layout, dark accent hero" },
  { id: "compact", label: "Compact List", description: "Dense row-based summary" },
  { id: "sidebar-nav", label: "Sidebar Nav", description: "Permanent vertical sub-navigation" },
  { id: "classic-tabs", label: "Classic Tabs", description: "Traditional horizontal tab bar" },
];

export type ProfileAccentPreset = {
  id: string;
  label: string;
  hsl: string;
};

export const ACCENT_PRESETS: ProfileAccentPreset[] = [
  { id: "brand", label: "Brand Default", hsl: "" },
  { id: "gold", label: "Gold", hsl: "43 85% 58%" },
  { id: "crimson", label: "Crimson", hsl: "0 84% 60%" },
  { id: "emerald", label: "Emerald", hsl: "152 69% 45%" },
  { id: "sapphire", label: "Sapphire", hsl: "217 91% 60%" },
  { id: "violet", label: "Violet", hsl: "263 70% 65%" },
  { id: "amber", label: "Amber", hsl: "38 92% 50%" },
  { id: "rose", label: "Rose", hsl: "343 87% 65%" },
  { id: "silver", label: "Silver", hsl: "220 14% 65%" },
  { id: "neon", label: "Neon Lime", hsl: "84 81% 44%" },
];

export interface ProfileAppearanceConfig {
  typography_pair: string;
  layout_variant: string;
  accent_hsl?: string | null;
  density?: "compact" | "comfortable" | "spacious";
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl";
  mobile_nav?: string;
}

export const defaultProfileAppearance: ProfileAppearanceConfig = {
  typography_pair: "orangeavenue-inter",
  layout_variant: "hero-grid",
  accent_hsl: null,
  density: "comfortable",
  rounded: "2xl",
};

export function getTypographyPair(id: string | undefined): ProfileTypographyPair {
  return PROFILE_TYPOGRAPHY_PAIRS.find((p) => p.id === id) ?? PROFILE_TYPOGRAPHY_PAIRS[0];
}

export function getProfileLayoutVariant(id: string | undefined): ProfileLayoutVariant {
  return PROFILE_LAYOUT_VARIANTS.find((l) => l.id === id) ?? PROFILE_LAYOUT_VARIANTS[0];
}
