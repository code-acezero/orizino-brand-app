import { useState, useEffect } from "react";

export interface DominantColor {
  r: number;
  g: number;
  b: number;
  rgb: string;
  rgba: (alpha: number) => string;
}

const colorCache = new Map<string, { r: number; g: number; b: number }>();

export function useImageDominantColor(imageUrl?: string): DominantColor {
  const [color, setColor] = useState<{ r: number; g: number; b: number }>({
    r: 99,
    g: 102,
    b: 241, // Default primary accent (indigo/violet tone)
  });

  useEffect(() => {
    if (!imageUrl) return;

    if (colorCache.has(imageUrl)) {
      setColor(colorCache.get(imageUrl)!);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        // Downscale to 16x16 thumbnail for instantaneous (<1ms) sampling
        canvas.width = 16;
        canvas.height = 16;
        ctx.drawImage(img, 0, 0, 16, 16);

        const imageData = ctx.getImageData(0, 0, 16, 16).data;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let totalWeight = 0;

        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a > 120) {
            // Perceived luminance
            const lum = (r * 299 + g * 587 + b * 114) / 1000;
            // Filter out blown-out whites and pitch blacks to isolate garment pigments
            if (lum > 20 && lum < 235) {
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const sat = max === 0 ? 0 : (max - min) / max;
              const weight = 1 + sat * 3; // Heavily favor vibrant/chromatic tones

              rSum += r * weight;
              gSum += g * weight;
              bSum += b * weight;
              totalWeight += weight;
            }
          }
        }

        if (totalWeight > 0 && isMounted) {
          const result = {
            r: Math.round(rSum / totalWeight),
            g: Math.round(gSum / totalWeight),
            b: Math.round(bSum / totalWeight),
          };
          colorCache.set(imageUrl, result);
          setColor(result);
        }
      } catch {
        // Fallback silently if canvas is tainted by CORS
      }
    };

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  return {
    r: color.r,
    g: color.g,
    b: color.b,
    rgb: `rgb(${color.r}, ${color.g}, ${color.b})`,
    rgba: (alpha: number) => `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`,
  };
}
