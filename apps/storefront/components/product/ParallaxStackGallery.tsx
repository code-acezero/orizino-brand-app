"use client";
import React, { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ProductLightboxModal from "./ProductLightboxModal";

interface ParallaxStackGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const ParallaxStackGallery: React.FC<ParallaxStackGalleryProps> = ({
  images,
  productName,
  discount = 0,
}) => {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), {
    stiffness: 220,
    damping: 26,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), {
    stiffness: 220,
    damping: 26,
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
      mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [mouseX, mouseY, isMobile]
  );

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + images.length) % images.length),
    [images.length]
  );

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-3xl cursor-pointer border border-border/80 bg-gradient-to-b from-card via-background to-card dark:from-[#161616] dark:via-[#111111] dark:to-[#090909] min-h-[520px] sm:min-h-[580px]"
        style={{ height: isMobile ? "58vh" : "560px", perspective: "1100px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => setLightbox(true)}
        onTouchStart={(e) => {
          (containerRef.current as any).__tx = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - ((containerRef.current as any).__tx || 0);
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        {/* ── AMBIENT STUDIO LIGHTING & SPOTLIGHT PEDESTAL ── */}
        <div className="absolute top-0 inset-x-0 h-48 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.2),transparent_70%)] pointer-events-none z-10" />
        <div className="absolute bottom-10 inset-x-8 h-20 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15),transparent_70%)] pointer-events-none blur-md z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35)_100%)] pointer-events-none z-10" />

        {/* Stacked Cards with Parallax Physics */}
        <motion.div
          className="absolute inset-0"
          style={isMobile ? {} : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        >
          {images.map((img, idx) => {
            const offset = idx - active;
            const absOffset = Math.abs(offset);
            if (absOffset > 3) return null;
            return (
              <motion.div
                key={idx}
                animate={{
                  scale: 1 - absOffset * 0.07,
                  y: offset * (isMobile ? -10 : -16),
                  z: -absOffset * 50,
                  opacity: absOffset > 2 ? 0 : 1 - absOffset * 0.25,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                className="absolute inset-2 sm:inset-3 rounded-2xl overflow-hidden border border-border/80 shadow-2xl bg-card/60"
                style={{ transformStyle: "preserve-3d", zIndex: images.length - absOffset }}
              >
                <img
                  src={img}
                  alt={`${productName} ${idx + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none rounded-2xl"
                  draggable={false}
                />
                {absOffset > 0 && <div className="absolute inset-0 bg-black/40" />}
              </motion.div>
            );
          })}
        </motion.div>

        {discount > 0 && (
          <span className="absolute top-4 left-4 z-20 text-[10px] font-mono font-bold py-1 px-3 rounded-full bg-rose-500 text-white shadow-sm">
            -{discount}% OFF
          </span>
        )}

        {/* Center Control Pod */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/60">
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="w-8 h-8 rounded-full bg-secondary/40 hover:bg-secondary border border-border/50 flex items-center justify-center text-foreground hover:text-primary transition-all cursor-pointer"
            aria-label="Previous card"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-foreground text-xs font-mono font-bold tracking-wider">
            {active + 1} / {images.length}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="w-8 h-8 rounded-full bg-secondary/40 hover:bg-secondary border border-border/50 flex items-center justify-center text-foreground hover:text-primary transition-all cursor-pointer"
            aria-label="Next card"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div
          className="absolute top-5 right-5 z-20 bg-background/80 backdrop-blur-md rounded-full p-2 text-foreground border border-border/60 hover:text-primary transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setLightbox(true);
          }}
          title="Fullscreen Zoom"
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

export default ParallaxStackGallery;
