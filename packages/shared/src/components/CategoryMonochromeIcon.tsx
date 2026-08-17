"use client";

import React from "react";
import {
  Shirt,
  Flame,
  Sparkles,
  Tag,
  Tags,
  Gem,
  Crown,
  ShoppingBag,
  Backpack,
  Glasses,
  Footprints,
  Watch,
  Scissors,
  Shield,
  Zap,
  Heart,
  Star,
  Gift,
  Sun,
  CloudSnow,
  Compass,
  Globe,
  Palette,
  Package,
  Feather,
  Briefcase,
  Umbrella,
  Layers,
  FolderTree,
  SlidersHorizontal,
  BadgePercent,
  type LucideIcon,
} from "lucide-react";

/* ── Custom Sleek Fashion Vectors (Pants, Cap, Hoodie, Hanger, Sneaker) ── */
export const PantsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M4 4h16l-1 16h-4.5l-2.5-9-2.5 9H5L4 4z" />
    <path d="M12 4v4" />
    <path d="M4 8h16" />
  </svg>
);

export const CapIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 15c0-4.5 4-8 9-8s9 3.5 9 8H3z" />
    <path d="M3 15h13c3 0 5 1.5 5 3H7c-2.5 0-4-1.5-4-3z" />
    <circle cx="12" cy="7" r="1" fill="currentColor" />
  </svg>
);

export const HoodieIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M7 4a5 5 0 0 1 10 0v2l3 3-2 3-2-1v9H8v-9l-2 1-2-3 3-3V4z" />
    <path d="M10 10l2 2 2-2" />
    <path d="M12 12v4" />
  </svg>
);

export const HangerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 3a2.5 2.5 0 0 1 2.5 2.5c0 1.5-1.5 2.5-2.5 3.5L2 15h20L12 9" />
    <path d="M2 15v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const SneakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 17h18a1 1 0 0 0 1-1c0-2-1-3-3-4l-5-2-3-5H7L5 9l-3 4v3a1 1 0 0 0 1 1z" />
    <path d="M7 9l4 2" />
    <path d="M2 17v2a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2" />
  </svg>
);

export interface MonochromePreset {
  id: string;
  label: string;
  group: "Apparel" | "Accessories" | "Trending & Promo" | "Lifestyle & Seasons";
  component: React.ComponentType<any>;
  aliases?: string[];
}

export const MONOCHROME_CATEGORY_PRESETS: MonochromePreset[] = [
  // Apparel
  { id: "shirt", label: "T-Shirt", group: "Apparel", component: Shirt, aliases: ["👕", "tshirt", "tee", "top"] },
  { id: "hoodie", label: "Hoodie & Outerwear", group: "Apparel", component: HoodieIcon, aliases: ["🧥", "sweater", "jacket", "outerwear"] },
  { id: "pants", label: "Pants & Bottoms", group: "Apparel", component: PantsIcon, aliases: ["👖", "🩳", "jeans", "bottoms", "shorts"] },
  { id: "layers", label: "Layers & Knitwear", group: "Apparel", component: Layers, aliases: ["👘", "knitwear", "cardigan"] },
  { id: "hanger", label: "Wardrobe & Outfits", group: "Apparel", component: HangerIcon, aliases: ["closet", "outfits", "wardrobe"] },

  // Accessories & Footwear
  { id: "sneaker", label: "Sneakers & Kicks", group: "Accessories", component: SneakerIcon, aliases: ["👟", "shoes", "kicks", "footwear"] },
  { id: "cap", label: "Caps & Headwear", group: "Accessories", component: CapIcon, aliases: ["🧢", "hat", "beanie"] },
  { id: "glasses", label: "Eyewear & Shades", group: "Accessories", component: Glasses, aliases: ["🕶️", "🕶", "sunglasses", "spectacles"] },
  { id: "bag", label: "Bags & Totes", group: "Accessories", component: ShoppingBag, aliases: ["handbag", "purse", "tote"] },
  { id: "backpack", label: "Backpacks", group: "Accessories", component: Backpack, aliases: ["🎒", "rucksack", "travel-bag"] },
  { id: "watch", label: "Watches & Jewelry", group: "Accessories", component: Watch, aliases: ["timepiece", "accessories"] },
  { id: "gem", label: "Jewelry & Luxury", group: "Accessories", component: Gem, aliases: ["💎", "diamond", "gold", "silver"] },
  { id: "scissors", label: "Tailored & Bespoke", group: "Accessories", component: Scissors, aliases: ["custom", "denim", "crafted"] },

  // Trending & Drops
  { id: "flame", label: "Hot & Streetwear", group: "Trending & Promo", component: Flame, aliases: ["🔥", "trending", "hype", "fire"] },
  { id: "sparkles", label: "New Drops & Fresh", group: "Trending & Promo", component: Sparkles, aliases: ["✨", "new", "fresh", "featured"] },
  { id: "zap", label: "Flash Drops", group: "Trending & Promo", component: Zap, aliases: ["⚡", "flash", "electric", "instant"] },
  { id: "crown", label: "VIP & Exclusives", group: "Trending & Promo", component: Crown, aliases: ["premium", "royal", "exclusive"] },
  { id: "tag", label: "Discounts & Offers", group: "Trending & Promo", component: Tag, aliases: ["🏷️", "🏷", "sale", "discount", "promo"] },
  { id: "tags", label: "Multi-Deals", group: "Trending & Promo", component: Tags, aliases: ["deals", "bundle"] },
  { id: "percent", label: "Clearance & % Off", group: "Trending & Promo", component: BadgePercent, aliases: ["clearance", "markdown"] },
  { id: "gift", label: "Gift Sets & Bundles", group: "Trending & Promo", component: Gift, aliases: ["🎁", "gifts", "combo"] },
  { id: "star", label: "Top Rated", group: "Trending & Promo", component: Star, aliases: ["best", "popular", "favorites"] },
  { id: "heart", label: "Essentials & Loved", group: "Trending & Promo", component: Heart, aliases: ["loved", "must-have", "core"] },

  // Lifestyle & Seasons
  { id: "sun", label: "Summer & Beach", group: "Lifestyle & Seasons", component: Sun, aliases: ["summer", "resort", "warm"] },
  { id: "snow", label: "Winter & Cold", group: "Lifestyle & Seasons", component: CloudSnow, aliases: ["winter", "cold", "snow"] },
  { id: "compass", label: "Urban & Outdoor", group: "Lifestyle & Seasons", component: Compass, aliases: ["explore", "adventure", "utility"] },
  { id: "globe", label: "Global Street Style", group: "Lifestyle & Seasons", component: Globe, aliases: ["🎌", "worldwide", "international"] },
  { id: "palette", label: "Art & Collabs", group: "Lifestyle & Seasons", component: Palette, aliases: ["collab", "artist", "graphic"] },
  { id: "box", label: "Box Sets & Packages", group: "Lifestyle & Seasons", component: Package, aliases: ["packaging", "set"] },
  { id: "feather", label: "Lightweight & Athletic", group: "Lifestyle & Seasons", component: Feather, aliases: ["gym", "activewear", "light"] },
  { id: "briefcase", label: "Formal & Workwear", group: "Lifestyle & Seasons", component: Briefcase, aliases: ["office", "formal", "suit"] },
  { id: "umbrella", label: "All-Weather & Rain", group: "Lifestyle & Seasons", component: Umbrella, aliases: ["monsoon", "weatherproof"] },
];

/** Fast lookup map by ID and aliases */
const ICON_MAP = new Map<string, React.ComponentType<any>>();
MONOCHROME_CATEGORY_PRESETS.forEach((preset) => {
  ICON_MAP.set(preset.id.toLowerCase(), preset.component);
  preset.aliases?.forEach((alias) => {
    ICON_MAP.set(alias.toLowerCase(), preset.component);
  });
});

export interface CategoryMonochromeIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon?: string | null;
  iconUrl?: string | null;
  icon_url?: string | null;
  className?: string;
  fallbackIcon?: React.ReactNode;
  sizeClass?: string;
  monochromeImage?: boolean;
}

/**
 * Universal Monochrome Category Icon
 * - Renders crisp vector SVG in Pure Black in Light Mode / Pure White in Dark Mode (currentColor).
 * - Matches preset IDs, legacy emojis, or custom icon names.
 * - Handles uploaded icon_url with automatic light/dark monochrome filtering.
 */
export const CategoryMonochromeIcon: React.FC<CategoryMonochromeIconProps> = ({
  icon,
  iconUrl,
  icon_url,
  className = "w-4 h-4",
  fallbackIcon,
  sizeClass,
  monochromeImage = true,
  ...props
}) => {
  const finalClass = sizeClass || className;
  const targetUrl = iconUrl || icon_url;

  // 1. If custom uploaded image URL provided, render faithfully
  if (targetUrl) {
    return (
      <span className={`inline-flex items-center justify-center shrink-0 overflow-hidden ${finalClass}`} {...props}>
        <img
          src={targetUrl}
          alt=""
          className="w-full h-full object-contain"
        />
      </span>
    );
  }

  // 2. If icon identifier or emoji provided
  if (icon) {
    const cleanKey = icon.trim().toLowerCase();
    const MatchedComponent = ICON_MAP.get(cleanKey);

    if (MatchedComponent) {
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 text-foreground text-black dark:text-white transition-colors ${finalClass}`}
          {...props}
        >
          <MatchedComponent className="w-full h-full stroke-[1.8]" />
        </span>
      );
    }

    // Check if it's an unmapped emoji / string (render with monochrome brightness filter)
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 text-xs grayscale contrast-200 dark:invert ${finalClass}`}
        {...props}
      >
        {icon}
      </span>
    );
  }

  // 3. Fallback
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 text-muted-foreground opacity-60 ${finalClass}`}
      {...props}
    >
      {fallbackIcon || <FolderTree className="w-full h-full stroke-[1.8]" />}
    </span>
  );
};

export default CategoryMonochromeIcon;
