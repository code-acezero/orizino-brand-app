"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw, Maximize2, Compass, Sparkles, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import ProductLightboxModal from "@/components/product/ProductLightboxModal";

interface StudioTurntableGalleryProps {
  images: string[];
  productName?: string;
  discount?: number;
}

const ANGLE_LABELS = [
  "0° FRONT VIEW",
  "45° ANGLE RIGHT",
  "90° SIDE PROFILE",
  "135° REAR ANGLE",
  "180° BACK VIEW",
  "225° REAR LEFT",
  "270° SIDE PROFILE",
  "315° ANGLE LEFT",
];

export default function StudioTurntableGallery({
  images = [],
  productName = "Product",
  discount = 0,
}: StudioTurntableGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartIdx = useRef(0);

  const total = images.length || 1;

  // Auto spin timer
  useEffect(() => {
    if (!isAutoSpinning || total <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % total);
    }, 1200);
    return () => clearInterval(interval);
  }, [isAutoSpinning, total]);

  // Touch / Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setIsAutoSpinning(false);
    dragStartX.current = e.clientX;
    dragStartIdx.current = activeIdx;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || total <= 1) return;
    const deltaX = e.clientX - dragStartX.current;
    const sensitivity = 38; // px per frame
    const stepDiff = Math.round(deltaX / sensitivity);
    const newIdx = ((dragStartIdx.current - stepDiff) % total + total) % total;
    if (newIdx !== activeIdx) {
      setActiveIdx(newIdx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const currentAngleDeg = Math.round((activeIdx / total) * 360);
  const angleLabel = ANGLE_LABELS[Math.min(activeIdx, ANGLE_LABELS.length - 1)] || `${currentAngleDeg}° STUDIO VIEW`;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-black flex flex-col justify-between p-4 sm:p-5 select-none group border border-border/70 min-h-[480px] sm:min-h-[530px]">
      {/* ── AMBIENT STUDIO SPOTLIGHT BACKDROP ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.38 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute -inset-10 bg-cover bg-center"
            style={{
              backgroundImage: `url(${images[activeIdx]})`,
              filter: "blur(48px) brightness(0.35) saturate(1.2)",
            }}
          />
        </AnimatePresence>
        {/* Studio Spotlight Cone */}
        <div className="absolute inset-0 bg-radial from-white/10 via-transparent to-black/90 pointer-events-none" />
      </div>

      {/* ── TOP TELEMETRY HUD ── */}
      <div className="w-full flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono px-3 py-1 rounded-full bg-black/75 text-white backdrop-blur-md uppercase tracking-wider border border-white/15 flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-primary animate-spin" style={{ animationDuration: "12s" }} />
            {angleLabel}
          </span>
          {discount > 0 && (
            <span className="text-[9px] font-mono px-2.5 py-1 rounded-full bg-rose-500 text-white font-bold">
              -{discount}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Auto-Orbit Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoSpinning(!isAutoSpinning)}
            className={`px-2.5 py-1 rounded-full text-[9px] font-mono border backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer ${
              isAutoSpinning
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-black/60 text-white/80 border-white/15 hover:text-white"
            }`}
          >
            {isAutoSpinning ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            {isAutoSpinning ? "ORBITING" : "AUTO 360°"}
          </button>

          {/* Fullscreen Inspector */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all hover:scale-105 hover:bg-black/90 cursor-pointer"
            title="Inspect Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 360 TURNTABLE STAGE & INTERACTIVE DRAG AREA ── */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative my-auto w-full h-[330px] sm:h-[380px] flex items-center justify-center pointer-events-auto cursor-ew-resize touch-none"
      >
        {/* Turntable Base Platform Shadow */}
        <div className="absolute bottom-1 w-64 sm:w-80 h-10 rounded-[100%] bg-radial from-primary/30 via-black/80 to-transparent blur-md pointer-events-none" />

        {/* Center Garment View */}
        <div className="relative w-[15.5rem] sm:w-[17.5rem] h-[22rem] sm:h-[24rem] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.img
              key={images[activeIdx]}
              src={images[activeIdx]}
              alt={`${productName} Angle ${activeIdx + 1}`}
              initial={{ opacity: 0.88, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0.88 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full object-cover select-none pointer-events-none rounded-2xl"
              draggable={false}
            />
          </AnimatePresence>

          {/* Subtle Stage Lighting Vignette */}
          <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/60 pointer-events-none rounded-2xl" />
        </div>

        {/* Drag Hint overlay on first view */}
        <div className="absolute bottom-3 bg-black/70 backdrop-blur-md rounded-full px-3 py-1 text-[9px] font-mono text-white/90 border border-white/15 flex items-center gap-1.5 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
          <RotateCw className="w-3 h-3 text-primary animate-spin" style={{ animationDuration: "8s" }} />
          DRAG TO ROTATE 360°
        </div>

        {/* Left / Right Arrow Buttons */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsAutoSpinning(false);
            setActiveIdx((prev) => (prev - 1 + total) % total);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsAutoSpinning(false);
            setActiveIdx((prev) => (prev + 1) % total);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* ── BOTTOM 360 ROTARY DIAL & ANGLE TICKS ── */}
      <div className="z-20 flex flex-col gap-2 pt-1">
        {/* Continuous Angle Track Slider */}
        <div className="relative w-full flex items-center px-1">
          <div className="w-full h-1.5 rounded-full bg-white/15 relative overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              style={{ width: `${((activeIdx + 1) / total) * 100}%` }}
              transition={{ duration: 0.15 }}
            />
          </div>
        </div>

        {/* Angle Ticks / Thumbnails Strip */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {images.map((img, idx) => {
              const isSelected = idx === activeIdx;
              const angleVal = Math.round((idx / total) * 360);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsAutoSpinning(false);
                    setActiveIdx(idx);
                  }}
                  className={`relative w-12 h-10 sm:w-14 sm:h-11 rounded-lg overflow-hidden border cursor-pointer transition-all shrink-0 flex flex-col items-center justify-end p-0.5 ${
                    isSelected
                      ? "border-primary ring-1 ring-primary/40 opacity-100 scale-105"
                      : "border-white/15 opacity-40 hover:opacity-80"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover rounded-[5px]" />
                  <span className="absolute bottom-0.5 inset-x-0 text-center text-[7.5px] font-mono font-bold bg-black/85 text-white/90 py-0.2 rounded-b">
                    {angleVal}°
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[9.5px] font-mono text-white/80 bg-black/70 px-2.5 py-1 rounded-full border border-white/15 shrink-0">
            {activeIdx + 1} / {total}
          </span>
        </div>
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
