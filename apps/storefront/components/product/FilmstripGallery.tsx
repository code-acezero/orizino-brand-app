"use client";
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ZoomableImage from "./ZoomableImage";
import { useIsMobile } from "@/hooks/use-mobile";

interface FilmstripGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const FilmstripGallery: React.FC<FilmstripGalleryProps> = ({ images, productName, discount = 0 }) => {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const go = useCallback((dir: 1 | -1) => setActive(i => (i + dir + images.length) % images.length), [images.length]);

  return (
    <>
      <div className="space-y-3">
        {/* Main film frame */}
        <div className="relative overflow-hidden rounded-2xl bg-black cursor-pointer" style={{ aspectRatio: isMobile ? "3/4" : "16/10" }} onClick={() => setLightbox(true)}>
          {/* Film sprocket holes */}
          <div className="absolute top-0 bottom-0 left-0 w-6 z-10 flex flex-col justify-around items-center bg-black/80">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-3 h-3 rounded-sm bg-foreground/10" />)}
          </div>
          <div className="absolute top-0 bottom-0 right-0 w-6 z-10 flex flex-col justify-around items-center bg-black/80">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-3 h-3 rounded-sm bg-foreground/10" />)}
          </div>

          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={images[active]}
              alt={productName}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover px-6"
            />
          </AnimatePresence>

          {discount > 0 && (
            <span className="absolute top-4 left-10 z-20 text-sm font-semibold py-1 px-4 rounded-full bg-destructive text-destructive-foreground">-{discount}%</span>
          )}

          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); go(-1); }} className="absolute left-8 top-1/2 -translate-y-1/2 z-20 glass rounded-full p-2 text-foreground hover:text-primary opacity-0 hover:opacity-100 transition-opacity">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={e => { e.stopPropagation(); go(1); }} className="absolute right-8 top-1/2 -translate-y-1/2 z-20 glass rounded-full p-2 text-foreground hover:text-primary opacity-0 hover:opacity-100 transition-opacity">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 glass rounded-full px-3 py-1 text-xs text-foreground font-mono">
            FRAME {String(active + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
          </div>
        </div>

        {/* Filmstrip thumbnails */}
        <div ref={stripRef} className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`shrink-0 relative overflow-hidden transition-all duration-200 ${isMobile ? "w-14 h-10" : "w-20 h-14"} rounded-md border-2 ${
                i === active ? "border-primary ring-1 ring-primary/30" : "border-transparent opacity-50 hover:opacity-100 grayscale hover:grayscale-0"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center" onClick={() => setLightbox(false)}>
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

export default FilmstripGallery;
// code:4ce0
