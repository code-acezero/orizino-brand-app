"use client";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import ProductLightboxModal from "@/components/product/ProductLightboxModal";

interface ImmersiveZoomGalleryProps {
  images: string[];
  productName?: string;
  discount?: number;
}

export default function ImmersiveZoomGallery({
  images = [],
  productName = "Product",
  discount = 0,
}: ImmersiveZoomGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) return null;
  const total = images.length;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  return (
    <div className="space-y-3 w-full select-none">
      {/* ── INTERACTIVE MACRO LENS VIEWPORT ── */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        onClick={() => setLightboxOpen(true)}
        className="relative h-[420px] sm:h-[500px] w-full rounded-3xl overflow-hidden bg-black/90 border border-border/70 group cursor-crosshair"
      >
        {/* Base Image */}
        <AnimatePresence mode="wait">
          <motion.img
            key={images[activeIdx]}
            src={images[activeIdx]}
            alt={`${productName} Macro View`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isHovered ? "opacity-30" : "opacity-100"
            }`}
          />
        </AnimatePresence>

        {/* Dynamic Zoomed Layer on Hover */}
        {isHovered && (
          <div
            className="absolute inset-0 pointer-events-none bg-no-repeat transition-all duration-75"
            style={{
              backgroundImage: `url(${images[activeIdx]})`,
              backgroundPosition: `${mousePos.x}% ${mousePos.y}%`,
              backgroundSize: "260%",
            }}
          />
        )}

        {/* Floating Interactive Loupe Reticle */}
        {isHovered && (
          <motion.div
            className="absolute w-28 h-28 rounded-full border-2 border-primary/80 shadow-2xl pointer-events-none -translate-x-1/2 -translate-y-1/2 overflow-hidden backdrop-brightness-110"
            style={{
              left: `${mousePos.x}%`,
              top: `${mousePos.y}%`,
            }}
          >
            <div className="absolute inset-0 rounded-full ring-1 ring-white/50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
          </motion.div>
        )}

        {/* Header Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          <span className="text-[9px] font-mono px-3 py-1 rounded-full bg-black/70 text-white backdrop-blur-md uppercase tracking-wider border border-white/15 flex items-center gap-1.5">
            <ZoomIn className="w-3 h-3 text-primary" /> Macro Lens 2.5x
          </span>
          {discount > 0 && (
            <span className="text-[9px] font-mono px-2.5 py-1 rounded-full bg-rose-500 text-white font-bold">
              -{discount}%
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxOpen(true);
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all hover:scale-105 hover:bg-black/90 cursor-pointer z-10"
          title="Inspect Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Bottom Helper pill */}
        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md rounded-full px-3 py-1 text-[9.5px] font-mono text-white/90 border border-white/15 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity z-10">
          <ZoomIn className="w-3 h-3 text-primary" /> Hover to explore micro-textures
        </div>

        {/* Arrows on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveIdx((prev) => (prev - 1 + total) % total);
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:scale-105"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveIdx((prev) => (prev + 1) % total);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:scale-105"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── THUMBNAIL DOCK ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {images.map((img, idx) => {
          const isSelected = idx === activeIdx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border cursor-pointer transition-all shrink-0 ${
                isSelected
                  ? "border-primary ring-2 ring-primary/40 opacity-100 scale-102"
                  : "border-border/60 opacity-50 hover:opacity-100"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
              {isSelected && (
                <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </button>
          );
        })}
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
