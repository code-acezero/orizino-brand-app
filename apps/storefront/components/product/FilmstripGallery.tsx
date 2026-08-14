"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ProductLightboxModal from "./ProductLightboxModal";

import { useImageDominantColor } from "@/hooks/use-image-dominant-color";

interface FilmstripGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const FilmstripGallery: React.FC<FilmstripGalleryProps> = ({
  images,
  productName,
  discount = 0,
}) => {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const activeImage = images[active] || images[0] || "";
  const dominantColor = useImageDominantColor(activeImage);

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + images.length) % images.length),
    [images.length]
  );

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (stripRef.current) {
      const activeBtn = stripRef.current.children[active] as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [active]);

  return (
    <>
      <div className="space-y-3">
        {/* Main 35mm Film Frame */}
        <div
          className="relative overflow-hidden rounded-3xl border border-border/80 cursor-pointer group shadow-xl transition-all duration-700"
          style={{
            aspectRatio: isMobile ? "4/5" : "1/1",
            background: `radial-gradient(ellipse 120% 85% at 50% 15%, ${dominantColor.rgba(0.22)} 0%, ${dominantColor.rgba(0.08)} 50%, var(--card) 100%)`,
          }}
          onClick={() => setLightbox(true)}
        >
          {/* Studio Accent Lighting Following Image Hue */}
          <div
            className="absolute top-0 inset-x-0 h-44 pointer-events-none z-10 blur-xl transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at top, ${dominantColor.rgba(0.35)}, transparent 70%)`,
            }}
          />
          <div
            className="absolute bottom-6 inset-x-6 h-16 rounded-full pointer-events-none blur-xl z-10 transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at center, ${dominantColor.rgba(0.25)}, transparent 70%)`,
            }}
          />

          {/* Film Sprocket Holes (Left) */}
          <div className="absolute top-0 bottom-0 left-0 w-6 z-10 flex flex-col justify-around items-center bg-black/60 backdrop-blur-xs border-r border-white/10 pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-[2px] bg-white/20 border border-white/30" />
            ))}
          </div>

          {/* Film Sprocket Holes (Right) */}
          <div className="absolute top-0 bottom-0 right-0 w-6 z-10 flex flex-col justify-around items-center bg-black/60 backdrop-blur-xs border-l border-white/10 pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-[2px] bg-white/20 border border-white/30" />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={images[active]}
              alt={productName}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 w-full h-full object-cover px-6 select-none pointer-events-none"
              draggable={false}
            />
          </AnimatePresence>

          {discount > 0 && (
            <span className="absolute top-4 left-9 z-20 text-[10px] font-mono font-bold py-1 px-3 rounded-full bg-rose-500 text-white shadow-sm">
              -{discount}% OFF
            </span>
          )}

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-8 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-background/80 hover:bg-background border border-border/60 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-md backdrop-blur-md"
                aria-label="Previous frame"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-background/80 hover:bg-background border border-border/60 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-md backdrop-blur-md"
                aria-label="Next frame"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Film Frame Counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-background/85 backdrop-blur-md rounded-full px-3.5 py-0.5 text-[10px] text-foreground font-mono font-bold border border-border/60 shadow-xs">
            FRAME {String(active + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
          </div>

          <div className="absolute top-3 right-8 z-20 bg-black/60 backdrop-blur-md rounded-full p-1.5 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Filmstrip Sprocket Thumbnails */}
        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5"
        >
          {images.map((img, i) => {
            const isSelected = i === active;
            return (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`shrink-0 relative overflow-hidden transition-all duration-200 ${
                  isMobile ? "w-16 h-12" : "w-20 h-14"
                } rounded-lg border cursor-pointer ${
                  isSelected
                    ? "border-primary ring-1 ring-primary/40 opacity-100 scale-102"
                    : "border-border/60 opacity-50 hover:opacity-100 grayscale hover:grayscale-0"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            );
          })}
        </div>
      </div>

      <ProductLightboxModal
        open={lightbox}
        onClose={() => setLightbox(false)}
        images={images}
        productName={productName}
        startIndex={active}
      />
    </>
  );
};

export default FilmstripGallery;
