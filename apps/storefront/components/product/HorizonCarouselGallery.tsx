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
    <div className="relative w-full rounded-3xl overflow-hidden bg-black flex flex-col justify-between p-4 sm:p-5 select-none group border border-border/70 min-h-[460px] sm:min-h-[520px]">
      {/* Ambient Blurred Aura */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute -inset-10 bg-cover bg-center"
            style={{
              backgroundImage: `url(${images[activeIdx]})`,
              filter: "blur(48px) brightness(0.4) saturate(1.25)",
            }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />
      </div>

      {/* Header Badges */}
      <div className="w-full flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono px-3 py-1 rounded-full bg-black/70 text-white backdrop-blur-md uppercase tracking-wider border border-white/15">
            Horizon Track
          </span>
          {discount > 0 && (
            <span className="text-[9px] font-mono px-2.5 py-1 rounded-full bg-rose-500 text-white font-bold flex items-center gap-1">
              <Flame className="w-3 h-3" /> -{discount}%
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all hover:scale-105 hover:bg-black/90 cursor-pointer"
          title="Inspect Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Panoramic Card Viewport */}
      <div className="relative my-auto w-full h-[340px] sm:h-[390px] flex items-center justify-center pointer-events-auto overflow-hidden">
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
              x = "-65%";
              scale = 0.85;
              opacity = 0.45;
              zIndex = 20;
            } else if (isRight) {
              x = "65%";
              scale = 0.85;
              opacity = 0.45;
              zIndex = 20;
            } else if (!isCenter) {
              x = diff > 0 ? "120%" : "-120%";
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
                  width: "16rem",
                  height: "23rem",
                  zIndex,
                }}
                onClick={() => {
                  if (isCenter) {
                    setLightboxOpen(true);
                  } else {
                    setActiveIdx(i);
                  }
                }}
                className="cursor-pointer rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              >
                <img
                  src={img}
                  alt={`${productName} view ${i + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none rounded-2xl"
                  draggable={false}
                />
                <div
                  className={`absolute inset-0 transition-opacity duration-300 pointer-events-none rounded-2xl ${
                    isCenter ? "bg-gradient-to-t from-black/30 via-transparent to-transparent" : "bg-black/40 hover:bg-black/20"
                  }`}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Navigation Arrows */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveIdx((prev) => (prev - 1 + total) % total);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveIdx((prev) => (prev + 1) % total);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-all hover:scale-105"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Footer Progress capsule */}
      <div className="z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === activeIdx ? "w-6 bg-primary" : "w-1.5 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>

        <span className="text-[10px] font-mono text-white/90 bg-black/70 px-3 py-1 rounded-full border border-white/15">
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
