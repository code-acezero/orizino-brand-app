"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
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
  const isMobile = useIsMobile();
  const [rotationDeg, setRotationDeg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build cylinder slots array (ensure minimum 6 slots for smooth full 360° circle)
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
  const stepDeg = numSlots > 0 ? 360 / numSlots : 60;
  const radius = isMobile ? 190 : 300;

  // Active original image index derived from current continuous cylinder rotation
  const activeSlotIndex = useMemo(() => {
    if (numSlots === 0) return 0;
    const rawStep = Math.round(rotationDeg / stepDeg);
    return ((rawStep % numSlots) + numSlots) % numSlots;
  }, [rotationDeg, stepDeg, numSlots]);

  const activeImageIndex = cylinderSlots[activeSlotIndex]?.originalIndex ?? 0;

  // ── CONTINUOUS CYLINDER NAVIGATION ──
  const rotateNext = useCallback(() => {
    setRotationDeg((prev) => prev + stepDeg);
  }, [stepDeg]);

  const rotatePrev = useCallback(() => {
    setRotationDeg((prev) => prev - stepDeg);
  }, [stepDeg]);

  const pauseAutoPlay = useCallback(() => {
    setIsAutoPlay(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsAutoPlay(true), RESUME_IDLE_DELAY);
  }, []);

  // Auto-play interval
  useEffect(() => {
    if (!isAutoPlay || lightboxOpen || numSlots <= 1) {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
      return;
    }

    autoPlayTimer.current = setInterval(() => {
      rotateNext();
    }, AUTO_ROTATE_DELAY);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isAutoPlay, lightboxOpen, numSlots, rotateNext]);

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, []);

  // ── TOUCH SWIPE GESTURES ──
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
      if (dx < 0) rotateNext();
      else rotatePrev();
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-3xl bg-black select-none group"
        style={{
          height: isMobile ? "58vh" : "520px",
          perspective: isMobile ? "1000px" : "1300px",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── 1. AMBIENT BACKDROP ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -inset-10 bg-cover bg-center transition-all duration-700"
            style={{
              backgroundImage: `url(${images[activeImageIndex]})`,
              filter: "blur(40px) brightness(0.35) saturate(1.2)",
              transform: "scale(1.1)",
            }}
          />
          <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />
        </div>

        {/* ── 2. CONTINUOUS 3D ROTATING CYLINDER STAGE ── */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-auto"
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.div
            className="relative flex items-center justify-center w-full h-full"
            style={{
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
            animate={{ rotateY: -rotationDeg }}
            transition={{
              type: "spring",
              stiffness: 95,
              damping: 19,
              mass: 0.7,
            }}
          >
            {cylinderSlots.map((slot, idx) => {
              const cardAngle = idx * stepDeg;
              const isFront = idx === activeSlotIndex;

              return (
                <div
                  key={idx}
                  style={{
                    position: "absolute",
                    width: isMobile ? "68vw" : "18.5rem",
                    height: isMobile ? "46vh" : "25rem",
                    transform: `rotateY(${cardAngle}deg) translateZ(${radius}px)`,
                    transformStyle: "preserve-3d",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                  onClick={() => {
                    pauseAutoPlay();
                    if (isFront) {
                      setLightboxOpen(true);
                    } else {
                      // Smoothly rotate to this clicked slot
                      const diff = idx - activeSlotIndex;
                      let delta = diff;
                      if (delta > numSlots / 2) delta -= numSlots;
                      if (delta < -numSlots / 2) delta += numSlots;
                      setRotationDeg((prev) => prev + delta * stepDeg);
                    }
                  }}
                  className="cursor-pointer rounded-2xl overflow-hidden shadow-none border-none outline-none group/card"
                >
                  <img
                    src={slot.src}
                    alt={`${productName} view ${slot.originalIndex + 1}`}
                    className="w-full h-full object-cover select-none pointer-events-none rounded-2xl"
                    draggable={false}
                  />

                  {/* Soft ambient lighting overlay */}
                  <div
                    className={`absolute inset-0 transition-opacity duration-300 pointer-events-none rounded-2xl ${
                      isFront
                        ? "bg-gradient-to-t from-black/35 via-transparent to-transparent"
                        : "bg-black/30 hover:bg-black/10"
                    }`}
                  />
                </div>
              );
            })}
          </motion.div>
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
            rotatePrev();
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
            rotateNext();
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
                  const targetSlot = cylinderSlots.findIndex((s) => s.originalIndex === i);
                  if (targetSlot !== -1) {
                    const diff = targetSlot - activeSlotIndex;
                    let delta = diff;
                    if (delta > numSlots / 2) delta -= numSlots;
                    if (delta < -numSlots / 2) delta += numSlots;
                    setRotationDeg((prev) => prev + delta * stepDeg);
                  }
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
        startIndex={activeImageIndex}
      />
    </>
  );
};

export default InfinityGallery;
