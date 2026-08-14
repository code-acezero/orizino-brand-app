"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Flame } from "lucide-react";
import ProductLightboxModal from "@/components/product/ProductLightboxModal";

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

  if (!images || images.length === 0) return null;
  const total = images.length;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-card via-background to-card dark:from-[#161616] dark:via-[#111111] dark:to-[#090909] flex flex-col justify-between p-4 sm:p-6 select-none group border border-border/80 min-h-[520px] sm:min-h-[580px]">
      {/* ── AMBIENT STUDIO LIGHTING & SPOTLIGHT PEDESTAL ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute -inset-10 bg-cover bg-center"
            style={{
              backgroundImage: `url(${images[activeIdx]})`,
              filter: "blur(54px) brightness(0.35) saturate(1.25)",
            }}
          />
        </AnimatePresence>
        {/* Overhead Accent Studio Spotlight */}
        <div className="absolute top-0 inset-x-0 h-48 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.2),transparent_70%)] pointer-events-none" />
        {/* Pedestal Stage Floor Reflection */}
        <div className="absolute bottom-12 inset-x-8 h-20 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15),transparent_70%)] pointer-events-none blur-md" />
        {/* Soft Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35)_100%)] pointer-events-none" />
      </div>

      {/* ── TOP HUD (CLEAN & MINIMAL: NO STYLE NAME) ── */}
      <div className="w-full flex items-center justify-between z-20">
        <div>
          {discount > 0 && (
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-rose-500 text-white font-bold flex items-center gap-1 shadow-sm">
              <Flame className="w-3 h-3" /> -{discount}% OFF
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="w-9 h-9 rounded-full bg-background/70 hover:bg-background border border-border/60 text-foreground flex items-center justify-center transition-all hover:scale-105 backdrop-blur-md cursor-pointer shadow-sm"
          title="Inspect Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* ── PANORAMIC PROPORTIONAL STUDIO VIEWPORT ── */}
      <div className="relative my-auto w-full h-[390px] sm:h-[450px] md:h-[470px] flex items-center justify-center pointer-events-auto overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center">
          {images.map((img, i) => {
            const half = total / 2;
            let diff = i - activeIdx;
            while (diff > half) diff -= total;
            while (diff < -half) diff += total;

            const isCenter = diff === 0;
            const isLeft = diff === -1;
            const isRight = diff === 1;

            let x = "0%";
            let scale = 1;
            let opacity = 1;
            let zIndex = 30;

            if (isLeft) {
              x = "-56%";
              scale = 0.86;
              opacity = 0.45;
              zIndex = 20;
            } else if (isRight) {
              x = "56%";
              scale = 0.86;
              opacity = 0.45;
              zIndex = 20;
            } else if (!isCenter) {
              x = diff > 0 ? "110%" : "-110%";
              scale = 0.65;
              opacity = 0;
              zIndex = 10;
            }

            return (
              <motion.div
                key={i}
                animate={{ x, scale, opacity }}
                transition={{
                  duration: 0.85,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  position: "absolute",
                  width: "19rem",
                  maxWidth: "80vw",
                  height: "26.5rem",
                  maxHeight: "88%",
                  zIndex,
                }}
                onClick={() => {
                  if (isCenter) {
                    setLightboxOpen(true);
                  } else {
                    setActiveIdx(i);
                  }
                }}
                className={`cursor-pointer rounded-2xl overflow-hidden shadow-2xl transition-all ${
                  isCenter
                    ? "border border-border/80 ring-1 ring-primary/40"
                    : "border border-border/40 hover:border-border"
                }`}
              >
                <img
                  src={img}
                  alt={`${productName} view ${i + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none rounded-2xl"
                  draggable={false}
                />
                <div
                  className={`absolute inset-0 transition-opacity duration-300 pointer-events-none rounded-2xl ${
                    isCenter
                      ? "bg-gradient-to-t from-black/30 via-transparent to-transparent"
                      : "bg-black/40 hover:bg-black/20"
                  }`}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Navigation Arrows */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((prev) => (prev - 1 + total) % total);
              }}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border/70 text-foreground flex items-center justify-center cursor-pointer transition-all hover:scale-105 shadow-md backdrop-blur-md"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((prev) => (prev + 1) % total);
              }}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border/70 text-foreground flex items-center justify-center cursor-pointer transition-all hover:scale-105 shadow-md backdrop-blur-md"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* ── FOOTER TELEMETRY & PROGRESS ── */}
      <div className="z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === activeIdx ? "w-6 bg-primary" : "w-1.5 bg-foreground/25 hover:bg-foreground/50"
              }`}
            />
          ))}
        </div>

        <span className="text-[10px] font-mono text-foreground/80 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full border border-border/60 shadow-xs">
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
