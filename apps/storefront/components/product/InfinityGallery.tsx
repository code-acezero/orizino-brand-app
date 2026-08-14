"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ProductLightboxModal from "./ProductLightboxModal";

import { useImageDominantColor } from "@/hooks/use-image-dominant-color";

interface InfinityGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const AUTO_ROTATE_DELAY = 4500;
const RESUME_IDLE_DELAY = 5000;

const InfinityGallery: React.FC<InfinityGalleryProps> = ({
  images,
  productName,
  discount = 0,
}) => {
  const isMobile = useIsMobile();
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = images.length;
  const activeImage = images[activeIndex] || images[0] || "";
  const dominantColor = useImageDominantColor(activeImage);

  const navigate = useCallback(
    (direction: 1 | -1) => {
      setActiveIndex((prev) => (prev + direction + total) % total);
    },
    [total]
  );

  const pauseAutoPlay = useCallback(() => {
    setIsAutoPlay(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setIsAutoPlay(true);
    }, RESUME_IDLE_DELAY);
  }, []);

  useEffect(() => {
    if (!isAutoPlay || total <= 1) return;
    autoPlayTimer.current = setInterval(() => {
      navigate(1);
    }, AUTO_ROTATE_DELAY);
    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isAutoPlay, navigate, total]);

  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    pauseAutoPlay();
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) {
      navigate(diff < 0 ? 1 : -1);
    }
  };

  const getCardStyle = (idx: number) => {
    let diff = idx - activeIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    // Center Hero Image
    if (diff === 0) {
      return {
        x: "0%",
        scale: 1,
        rotateY: 0,
        z: 80,
        opacity: 1,
        dimOpacity: 0,
        zIndex: 30,
        pointerEvents: "auto" as const,
      };
    }

    // Left perspective wing card
    if (diff === -1) {
      return {
        x: isMobile ? "-60%" : "-64%",
        scale: 0.82,
        rotateY: 28,
        z: -50,
        opacity: 0.55,
        dimOpacity: 0.45,
        zIndex: 20,
        pointerEvents: "auto" as const,
      };
    }

    // Right perspective wing card
    if (diff === 1) {
      return {
        x: isMobile ? "60%" : "64%",
        scale: 0.82,
        rotateY: -28,
        z: -50,
        opacity: 0.55,
        dimOpacity: 0.45,
        zIndex: 20,
        pointerEvents: "auto" as const,
      };
    }

    // Hidden cards in the background
    const isRight = diff > 0;
    return {
      x: isRight ? "115%" : "-115%",
      scale: 0.62,
      rotateY: isRight ? -45 : 45,
      z: -150,
      opacity: 0,
      dimOpacity: 0.7,
      zIndex: 10,
      pointerEvents: "none" as const,
    };
  };

  if (!images || images.length === 0) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-3xl select-none group border border-border/80 min-h-[520px] sm:min-h-[580px] transition-all duration-700"
        style={{
          height: isMobile ? "58vh" : "560px",
          perspective: "1200px",
          background: `radial-gradient(ellipse 120% 85% at 50% 15%, ${dominantColor.rgba(0.22)} 0%, ${dominantColor.rgba(0.08)} 50%, var(--card) 100%)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── 1. REALISTIC OVERHEAD STUDIO SPOTLIGHT CONE & PEDESTAL (IMAGE CHROMATIC FOLLOWING) ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* Ambient Image Glow Diffusion */}
          <div
            className="absolute -inset-16 bg-cover bg-center transition-all duration-700 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url(${activeImage})`,
              filter: "blur(60px) saturate(1.4)",
              transform: "scale(1.1)",
            }}
          />

          {/* 1. Seamless Diffused Overhead Light Pool Following Active Image Tone */}
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-[32rem] sm:w-[40rem] h-56 rounded-full blur-3xl pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at center, ${dominantColor.rgba(0.4)} 0%, transparent 70%)`,
            }}
          />

          {/* 2. Soft Conical Downward Light Shaft Following Active Image Tone */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[130%] max-w-[720px] h-[480px] pointer-events-none blur-3xl opacity-70 transition-all duration-700"
            style={{
              background: `conic-gradient(from 70deg at 50% 0%, transparent 0deg, ${dominantColor.rgba(0.18)} 18deg, ${dominantColor.rgba(0.32)} 25deg, ${dominantColor.rgba(0.18)} 32deg, transparent 50%)`,
            }}
          />
          {/* Feathered Radial Core Beam */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-[380px] pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${dominantColor.rgba(0.28)} 0%, transparent 75%)`,
            }}
          />

          {/* 3. Studio Pedestal Stage Floor Reflection Following Active Image Tone */}
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[24rem] sm:w-[32rem] h-24 rounded-[100%] blur-2xl pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at center, ${dominantColor.rgba(0.32)} 0%, transparent 70%)`,
            }}
          />
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-8 rounded-[100%] blur-md pointer-events-none transition-all duration-700"
            style={{
              backgroundColor: dominantColor.rgba(0.25),
            }}
          />

          {/* 4. Cinematic Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />
        </div>

        {/* ── 2. 3D PERSPECTIVE CAROUSEL STAGE ── */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-auto overflow-hidden"
          style={{ transformStyle: "preserve-3d" }}
        >
          {images.map((img, idx) => {
            const isCenter = idx === activeIndex;
            const style = getCardStyle(idx);

            return (
              <motion.div
                key={idx}
                animate={{
                  x: style.x,
                  scale: style.scale,
                  rotateY: style.rotateY,
                  z: style.z,
                  opacity: style.opacity,
                }}
                transition={{
                  duration: 0.62,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: "absolute",
                  width: isMobile ? "75vw" : "21rem",
                  maxWidth: "80vw",
                  height: isMobile ? "48vh" : "28rem",
                  maxHeight: "88%",
                  transformStyle: "preserve-3d",
                  zIndex: style.zIndex,
                  pointerEvents: style.pointerEvents,
                  willChange: "transform, opacity",
                  backfaceVisibility: "hidden",
                }}
                onClick={() => {
                  pauseAutoPlay();
                  if (isCenter) {
                    setLightboxOpen(true);
                  } else {
                    setActiveIndex(idx);
                  }
                }}
                className={`cursor-pointer rounded-2xl overflow-hidden shadow-2xl transition-all ${
                  isCenter
                    ? "border border-border/80 ring-1 ring-primary/40"
                    : "border border-border/40 hover:border-border"
                }`}
              >
                {/* Clean full-bleed garment photograph */}
                <img
                  src={img}
                  alt={`${productName} view ${idx + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none rounded-2xl"
                  draggable={false}
                />

                {/* Soft ambient depth lighting */}
                <div
                  className="absolute inset-0 bg-black pointer-events-none rounded-2xl transition-opacity duration-500"
                  style={{ opacity: isCenter ? 0 : (style as any).dimOpacity || 0.4 }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* ── 3. HUD CONTROLS & FLOATING BADGES ── */}
        {/* Discount Badge */}
        {discount > 0 && (
          <span className="absolute top-4 left-4 z-30 text-[10px] font-mono font-bold py-1 px-3 rounded-full bg-rose-500 text-white tracking-tight shadow-sm">
            -{discount}% OFF
          </span>
        )}

        {/* Left Navigation Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            pauseAutoPlay();
            navigate(-1);
          }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-background/80 hover:bg-background text-foreground flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border border-border/70 shadow-md backdrop-blur-md"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Right Navigation Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            pauseAutoPlay();
            navigate(1);
          }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-background/80 hover:bg-background text-foreground flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border border-border/70 shadow-md backdrop-blur-md"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Bottom Pill Indicators & Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 bg-background/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-border/60 shadow-xs">
          <div className="flex items-center gap-1.5">
            {images.map((_, i) => (
              <button
                type="button"
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  pauseAutoPlay();
                  setActiveIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === activeIndex
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-foreground/25 hover:bg-foreground/50"
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
          <span className="text-foreground/80 text-[10.5px] font-mono font-bold pl-1 border-l border-border/60">
            {activeIndex + 1} / {total}
          </span>
        </div>

        {/* Fullscreen Lightbox Trigger Button */}
        <button
          type="button"
          className="absolute top-4 right-4 z-30 bg-background/80 hover:bg-background backdrop-blur-md rounded-full p-2 text-foreground cursor-pointer transition-all hover:scale-105 border border-border/60 shadow-xs"
          onClick={() => setLightboxOpen(true)}
          title="Fullscreen Zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <ProductLightboxModal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={images}
        productName={productName}
        startIndex={activeIndex}
      />
    </>
  );
};

export default InfinityGallery;
