import React from "react";
import { cn } from "../lib/utils";

export type LogoFilter =
  | "none"
  | "white"
  | "black"
  | "invert"
  | "accent"
  | "custom";

export const LOGO_FILTERS: { id: LogoFilter; label: string; hint: string }[] = [
  { id: "none", label: "Original", hint: "Auto B/W for solid logos, else keep source" },
  { id: "white", label: "Force White", hint: "Black → white" },
  { id: "black", label: "Force Black", hint: "White → black" },
  { id: "invert", label: "Invert", hint: "Swap colors" },
  { id: "accent", label: "Accent Tint", hint: "Tracks theme primary" },
  { id: "custom", label: "Custom Color", hint: "Pick any color" },
];

/** Apply a color treatment to a raster/SVG logo without altering the accent. */
export function getLogoImageStyle(
  filter: LogoFilter,
  src?: string,
  customColor?: string
): { isMask: boolean; style: React.CSSProperties } {
  switch (filter) {
    case "white":
      return { isMask: false, style: { filter: "brightness(0) invert(1)" } };
    case "black":
      return { isMask: false, style: { filter: "brightness(0)" } };
    case "invert":
      return { isMask: false, style: { filter: "invert(1) hue-rotate(180deg)" } };
    case "accent":
      if (!src) return { isMask: false, style: {} };
      return {
        isMask: true,
        style: {
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          backgroundColor: "hsl(var(--primary))",
        } as React.CSSProperties,
      };
    case "custom":
      if (!src) return { isMask: false, style: {} };
      return {
        isMask: true,
        style: {
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          backgroundColor: customColor || "#ffffff",
        } as React.CSSProperties,
      };
    default:
      return { isMask: false, style: {} };
  }
}

/**
 * Detect whether an image is essentially "solid black" or "solid white" —
 * a monochrome silhouette where every visible pixel is near-black or
 * near-white and desaturated. Returns "black" | "white" | null.
 */
function detectMonoTone(url: string): Promise<"black" | "white" | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onerror = () => resolve(null);
      img.onload = () => {
        try {
          const size = 32;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, size, size);
          const { data } = ctx.getImageData(0, 0, size, size);
          let visible = 0;
          let black = 0;
          let white = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a < 24) continue; // fully/near transparent
            visible++;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const chroma = max - min;
            // Skip clearly colored pixels
            if (chroma > 24) continue;
            if (max <= 40) black++;
            else if (min >= 215) white++;
          }
          if (visible < 20) return resolve(null);
          const blackRatio = black / visible;
          const whiteRatio = white / visible;
          // Require the mono pixels to dominate the visible area, with
          // very little colored content, to avoid mis-tagging colored logos.
          if (blackRatio >= 0.9) return resolve("black");
          if (whiteRatio >= 0.9) return resolve("white");
          return resolve(null);
        } catch {
          resolve(null);
        }
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/** Hook: detect solid B/W in an image and expose the auto filter for the current theme. */
export function useAutoMonoFilter(src?: string): LogoFilter | null {
  const [tone, setTone] = React.useState<"black" | "white" | null>(null);
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });

  React.useEffect(() => {
    setTone(null);
    if (!src) return;
    let cancelled = false;
    detectMonoTone(src).then((t) => {
      if (!cancelled) setTone(t);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const update = () => setIsDark(!el.classList.contains("light"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  if (!tone) return null;
  // Solid B/W silhouette: contrast against the current theme surface.
  return isDark ? "white" : "black";
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
  // When user chose "Original", auto-adjust solid black/white logos to
  // contrast against the current theme mode. Colored logos are untouched.
  const autoFilter = useAutoMonoFilter(filter === "none" ? src : undefined);
  const effective: LogoFilter = filter === "none" && autoFilter ? autoFilter : filter;

  if (!src) return <>{fallback}</>;
  const { isMask, style } = getLogoImageStyle(effective, src, customColor);
  const merged = { ...style, ...extraStyle };
  if (isMask) {
    return <div role="img" aria-label={alt} className={cn(className)} style={merged} />;
  }
  return <img src={src} alt={alt} className={cn("object-contain", className)} style={merged} />;
};
// code:4ce0
