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
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-card via-background to-card dark:from-[#161616] dark:via-[#111111] dark:to-[#090909] flex flex-col justify-between p-4 sm:p-6 select-none group border border-border/80 min-h-[540px] sm:min-h-[600px]">
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

      {/* ── TOP TELEMETRY HUD ── */}
      <div className="w-full flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-background/80 text-foreground backdrop-blur-md uppercase tracking-wider border border-border/60 flex items-center gap-1.5 shadow-xs">
            <Compass className="w-3.5 h-3.5 text-primary animate-spin" style={{ animationDuration: "12s" }} />
            {angleLabel}
          </span>
          {discount > 0 && (
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-rose-500 text-white font-bold shadow-xs">
              -{discount}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-Orbit Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoSpinning(!isAutoSpinning)}
            className={`px-3 py-1 rounded-full text-[10px] font-mono border backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isAutoSpinning
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/80 hover:bg-background text-foreground border-border/60"
            }`}
          >
            {isAutoSpinning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isAutoSpinning ? "ORBITING" : "AUTO 360°"}
          </button>

          {/* Fullscreen Inspector */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="w-9 h-9 rounded-full bg-background/80 hover:bg-background border border-border/60 text-foreground flex items-center justify-center transition-all hover:scale-105 backdrop-blur-md cursor-pointer shadow-xs"
            title="Inspect Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 360 TURNTABLE STAGE & INTERACTIVE DRAG AREA ── */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative my-auto w-full h-[380px] sm:h-[440px] md:h-[460px] flex items-center justify-center pointer-events-auto cursor-ew-resize touch-none"
      >
        {/* Turntable Base Platform Shadow */}
        <div className="absolute bottom-1 w-72 sm:w-96 h-12 rounded-[100%] bg-radial from-primary/30 via-background/80 to-transparent blur-md pointer-events-none" />

        {/* Center Garment View */}
        <div className="relative w-[19rem] sm:w-[21.5rem] md:w-[23rem] h-[26.5rem] sm:h-[29.5rem] max-h-[92%] rounded-2xl overflow-hidden border border-border/80 ring-1 ring-primary/40 shadow-2xl bg-card/40">
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
          <div className="absolute inset-0 bg-radial from-transparent via-black/15 to-black/45 pointer-events-none rounded-2xl" />
        </div>

        {/* Drag Hint overlay on first view */}
        <div className="absolute bottom-3 bg-background/85 backdrop-blur-md rounded-full px-3.5 py-1 text-[9.5px] font-mono text-foreground border border-border/60 flex items-center gap-1.5 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity shadow-sm">
          <RotateCw className="w-3 h-3 text-primary animate-spin" style={{ animationDuration: "8s" }} />
          DRAG TO ROTATE 360°
        </div>

        {/* Left / Right Arrow Buttons */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAutoSpinning(false);
                setActiveIdx((prev) => (prev - 1 + total) % total);
              }}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border/70 text-foreground flex items-center justify-center cursor-pointer transition-all hover:scale-105 shadow-md backdrop-blur-md"
              aria-label="Previous frame"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAutoSpinning(false);
                setActiveIdx((prev) => (prev + 1) % total);
              }}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border/70 text-foreground flex items-center justify-center cursor-pointer transition-all hover:scale-105 shadow-md backdrop-blur-md"
              aria-label="Next frame"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* ── BOTTOM 360 ROTARY DIAL & ANGLE TICKS ── */}
      <div className="z-20 flex flex-col gap-2 pt-1">
        {/* Continuous Angle Track Slider */}
        <div className="relative w-full flex items-center px-1">
          <div className="w-full h-1.5 rounded-full bg-foreground/15 relative overflow-hidden">
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
                      ? "border-primary ring-1 ring-primary/40 opacity-100 scale-105 shadow-xs"
                      : "border-border/60 opacity-40 hover:opacity-80"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover rounded-[5px]" />
                  <span className="absolute bottom-0.5 inset-x-0 text-center text-[7.5px] font-mono font-bold bg-background/90 text-foreground py-0.2 rounded-b">
                    {angleVal}°
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[9.5px] font-mono text-foreground/80 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full border border-border/60 shrink-0 shadow-xs">
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
