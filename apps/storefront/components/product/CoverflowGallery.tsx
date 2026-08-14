"use client";
import React, { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ProductLightboxModal from "./ProductLightboxModal";

interface CoverflowGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const CoverflowGallery: React.FC<CoverflowGalleryProps> = ({
  images,
  productName,
  discount = 0,
}) => {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const isMobile = useIsMobile();
  const touchStartX = useRef(0);

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + images.length) % images.length),
    [images.length]
  );

  const getCardStyle = (idx: number) => {
    const diff = idx - active;
    const absDiff = Math.abs(diff);
    if (absDiff > 2) {
      return { opacity: 0, scale: 0.6, x: diff * 200, z: -300, rotateY: 0 };
    }
    return {
      opacity: absDiff > 1 ? 0.35 : absDiff === 1 ? 0.75 : 1,
      scale: absDiff === 0 ? 1 : 0.78,
      x: diff * (isMobile ? 120 : 180),
      z: absDiff === 0 ? 0 : -140,
      rotateY: diff * -25,
    };
  };

  return (
    <>
      <div
        className="relative w-full overflow-hidden rounded-3xl bg-card/60 border border-border/60"
        style={{ height: isMobile ? "55vh" : "500px", perspective: "1200px" }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        {/* Preserved 3D Stage */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {images.map((img, idx) => {
            const style = getCardStyle(idx);
            const isCenter = idx === active;
            return (
              <motion.div
                key={idx}
                animate={style}
                transition={{ type: "spring", stiffness: 240, damping: 26 }}
                className={`absolute cursor-pointer rounded-2xl overflow-hidden border transition-colors ${
                  isCenter ? "border-primary ring-1 ring-primary/40" : "border-border/60"
                }`}
                style={{
                  width: isMobile ? "65vw" : "320px",
                  height: isMobile ? "42vh" : "420px",
                  transformStyle: "preserve-3d",
                }}
                onClick={() => {
                  if (isCenter) setLightbox(true);
                  else setActive(idx);
                }}
              >
                <img
                  src={img}
                  alt={`${productName} ${idx + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {isCenter && (
                  <div className="absolute bottom-3 left-3 right-3 text-center">
                    <span className="text-white/80 text-[11px] font-mono tracking-wider uppercase">
                      {idx + 1} / {images.length}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {discount > 0 && (
          <span className="absolute top-4 left-4 z-20 text-xs font-bold py-0.5 px-2.5 rounded-full bg-rose-500 text-white font-mono">
            -{discount}%
          </span>
        )}

        {/* Center Control Pod */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/60">
          <button
            onClick={() => go(-1)}
            className="w-8 h-8 rounded-full bg-secondary/40 hover:bg-secondary border border-border/50 flex items-center justify-center text-foreground hover:text-primary transition-all cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === active ? "w-5 bg-primary" : "w-1.5 bg-foreground/20 hover:bg-foreground/40"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => go(1)}
            className="w-8 h-8 rounded-full bg-secondary/40 hover:bg-secondary border border-border/50 flex items-center justify-center text-foreground hover:text-primary transition-all cursor-pointer"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div
          className="absolute top-4 right-4 z-20 bg-background/80 backdrop-blur-md rounded-full p-2 text-foreground/80 hover:text-foreground border border-border/60 cursor-pointer transition-colors"
          onClick={() => setLightbox(true)}
          title="Open Fullscreen Zoom"
        >
          <ZoomIn className="w-4 h-4" />
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

export default CoverflowGallery;
