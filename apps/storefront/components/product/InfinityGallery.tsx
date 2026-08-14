"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ProductLightboxModal from "./ProductLightboxModal";

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

  const navigate = useCallback(
    (direction: 1 | -1) => {
      setActiveIndex((prev) => (prev + direction + total) % total);
    },
    [total]
  );

  const pauseAutoPlay = useCallback(() => {
    setIsAutoPlay(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsAutoPlay(true), RESUME_IDLE_DELAY);
  }, []);

  // Auto-play timer
  useEffect(() => {
    if (!isAutoPlay || lightboxOpen || total <= 1) {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
      return;
    }

    autoPlayTimer.current = setInterval(() => {
      navigate(1);
    }, AUTO_ROTATE_DELAY);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isAutoPlay, lightboxOpen, total, navigate]);

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, []);

  // Touch Swipe Gesture
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    pauseAutoPlay();
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      navigate(dx < 0 ? 1 : -1);
    }
  };

  // Calculate 3D card layout position relative to active card
  const getCardStyle = (idx: number) => {
    if (total <= 1) {
      return {
        x: "0%",
        scale: 1,
        rotateY: 0,
        z: 0,
        opacity: 1,
        filter: "brightness(1) blur(0px)",
        zIndex: 30,
        pointerEvents: "auto" as const,
      };
    }

    // Circular shortest distance: [-floor(total/2) ... +floor(total/2)]
    const half = total / 2;
    let diff = idx - activeIndex;
    while (diff > half) diff -= total;
    while (diff < -half) diff += total;

    // Center active focus card
    if (diff === 0) {
      return {
        x: "0%",
        scale: 1,
        rotateY: 0,
        z: 40,
        opacity: 1,
        filter: "brightness(1) blur(0px)",
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
        opacity: 0.42,
        filter: "brightness(0.65) blur(0.5px)",
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
        opacity: 0.42,
        filter: "brightness(0.65) blur(0.5px)",
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
      filter: "brightness(0.4) blur(3px)",
      zIndex: 10,
      pointerEvents: "none" as const,
    };
  };

  if (!images || images.length === 0) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-3xl bg-black select-none group"
        style={{
          height: isMobile ? "58vh" : "520px",
          perspective: "1200px",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── 1. AMBIENT BACKDROP ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.38 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="absolute -inset-10 bg-cover bg-center"
              style={{
                backgroundImage: `url(${images[activeIndex]})`,
                filter: "blur(48px) brightness(0.4) saturate(1.3)",
              }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />
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
                  filter: style.filter,
                }}
                transition={{
                  duration: 0.95,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  position: "absolute",
                  width: isMobile ? "70vw" : "19rem",
                  height: isMobile ? "46vh" : "25.5rem",
                  transformStyle: "preserve-3d",
                  zIndex: style.zIndex,
                  pointerEvents: style.pointerEvents,
                }}
                onClick={() => {
                  pauseAutoPlay();
                  if (isCenter) {
                    setLightboxOpen(true);
                  } else {
                    setActiveIndex(idx);
                  }
                }}
                className="cursor-pointer rounded-2xl overflow-hidden shadow-none border-none outline-none"
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
                  className={`absolute inset-0 transition-opacity duration-300 pointer-events-none rounded-2xl ${
                    isCenter
                      ? "bg-gradient-to-t from-black/35 via-transparent to-transparent"
                      : "bg-black/35 hover:bg-black/15"
                  }`}
                />
              </motion.div>
            );
          })}
        </div>

        {/* ── 3. HUD CONTROLS & FLOATING BADGES ── */}
        {/* Discount Badge */}
        {discount > 0 && (
          <span className="absolute top-4 left-4 z-30 text-[11px] font-mono font-bold py-0.5 px-2.5 rounded-full bg-rose-500 text-white tracking-tight">
            -{discount}%
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
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/10"
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
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/10"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Bottom Pill Indicators & Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
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
                    : "w-1.5 bg-white/30 hover:bg-white/60"
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
          <span className="text-white/80 text-[10.5px] font-mono font-bold pl-1 border-l border-white/15">
            {activeIndex + 1} / {total}
          </span>
        </div>

        {/* Fullscreen Lightbox Trigger Button */}
        <div
          className="absolute top-4 right-4 z-30 bg-black/55 backdrop-blur-md rounded-full p-2 text-white/80 hover:text-white cursor-pointer transition-colors hover:scale-105 border border-white/10"
          onClick={() => setLightboxOpen(true)}
          title="Fullscreen Zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </div>
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
