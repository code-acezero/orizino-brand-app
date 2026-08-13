import React from "react";
import { cn } from "../lib/utils";

export type LogoFilter =
  | "none"
  | "white"
  | "black"
  | "invert"
  | "accent"
  | "foreground"
  | "custom";

export const LOGO_FILTERS: { id: LogoFilter; label: string; hint: string }[] = [
  { id: "none", label: "Original / Auto", hint: "Cream Vanilla in Dark Mode & Midnight Charcoal in Light Mode" },
  { id: "foreground", label: "Theme Contrast", hint: "Cream Vanilla (Dark) / Midnight Charcoal (Light)" },
  { id: "white", label: "Force White", hint: "Force white monochrome fill" },
  { id: "black", label: "Force Black", hint: "Force black monochrome fill" },
  { id: "invert", label: "Invert", hint: "Swap colors" },
  { id: "accent", label: "Accent Tint", hint: "Tracks theme primary color" },
  { id: "custom", label: "Custom Color", hint: "Pick any custom color" },
];

/** Apply a color treatment to a raster/SVG logo. */
export function getLogoImageStyle(
  filter: LogoFilter,
  src?: string,
  customColor?: string
): { isMask: boolean; style: React.CSSProperties } {
  if (!src) return { isMask: false, style: {} };

  const maskStyle = (color: string): { isMask: boolean; style: React.CSSProperties } => ({
    isMask: true,
    style: {
      WebkitMaskImage: `url("${src}")`,
      maskImage: `url("${src}")`,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
      backgroundColor: color,
    } as React.CSSProperties,
  });

  switch (filter) {
    case "white":
      return maskStyle("#ffffff");
    case "black":
      return maskStyle("#000000");
    case "invert":
      return { isMask: false, style: { filter: "invert(1) hue-rotate(180deg)" } };
    case "accent":
      return maskStyle("hsl(var(--primary))");
    case "custom":
      return maskStyle(customColor || "hsl(var(--foreground))");
    case "foreground":
    case "none":
    default:
      // Default: Mask with hsl(var(--foreground)) => Cream Vanilla in Dark Mode & Midnight Charcoal in Light Mode!
      return maskStyle("hsl(var(--foreground))");
  }
}

/** Hook: detect solid B/W in an image and expose the auto filter for the current theme. */
export function useAutoMonoFilter(src?: string): LogoFilter | null {
  return "foreground";
}

export interface BrandImageProps {
  src?: string;
  alt?: string;
  filter?: LogoFilter;
  customColor?: string;
  className?: string;
  fallback?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Renders a brand logo/icon and respects the chosen color filter. */
export const BrandImage: React.FC<BrandImageProps> = ({
  src,
  alt = "",
  filter = "none",
  customColor,
  className,
  fallback,
  style: extraStyle,
}) => {
  if (!src) return <>{fallback}</>;
  // Force "none" / default filter to use theme contrast (Cream Vanilla in Dark Mode & Midnight Charcoal in Light Mode)
  const effective: LogoFilter = filter === "none" ? "foreground" : filter;
  const { isMask, style } = getLogoImageStyle(effective, src, customColor);
  const merged = { ...style, ...extraStyle };

  if (isMask) {
    return <div role="img" aria-label={alt} className={cn("inline-block shrink-0", className)} style={merged} />;
  }
  return <img src={src} alt={alt} className={cn("object-contain shrink-0", className)} style={merged} />;
};
