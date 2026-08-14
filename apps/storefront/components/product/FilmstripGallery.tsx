"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ProductLightboxModal from "./ProductLightboxModal";

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
          className="relative overflow-hidden rounded-2xl bg-black border border-border/60 cursor-pointer group"
          style={{ aspectRatio: isMobile ? "3/4" : "16/10" }}
          onClick={() => setLightbox(true)}
        >
          {/* Film Sprocket Holes (Left) */}
          <div className="absolute top-0 bottom-0 left-0 w-6 z-10 flex flex-col justify-around items-center bg-black/90 border-r border-white/10 pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-[2px] bg-white/20 border border-white/30" />
            ))}
          </div>

          {/* Film Sprocket Holes (Right) */}
          <div className="absolute top-0 bottom-0 right-0 w-6 z-10 flex flex-col justify-around items-center bg-black/90 border-l border-white/10 pointer-events-none">
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
            <span className="absolute top-4 left-9 z-20 text-xs font-bold py-0.5 px-2.5 rounded-full bg-rose-500 text-white font-mono">
              -{discount}%
            </span>
          )}

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-8 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                aria-label="Previous frame"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                aria-label="Next frame"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Film Frame Counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-black/75 backdrop-blur-md rounded-full px-3 py-0.5 text-[10px] text-white font-mono font-bold border border-white/20">
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
