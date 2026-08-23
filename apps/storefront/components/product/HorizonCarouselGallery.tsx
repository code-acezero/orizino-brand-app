"use client";
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Flame } from "lucide-react";
import ProductLightboxModal from "@/components/product/ProductLightboxModal";

import { useImageDominantColor } from "@/hooks/use-image-dominant-color";

interface HorizonCarouselGalleryProps {
  images: string[];
  productName?: string;
  discount?: number;
}

export default function HorizonCarouselGallery({
  images = [],
  productName = "Product",
  discount = 0,
}: HorizonCarouselGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const activeImage = images[activeIdx] || images[0] || "";
  const dominantColor = useImageDominantColor(activeImage);

  if (!images || images.length === 0) return null;
  const total = images.length;

  const navigate = useCallback(
    (direction: number) => {
      setActiveIdx((prev) => (prev + direction + total) % total);
    },
    [total]
  );

  const getCardTransform = (idx: number) => {
    let diff = idx - activeIdx;
    while (diff > total / 2) diff -= total;
    while (diff < -total / 2) diff += total;

    const isCenter = diff === 0;
    const isImmediateLeft = diff === -1;
    const isImmediateRight = diff === 1;

    if (isCenter) {
      return {
        x: "0%",
        scale: 1,
        rotateY: 0,
        z: 80,
        opacity: 1,
        zIndex: 30,
        dimOpacity: 0,
        pointerEvents: "auto" as const,
      };
    }

    if (isImmediateLeft) {
      return {
        x: "-52%",
        scale: 0.86,
        rotateY: 12,
        z: 0,
        opacity: 0.65,
        zIndex: 20,
        dimOpacity: 0.35,
        pointerEvents: "auto" as const,
      };
    }

    if (isImmediateRight) {
      return {
        x: "52%",
        scale: 0.86,
        rotateY: -12,
        z: 0,
        opacity: 0.65,
        zIndex: 20,
        dimOpacity: 0.35,
        pointerEvents: "auto" as const,
      };
    }

    return {
      x: diff < 0 ? "-105%" : "105%",
      scale: 0.65,
      rotateY: diff < 0 ? 20 : -20,
      z: -100,
      opacity: 0,
      zIndex: 10,
      dimOpacity: 0.6,
      pointerEvents: "none" as const,
    };
  };

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden flex flex-col justify-between p-4 sm:p-6 select-none group border border-border/80 min-h-[540px] sm:min-h-[600px] transition-all duration-700"
      style={{
        background: `radial-gradient(ellipse 120% 85% at 50% 15%, ${dominantColor.rgba(0.22)} 0%, ${dominantColor.rgba(0.08)} 50%, var(--card) 100%)`,
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        if (deltaX > 40) navigate(-1);
        else if (deltaX < -40) navigate(1);
        touchStartX.current = null;
      }}
    >
      {/* ── REALISTIC OVERHEAD STUDIO SPOTLIGHT CONE & PEDESTAL (IMAGE CHROMATIC FOLLOWING) ── */}
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

      {/* ── TOP HUD (CLEAN & MINIMAL) ── */}
      <div className="w-full flex items-center justify-between z-20">
        <div>
          {discount > 0 && (
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-rose-500 text-white font-bold flex items-center gap-1 shadow-none">
              <Flame className="w-3 h-3" /> -{discount}% OFF
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="w-9 h-9 rounded-full bg-background/80 hover:bg-background border border-border/60 text-foreground flex items-center justify-center transition-all hover:scale-105 backdrop-blur-md cursor-pointer shadow-none"
          title="Inspect Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* ── 3D PERSPECTIVE CAROUSEL STAGE ── */}
      <div
        className="relative my-auto w-full h-[400px] sm:h-[460px] md:h-[480px] flex items-center justify-center pointer-events-auto overflow-hidden"
        style={{ perspective: "1200px" }}
      >
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {images.map((img, i) => {
            const transform = getCardTransform(i);
            const isCenter = i === activeIdx;

            return (
              <motion.div
                key={i}
                animate={{
                  x: transform.x,
                  scale: transform.scale,
                  rotateY: transform.rotateY,
                  z: transform.z,
                  opacity: transform.opacity,
                }}
                transition={{
                  duration: 0.62,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: "absolute",
                  width: "19.5rem",
                  maxWidth: "80vw",
                  height: "27rem",
                  maxHeight: "90%",
                  zIndex: transform.zIndex,
                  pointerEvents: transform.pointerEvents,
                  transformStyle: "preserve-3d",
                  willChange: "transform, opacity",
                  backfaceVisibility: "hidden",
                }}
                onClick={() => {
                  if (isCenter) {
                    setLightboxOpen(true);
                  } else {
                    setActiveIdx(i);
                  }
                }}
                className={`cursor-pointer rounded-2xl overflow-hidden shadow-none transition-all ${
                  isCenter
                    ? "border border-border/80 ring-1 ring-primary/40 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_hsl(var(--primary)/0.2)]"
                    : "border border-border/40 hover:border-border"
                }`}
              >
                <img
                  src={img}
                  alt={`${productName} view ${i + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none rounded-2xl"
                  draggable={false}
                />
                {/* Dimming and Depth Shadow Layer */}
                <div
                  className="absolute inset-0 bg-black pointer-events-none rounded-2xl transition-opacity duration-500"
                  style={{ opacity: transform.dimOpacity }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Navigation Arrows — Clean circle-less icons, hidden on idle */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(-1);
              }}
              className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-30 p-2 text-foreground/75 hover:text-primary focus:text-primary transition-opacity duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer bg-transparent border-0 outline-none hover:scale-105"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-none" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(1);
              }}
              className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-30 p-2 text-foreground/75 hover:text-primary focus:text-primary transition-opacity duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer bg-transparent border-0 outline-none hover:scale-105"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-none" strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>

      {/* ── FOOTER TELEMETRY & PROGRESS — Sleek Micro Dots ── */}
      <div className="z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-border/50 shadow-none">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="p-0.5 !min-w-0 !min-h-0 bg-transparent border-0 outline-none flex items-center justify-center cursor-pointer"
            >
              <span
                className={`block rounded-full transition-all duration-300 pointer-events-none ${
                  i === activeIdx ? "w-3.5 h-1 bg-primary" : "w-1.5 h-1 bg-foreground/30 hover:bg-foreground/50"
                }`}
              />
            </button>
          ))}
        </div>

        <span className="text-[10px] font-mono text-foreground/80 bg-background/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-border/60 shadow-none">
          {activeIdx + 1} / {total}
        </span>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <ProductLightboxModal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={images}
        startIndex={activeIdx}
        productName={productName}
      />
    </div>
  );
}
