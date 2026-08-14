"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import ProductLightboxModal from "./ProductLightboxModal";

interface GridMosaicGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
}

const GridMosaicGallery: React.FC<GridMosaicGalleryProps> = ({
  images,
  productName,
  discount = 0,
}) => {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const isMobile = useIsMobile();

  // Layout patterns based on total lookbook image count
  const getSpan = (idx: number, total: number) => {
    if (total <= 1) return "col-span-3 row-span-3";
    if (total === 2) return "col-span-3 sm:col-span-1 sm:row-span-2";
    if (total === 3) return idx === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1";
    if (total === 4)
      return idx === 0
        ? "col-span-2 row-span-2"
        : idx === 3
        ? "col-span-2 row-span-1"
        : "col-span-1 row-span-1";
    // 5+
    if (idx === 0) return "col-span-2 row-span-2";
    if (idx === 3) return "col-span-2 row-span-1";
    return "col-span-1 row-span-1";
  };

  const displayed = images.slice(0, 5);
  const remaining = images.length - 5;

  return (
    <>
      <div
        className={`grid grid-cols-3 gap-2 ${
          isMobile
            ? "grid-rows-[repeat(3,minmax(110px,1fr))]"
            : "grid-rows-[repeat(3,minmax(130px,180px))]"
        } rounded-3xl overflow-hidden border border-border/60 p-1 bg-card/60`}
      >
        {displayed.map((img, idx) => (
          <motion.div
            key={idx}
            className={`relative overflow-hidden rounded-2xl cursor-pointer group border border-border/40 ${getSpan(
              idx,
              images.length
            )}`}
            onClick={() => setLightboxIdx(idx)}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <img
              src={img}
              alt={`${productName} ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
              draggable={false}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            
            {idx === 0 && discount > 0 && (
              <span className="absolute top-3 left-3 z-10 text-xs font-bold py-0.5 px-2.5 rounded-full bg-rose-500 text-white font-mono">
                -{discount}%
              </span>
            )}
            
            {idx === 4 && remaining > 0 && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center">
                <span className="text-white text-xl font-mono font-bold">+{remaining}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <ProductLightboxModal
        open={lightboxIdx !== null}
        onClose={() => setLightboxIdx(null)}
        images={images}
        productName={productName}
        startIndex={lightboxIdx ?? 0}
      />
    </>
  );
};

export default GridMosaicGallery;
