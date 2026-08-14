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
        className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-card via-background to-card dark:from-[#161616] dark:via-[#111111] dark:to-[#090909] border border-border/80 min-h-[520px] sm:min-h-[580px]"
        style={{ height: isMobile ? "58vh" : "560px", perspective: "1200px" }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        {/* ── REALISTIC OVERHEAD STUDIO SPOTLIGHT CONE & PEDESTAL (SEAMLESS BLENDED) ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* 1. Seamless Diffused Overhead Light Pool */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[32rem] sm:w-[40rem] h-56 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.32),transparent_70%)] blur-3xl pointer-events-none" />

          {/* 2. Soft Conical Downward Light Shaft */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[130%] max-w-[720px] h-[480px] pointer-events-none blur-3xl opacity-60"
            style={{
              background:
                "conic-gradient(from 70deg at 50% 0%, transparent 0deg, hsl(var(--primary)/0.18) 18deg, hsl(var(--primary)/0.28) 25deg, hsl(var(--primary)/0.18) 32deg, transparent 50%)",
            }}
          />
          {/* Feathered Radial Core Beam */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-[380px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(var(--primary)/0.25),transparent_75%)] pointer-events-none" />

          {/* 3. Studio Pedestal Stage Floor Reflection (Spotlight Catch) */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[24rem] sm:w-[32rem] h-24 rounded-[100%] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.25),transparent_70%)] blur-2xl pointer-events-none" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-8 rounded-[100%] bg-primary/20 blur-md pointer-events-none" />

          {/* 4. Cinematic Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.45)_100%)] pointer-events-none" />
        </div>

        {/* Preserved 3D Stage */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-auto overflow-hidden"
          style={{ transformStyle: "preserve-3d" }}
        >
          {images.map((img, idx) => {
            const style = getCardStyle(idx);
            const isCenter = idx === active;
            return (
              <motion.div
                key={idx}
                animate={style}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className={`absolute cursor-pointer rounded-2xl overflow-hidden border shadow-2xl transition-colors ${
                  isCenter ? "border-primary ring-1 ring-primary/40" : "border-border/60"
                }`}
                style={{
                  width: isMobile ? "74vw" : "360px",
                  height: isMobile ? "46vh" : "460px",
                  maxHeight: "88%",
                  transformStyle: "preserve-3d",
                  willChange: "transform, opacity",
                  backfaceVisibility: "hidden",
                }}
                onClick={() => {
                  if (isCenter) setLightbox(true);
                  else setActive(idx);
                }}
              >
                <img
                  src={img}
                  alt={`${productName} ${idx + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none rounded-2xl"
                  draggable={false}
                />
                <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none rounded-2xl ${
                  isCenter ? "bg-gradient-to-t from-black/30 via-transparent to-transparent" : "bg-black/40"
                }`} />
                {isCenter && (
                  <div className="absolute bottom-3 left-3 right-3 text-center">
                    <span className="text-white/80 text-[11px] font-mono tracking-wider uppercase bg-black/60 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                      {idx + 1} / {images.length}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {discount > 0 && (
          <span className="absolute top-4 left-4 z-20 text-[10px] font-mono font-bold py-1 px-3 rounded-full bg-rose-500 text-white shadow-sm">
            -{discount}% OFF
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
