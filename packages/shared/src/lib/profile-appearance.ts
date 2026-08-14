// Catalog of 10 typography pairs and 10 layout variants for Profile + Settings.

export type TypographyCategory = "all" | "editorial" | "classic" | "creative" | "minimal" | "geometric";

export type ProfileTypographyPair = {
  id: string;
  label: string;
  category: "editorial" | "classic" | "creative" | "minimal" | "geometric";
  tag: string;
  heading: string;
  body: string;
  // Google Fonts CSS2 URL fragment
  gfUrl: string;
  description?: string;
};

export const PROFILE_TYPOGRAPHY_PAIRS: ProfileTypographyPair[] = [
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
