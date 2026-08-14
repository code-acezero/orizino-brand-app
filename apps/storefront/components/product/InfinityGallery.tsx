"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ProductLightboxModal from "./ProductLightboxModal";

interface InfinityGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const AUTO_ROTATE_DELAY = 4000;
const RESUME_IDLE_DELAY = 5000;

const InfinityGallery: React.FC<InfinityGalleryProps> = ({
  images,
  productName,
  discount = 0,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── MOUSE PARALLAX TRACKING ──
  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);

  const springConfig = { stiffness: 160, damping: 22, mass: 0.8 };
  const mouseX = useSpring(rawMouseX, springConfig);
  const mouseY = useSpring(rawMouseY, springConfig);

  // Parallax shifts for foreground cards vs ambient background
  const stageTiltX = useTransform(mouseY, [-0.5, 0.5], [7, -7]);
  const stageTiltY = useTransform(mouseX, [-0.5, 0.5], [-9, 9]);
  const bgShiftX = useTransform(mouseX, [-0.5, 0.5], [18, -18]);
  const bgShiftY = useTransform(mouseY, [-0.5, 0.5], [14, -14]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      rawMouseX.set((e.clientX - rect.left) / rect.width - 0.5);
      rawMouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [isMobile, rawMouseX, rawMouseY]
  );

  const handleMouseLeave = useCallback(() => {
    rawMouseX.set(0);
    rawMouseY.set(0);
  }, [rawMouseX, rawMouseY]);

  // ── NAVIGATION & AUTO-ROTATE ──
  const total = images.length;
  const navigate = useCallback(
    (dir: 1 | -1) => {
      setActiveIndex((prev) => (prev + dir + total) % total);
    },
    [total]
  );

  const pauseAutoPlay = useCallback(() => {
    setIsAutoPlay(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsAutoPlay(true), RESUME_IDLE_DELAY);
  }, []);

  useEffect(() => {
    if (!isAutoPlay || lightboxOpen || total <= 1 || isDragging) {
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
  }, [isAutoPlay, lightboxOpen, total, isDragging, navigate]);

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, []);

  // ── TOUCH / DRAG GESTURE RECOGNITION ──
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

  // ── 3D CYLINDRICAL TRANSFORM CALCULATION ──
  // Calculate relative angular wrap for seamless infinite flow
  const getCardTransform = (idx: number) => {
    if (total <= 1) {
      return { x: 0, z: 0, rotateY: 0, scale: 1, opacity: 1, blur: 0, zIndex: 50 };
    }

    // Normalized circular distance from activeIndex: [-floor(total/2) ... +floor(total/2)]
    const half = total / 2;
    let diff = idx - activeIndex;
    while (diff > half) diff -= total;
    while (diff < -half) diff += total;

    const absDiff = Math.abs(diff);

    // Cards beyond visible range (3+ steps away)
    if (absDiff > 2.5) {
      return {
        x: diff > 0 ? 320 : -320,
        z: -280,
        rotateY: diff > 0 ? -45 : 45,
        scale: 0.55,
        opacity: 0,
        blur: 8,
        zIndex: 1,
      };
    }

    const radiusX = isMobile ? 120 : 175;
    const x = diff * radiusX;
    const z = -absDiff * (isMobile ? 55 : 75);
    const rotateY = diff * -24;
    const scale = Math.max(0.68, 1 - absDiff * 0.16);
    const opacity = absDiff === 0 ? 1 : Math.max(0.35, 1 - absDiff * 0.38);
    const blur = absDiff === 0 ? 0 : Math.min(4, absDiff * 2.2);
    const zIndex = 50 - Math.round(absDiff * 10);

    return { x, z, rotateY, scale, opacity, blur, zIndex };
  };

  if (total === 0) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-3xl border border-border/60 bg-black select-none group"
        style={{
          height: isMobile ? "56vh" : "500px",
          perspective: "1200px",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── 1. AMBIENT BLENDING BACKDROP WITH PARALLAX GLOW ── */}
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={isMobile ? {} : { x: bgShiftX, y: bgShiftY }}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 0.38, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -inset-10 bg-cover bg-center blur-3xl"
              style={{
                backgroundImage: `url(${images[activeIndex]})`,
                filter: "blur(48px) brightness(0.45) saturate(1.3)",
              }}
            />
          </AnimatePresence>

          {/* Radial depth vignette */}
          <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />
        </motion.div>

        {/* ── 2. 3D REVOLVING INFINITE CAROUSEL STAGE ── */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={
            isMobile
              ? { transformStyle: "preserve-3d" }
              : {
                  rotateX: stageTiltX,
                  rotateY: stageTiltY,
                  transformStyle: "preserve-3d",
                }
          }
        >
          {images.map((img, idx) => {
            const isCenter = idx === activeIndex;
            const card = getCardTransform(idx);

            return (
              <motion.div
                key={idx}
                animate={{
                  x: card.x,
                  z: card.z,
                  rotateY: card.rotateY,
                  scale: card.scale,
                  opacity: card.opacity,
                  filter: `blur(${card.blur}px)`,
                }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 26,
                  mass: 0.7,
                }}
                style={{
                  position: "absolute",
                  width: isMobile ? "58vw" : "15rem",
                  height: isMobile ? "44vh" : "21rem",
                  transformStyle: "preserve-3d",
                  zIndex: card.zIndex,
                }}
                onClick={() => {
                  pauseAutoPlay();
                  if (isCenter) {
                    setLightboxOpen(true);
                  } else {
                    setActiveIndex(idx);
                  }
                }}
                className={`cursor-pointer rounded-2xl overflow-hidden border transition-colors ${
                  isCenter
                    ? "border-primary/80 ring-1 ring-primary/40"
                    : "border-white/20 hover:border-white/40"
                }`}
              >
                {/* Pure Clean Garment Photo */}
                <img
                  src={img}
                  alt={`${productName} view ${idx + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  draggable={false}
                />

                {/* Subtle soft edge ambient reflection */}
                <div
                  className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
                    isCenter
                      ? "bg-gradient-to-t from-black/40 via-transparent to-transparent"
                      : "bg-black/35 hover:bg-black/20"
                  }`}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── 3. HUD CONTROLS & FLOATING BADGES ── */}
        {/* Discount Badge */}
        {discount > 0 && (
          <span className="absolute top-4 left-4 z-30 text-[11px] font-mono font-bold py-0.5 px-2.5 rounded-full bg-rose-500 text-white tracking-tight">
            -{discount}%
          </span>
        )}

        {/* Navigation Left Arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            pauseAutoPlay();
            navigate(-1);
          }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Navigation Right Arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            pauseAutoPlay();
            navigate(1);
          }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Bottom Pill Indicator & Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
          <div className="flex items-center gap-1.5">
            {images.map((_, i) => (
              <button
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
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <span className="text-white/75 text-[10.5px] font-mono font-bold pl-1 border-l border-white/20">
            {activeIndex + 1} / {total}
          </span>
        </div>

        {/* Fullscreen Lightbox Hint Button */}
        <div
          className="absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md rounded-full p-2 text-white/80 hover:text-white border border-white/15 cursor-pointer transition-colors hover:scale-105"
          onClick={() => setLightboxOpen(true)}
          title="Fullscreen Zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </div>
      </div>

      {/* Fullscreen Lightbox Integration */}
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
