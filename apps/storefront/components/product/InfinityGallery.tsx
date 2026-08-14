"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
const MIN_CYLINDER_SLOTS = 6;

const InfinityGallery: React.FC<InfinityGalleryProps> = ({
  images,
  productName,
  discount = 0,
}) => {
  const [activeSlot, setActiveSlot] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expand slots cyclically if fewer than 6 images to form a full 360° cylinder
  const cylinderSlots = useMemo(() => {
    if (!images || images.length === 0) return [];
    if (images.length >= MIN_CYLINDER_SLOTS) {
      return images.map((src, originalIndex) => ({ src, originalIndex }));
    }
    const slots: { src: string; originalIndex: number }[] = [];
    let idx = 0;
    while (slots.length < MIN_CYLINDER_SLOTS || slots.length % images.length !== 0) {
      slots.push({
        src: images[idx % images.length],
        originalIndex: idx % images.length,
      });
      idx++;
    }
    return slots;
  }, [images]);

  const numSlots = cylinderSlots.length;
  const activeImageIndex = cylinderSlots[activeSlot]?.originalIndex ?? 0;

  // ── CYLINDER ROTATION NAVIGATION ──
  const rotateCylinder = useCallback(
    (direction: 1 | -1) => {
      setActiveSlot((prev) => (prev + direction + numSlots) % numSlots);
    },
    [numSlots]
  );

  const pauseAutoPlay = useCallback(() => {
    setIsAutoPlay(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsAutoPlay(true), RESUME_IDLE_DELAY);
  }, []);

  useEffect(() => {
    if (!isAutoPlay || lightboxOpen || numSlots <= 1 || isDragging) {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
      return;
    }

    autoPlayTimer.current = setInterval(() => {
      rotateCylinder(1);
    }, AUTO_ROTATE_DELAY);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isAutoPlay, lightboxOpen, numSlots, isDragging, rotateCylinder]);

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
      rotateCylinder(dx < 0 ? 1 : -1);
    }
  };

  // ── MATHEMATICAL 3D CYLINDER GEOMETRY ──
  const getCylinderTransform = (slotIdx: number) => {
    if (numSlots <= 1) {
      return { x: 0, z: 0, rotateY: 0, scale: 1, opacity: 1, blur: 0, zIndex: 100 };
    }

    // Cylindrical angle step
    const stepAngle = (2 * Math.PI) / numSlots;

    // Angular offset relative to activeSlot: normalized to [-PI, +PI]
    let diff = (slotIdx - activeSlot) % numSlots;
    if (diff > numSlots / 2) diff -= numSlots;
    if (diff < -numSlots / 2) diff += numSlots;

    const angle = diff * stepAngle;
    const radius = isMobile ? 180 : 280;

    // 3D coordinates on cylinder surface
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius - radius;
    const rotateY = -angle * (180 / Math.PI);

    const cosVal = Math.cos(angle);
    // Smooth depth scaling (1.0 at front, 0.72 at back)
    const scale = 0.72 + 0.28 * Math.max(0, (1 + cosVal) / 2);

    // Front-facing cards are crisp; curving side/back cards blend seamlessly
    const opacity = cosVal > -0.15 ? Math.min(1, Math.max(0.2, (1 + cosVal) / 1.6)) : 0;
    const blur = cosVal > 0.4 ? 0 : Math.min(4, (1 - cosVal) * 2.5);
    const zIndex = Math.round((1 + cosVal) * 50);

    return { x, z, rotateY, scale, opacity, blur, zIndex };
  };

  if (!images || images.length === 0) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-3xl bg-black select-none group"
        style={{
          height: isMobile ? "60vh" : "540px",
          perspective: "1300px",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── 1. AMBIENT BLENDING BACKDROP ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeImageIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 0.4, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -inset-12 bg-cover bg-center"
              style={{
                backgroundImage: `url(${images[activeImageIndex]})`,
                filter: "blur(54px) brightness(0.4) saturate(1.3)",
              }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />
        </div>

        {/* ── 2. 3D CYLINDRICAL CAROUSEL REVOLUTION STAGE ── */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-auto"
          style={{ transformStyle: "preserve-3d" }}
        >
          {cylinderSlots.map((slot, idx) => {
            const isCenter = idx === activeSlot;
            const geo = getCylinderTransform(idx);

            return (
              <motion.div
                key={idx}
                animate={{
                  x: geo.x,
                  z: geo.z,
                  rotateY: geo.rotateY,
                  scale: geo.scale,
                  opacity: geo.opacity,
                  filter: `blur(${geo.blur}px)`,
                }}
                transition={{
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: "absolute",
                  width: isMobile ? "68vw" : "19rem",
                  height: isMobile ? "48vh" : "26rem",
                  transformStyle: "preserve-3d",
                  zIndex: geo.zIndex,
                }}
                onClick={() => {
                  pauseAutoPlay();
                  if (isCenter) {
                    setLightboxOpen(true);
                  } else {
                    setActiveSlot(idx);
                  }
                }}
                className="cursor-pointer rounded-2xl overflow-hidden shadow-none border-none outline-none"
              >
                {/* Full-bleed borderless high resolution photo */}
                <img
                  src={slot.src}
                  alt={`${productName} angle ${slot.originalIndex + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  draggable={false}
                />

                {/* Soft ambient gradient overlay for smooth depth blending */}
                <div
                  className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
                    isCenter
                      ? "bg-gradient-to-t from-black/35 via-transparent to-transparent"
                      : "bg-black/40 hover:bg-black/20"
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
          onClick={(e) => {
            e.stopPropagation();
            pauseAutoPlay();
            rotateCylinder(-1);
          }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border-none outline-none"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Right Navigation Arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            pauseAutoPlay();
            rotateCylinder(1);
          }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 border-none outline-none"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Bottom Pill Indicators & Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
          <div className="flex items-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  pauseAutoPlay();
                  const targetSlot = cylinderSlots.findIndex((s) => s.originalIndex === i);
                  if (targetSlot !== -1) setActiveSlot(targetSlot);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === activeImageIndex
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-white/30 hover:bg-white/60"
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
          <span className="text-white/80 text-[10.5px] font-mono font-bold pl-1 border-l border-white/15">
            {activeImageIndex + 1} / {images.length}
          </span>
        </div>

        {/* Fullscreen Lightbox Trigger Button */}
        <div
          className="absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md rounded-full p-2 text-white/80 hover:text-white cursor-pointer transition-colors hover:scale-105 border border-white/10"
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
        startIndex={activeImageIndex}
      />
    </>
  );
};

export default InfinityGallery;
