"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ZoomableImage from "./ZoomableImage";
import { useIsMobile } from "@/hooks/use-mobile";

interface GridMosaicGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const GridMosaicGallery: React.FC<GridMosaicGalleryProps> = ({ images, productName, discount = 0 }) => {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const go = (dir: 1 | -1) => setLightboxIdx(i => i !== null ? (i + dir + images.length) % images.length : 0);

  // Layout patterns based on image count
  const getSpan = (idx: number, total: number) => {
    if (total <= 1) return "col-span-2 row-span-2";
    if (total === 2) return "col-span-1 row-span-2";
    if (total === 3) return idx === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1";
    if (total === 4) return idx === 0 ? "col-span-2 row-span-2" : idx === 3 ? "col-span-2 row-span-1" : "col-span-1 row-span-1";
    // 5+
    if (idx === 0) return "col-span-2 row-span-2";
    if (idx === 3) return "col-span-2 row-span-1";
    return "col-span-1 row-span-1";
  };

  const displayed = images.slice(0, 5);
  const remaining = images.length - 5;

  return (
    <>
      <div className={`grid grid-cols-3 gap-2 ${isMobile ? "grid-rows-[repeat(3,minmax(100px,1fr))]" : "grid-rows-[repeat(3,minmax(120px,180px))]"} rounded-2xl overflow-hidden`}>
        {displayed.map((img, idx) => (
          <motion.div
            key={idx}
            className={`relative overflow-hidden cursor-pointer group ${getSpan(idx, images.length)}`}
            onClick={() => setLightboxIdx(idx)}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <img src={img} alt={`${productName} ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            {idx === 0 && discount > 0 && (
              <span className="absolute top-3 left-3 z-10 text-sm font-semibold py-1 px-4 rounded-full bg-destructive text-destructive-foreground">-{discount}%</span>
            )}
            {idx === 4 && remaining > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">+{remaining}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center" onClick={() => setLightboxIdx(null)}>
            <button className="absolute top-6 right-6 glass rounded-full p-3 text-foreground hover:text-primary z-10" onClick={() => setLightboxIdx(null)}>✕</button>
            {images.length > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); go(-1); }} className="absolute left-6 top-1/2 -translate-y-1/2 glass rounded-full p-3 z-10"><ChevronLeft className="w-6 h-6 text-foreground" /></button>
                <button onClick={e => { e.stopPropagation(); go(1); }} className="absolute right-6 top-1/2 -translate-y-1/2 glass rounded-full p-3 z-10"><ChevronRight className="w-6 h-6 text-foreground" /></button>
              </>
            )}
            <motion.div key={lightboxIdx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <ZoomableImage src={images[lightboxIdx]} alt={productName} className="w-full h-full max-w-[90vw] max-h-[85vh]" zoomScale={3} />
            </motion.div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setLightboxIdx(i); }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === lightboxIdx ? "bg-primary scale-125" : "bg-muted-foreground/30"}`} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GridMosaicGallery;
// code:4ce0
