"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Maximize2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import ProductLightboxModal from "@/components/product/ProductLightboxModal";

interface EditorialSplitGalleryProps {
  images: string[];
  productName?: string;
  discount?: number;
}

export default function EditorialSplitGallery({
  images = [],
  productName = "Product",
  discount = 0,
}: EditorialSplitGalleryProps) {
  const [primaryIdx, setPrimaryIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  if (!images || images.length === 0) return null;

  const total = images.length;
  const secondaryIdx = total > 1 ? (primaryIdx + 1) % total : 0;

  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-3 w-full select-none">
      {/* ── DUAL EDITORIAL SPLIT VIEWPORT ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
        {/* Primary View */}
        <div
          className="relative h-[420px] sm:h-[540px] md:h-[580px] rounded-3xl overflow-hidden bg-gradient-to-b from-card via-background to-card dark:from-[#161616] dark:via-[#111111] dark:to-[#090909] border border-border/80 group cursor-pointer shadow-lg"
          onClick={() => openLightbox(primaryIdx)}
        >
          {/* Studio Accent Lighting */}
          <div className="absolute top-0 inset-x-0 h-40 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.2),transparent_70%)] pointer-events-none z-10" />
          <div className="absolute bottom-6 inset-x-6 h-16 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.14),transparent_70%)] pointer-events-none blur-md z-10" />

          <AnimatePresence mode="wait">
            <motion.img
              key={images[primaryIdx]}
              src={images[primaryIdx]}
              alt={`${productName} Primary View`}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </AnimatePresence>

          {/* Badges */}
          <div className="absolute top-3.5 left-3.5 flex items-center gap-2 z-20">
            {discount > 0 && (
              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-rose-500 text-white font-bold shadow-sm">
                -{discount}% OFF
              </span>
            )}
          </div>

          <button
            type="button"
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-background/80 hover:bg-background border border-border/60 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-105 z-20 backdrop-blur-md shadow-sm"
            title="Inspect fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3.5 left-3.5 bg-background/85 backdrop-blur-md rounded-full px-3.5 py-1 text-[9.5px] font-mono text-foreground border border-border/60 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity z-20 shadow-xs">
            <Eye className="w-3.5 h-3.5 text-primary" /> Silhouette View
          </div>
        </div>

        {/* Secondary Detail View */}
        <div
          className="relative h-[420px] sm:h-[540px] md:h-[580px] rounded-3xl overflow-hidden bg-gradient-to-b from-card via-background to-card dark:from-[#161616] dark:via-[#111111] dark:to-[#090909] border border-border/80 group cursor-pointer hidden sm:block shadow-lg"
          onClick={() => openLightbox(secondaryIdx)}
        >
          {/* Studio Accent Lighting */}
          <div className="absolute top-0 inset-x-0 h-40 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.2),transparent_70%)] pointer-events-none z-10" />
          <div className="absolute bottom-6 inset-x-6 h-16 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.14),transparent_70%)] pointer-events-none blur-md z-10" />

          <AnimatePresence mode="wait">
            <motion.img
              key={images[secondaryIdx]}
              src={images[secondaryIdx]}
              alt={`${productName} Detail View`}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </AnimatePresence>

          <button
            type="button"
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-background/80 hover:bg-background border border-border/60 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-105 z-20 backdrop-blur-md shadow-sm"
            title="Inspect fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3.5 left-3.5 bg-background/85 backdrop-blur-md rounded-full px-3.5 py-1 text-[9.5px] font-mono text-foreground border border-border/60 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity z-20 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Detail & Craft
          </div>
        </div>
      </div>

      {/* ── THUMBNAIL STRIP & CONTROLS ── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {images.map((img, idx) => {
            const isSelected = idx === primaryIdx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setPrimaryIdx(idx)}
                className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border cursor-pointer transition-all shrink-0 ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/40 opacity-100 scale-102"
                    : "border-border/60 opacity-60 hover:opacity-100"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                {isSelected && (
                  <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setPrimaryIdx((p) => (p - 1 + total) % total)}
            className="w-8 h-8 rounded-full border border-border/60 bg-background/80 hover:bg-background text-foreground flex items-center justify-center transition-all cursor-pointer hover:scale-105"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setPrimaryIdx((p) => (p + 1) % total)}
            className="w-8 h-8 rounded-full border border-border/60 bg-background/80 hover:bg-background text-foreground flex items-center justify-center transition-all cursor-pointer hover:scale-105"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <ProductLightboxModal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={images}
        startIndex={lightboxIdx}
        productName={productName}
      />
    </div>
  );
}
