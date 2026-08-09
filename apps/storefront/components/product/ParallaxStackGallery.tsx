"use client";
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import ZoomableImage from "./ZoomableImage";
import { useIsMobile } from "@/hooks/use-mobile";

interface ParallaxStackGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const ParallaxStackGallery: React.FC<ParallaxStackGalleryProps> = ({ images, productName, discount = 0 }) => {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 25 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY, isMobile]);

  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  const go = useCallback((dir: 1 | -1) => setActive(i => (i + dir + images.length) % images.length), [images.length]);

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-3xl cursor-pointer"
        style={{ height: isMobile ? "55vh" : "500px", perspective: "1000px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => setLightbox(true)}
        onTouchStart={e => { (containerRef.current as any).__tx = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - ((containerRef.current as any).__tx || 0);
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        {/* Stacked cards with parallax */}
        <motion.div
          className="absolute inset-0"
          style={isMobile ? {} : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        >
          {images.map((img, idx) => {
            const offset = idx - active;
            const absOffset = Math.abs(offset);
            if (absOffset > 3) return null;
            return (
              <motion.div
                key={idx}
                animate={{
                  scale: 1 - absOffset * 0.08,
                  y: offset * (isMobile ? -12 : -18),
                  z: -absOffset * 60,
                  opacity: absOffset > 2 ? 0 : 1 - absOffset * 0.25,
                }}
                transition={{ type: "spring", stiffness: 250, damping: 30 }}
                className="absolute inset-4 rounded-2xl overflow-hidden shadow-2xl"
                style={{ transformStyle: "preserve-3d", zIndex: images.length - absOffset }}
              >
                <img src={img} alt={`${productName} ${idx + 1}`} className="w-full h-full object-cover" />
                {absOffset > 0 && <div className="absolute inset-0 bg-black/20" />}
              </motion.div>
            );
          })}
        </motion.div>

        {discount > 0 && (
          <span className="absolute top-6 left-6 z-20 text-sm font-semibold py-1 px-4 rounded-full bg-destructive text-destructive-foreground">-{discount}%</span>
        )}

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-5">
          <button onClick={e => { e.stopPropagation(); go(-1); }} className="w-11 h-11 rounded-full glass flex items-center justify-center text-foreground hover:text-primary transition-all hover:scale-110">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-foreground/60 text-xs font-medium tracking-wider">{active + 1} / {images.length}</span>
          <button onClick={e => { e.stopPropagation(); go(1); }} className="w-11 h-11 rounded-full glass flex items-center justify-center text-foreground hover:text-primary transition-all hover:scale-110">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute top-6 right-6 z-20 glass rounded-full p-2 opacity-60"><ZoomIn className="w-4 h-4 text-foreground" /></div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center" onClick={() => setLightbox(false)}>
            <button className="absolute top-6 right-6 glass rounded-full p-3 text-foreground hover:text-primary z-10" onClick={() => setLightbox(false)}>✕</button>
            {images.length > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); go(-1); }} className="absolute left-6 top-1/2 -translate-y-1/2 glass rounded-full p-3 z-10"><ChevronLeft className="w-6 h-6 text-foreground" /></button>
                <button onClick={e => { e.stopPropagation(); go(1); }} className="absolute right-6 top-1/2 -translate-y-1/2 glass rounded-full p-3 z-10"><ChevronRight className="w-6 h-6 text-foreground" /></button>
              </>
            )}
            <motion.div key={active} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <ZoomableImage src={images[active]} alt={productName} className="w-full h-full max-w-[90vw] max-h-[85vh]" zoomScale={3} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ParallaxStackGallery;
// code:4ce0
