"use client";
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import ZoomableImage from "./ZoomableImage";
import { useIsMobile } from "@/hooks/use-mobile";

interface CoverflowGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const CoverflowGallery: React.FC<CoverflowGalleryProps> = ({ images, productName, discount = 0 }) => {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const isMobile = useIsMobile();
  const touchStartX = React.useRef(0);

  const go = useCallback((dir: 1 | -1) => setActive(i => (i + dir + images.length) % images.length), [images.length]);

  const getCardStyle = (idx: number) => {
    const diff = idx - active;
    const absDiff = Math.abs(diff);
    if (absDiff > 2) return { opacity: 0, scale: 0.6, x: diff * 200, z: -300, rotateY: 0 };
    return {
      opacity: absDiff > 1 ? 0.3 : absDiff === 1 ? 0.7 : 1,
      scale: absDiff === 0 ? 1 : 0.75,
      x: diff * (isMobile ? 120 : 180),
      z: absDiff === 0 ? 0 : -150,
      rotateY: diff * -25,
    };
  };

  return (
    <>
      <div
        className="relative w-full overflow-hidden rounded-3xl bg-secondary/5"
        style={{ height: isMobile ? "55vh" : "500px", perspective: "1200px" }}
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
          {images.map((img, idx) => {
            const style = getCardStyle(idx);
            return (
              <motion.div
                key={idx}
                animate={style}
                transition={{ type: "spring", stiffness: 200, damping: 28 }}
                className="absolute cursor-pointer rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  width: isMobile ? "65vw" : "320px",
                  height: isMobile ? "42vh" : "420px",
                  transformStyle: "preserve-3d",
                }}
                onClick={() => { if (idx === active) setLightbox(true); else setActive(idx); }}
              >
                <img src={img} alt={`${productName} ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                {idx === active && (
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <span className="text-white/70 text-xs tracking-wider uppercase">{idx + 1} / {images.length}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {discount > 0 && (
          <span className="absolute top-4 left-4 z-20 text-sm font-semibold py-1 px-4 rounded-full bg-destructive text-destructive-foreground">-{discount}%</span>
        )}

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-5">
          <button onClick={() => go(-1)} className="w-11 h-11 rounded-full glass flex items-center justify-center text-foreground hover:text-primary transition-all hover:scale-110">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} className={`w-2 h-2 rounded-full transition-all ${i === active ? "bg-primary scale-125" : "bg-muted-foreground/30"}`} />
            ))}
          </div>
          <button onClick={() => go(1)} className="w-11 h-11 rounded-full glass flex items-center justify-center text-foreground hover:text-primary transition-all hover:scale-110">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute top-4 right-4 z-20 glass rounded-full p-2 opacity-60"><ZoomIn className="w-4 h-4 text-foreground" /></div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center" onClick={() => setLightbox(false)}>
            <button className="absolute top-6 right-6 glass rounded-full p-3 text-foreground hover:text-primary z-10" onClick={() => setLightbox(false)}>✕</button>
            <motion.div key={active} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <ZoomableImage src={images[active]} alt={productName} className="w-full h-full max-w-[90vw] max-h-[85vh]" zoomScale={3} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CoverflowGallery;
// code:4ce0
