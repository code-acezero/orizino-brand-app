"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

interface ProductLightboxModalProps {
  open: boolean;
  onClose: () => void;
  images: string[];
  productName: string;
  startIndex?: number;
}

export const ProductLightboxModal: React.FC<ProductLightboxModalProps> = ({
  open,
  onClose,
  images,
  productName,
  startIndex = 0,
}) => {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(startIndex);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open, startIndex]);

  // Lock body scroll while lightbox is active
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      setSelected((prev) => (prev + dir + images.length) % images.length);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    },
    [images.length]
  );

  // Keyboard navigation & zoom shortcuts
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z + 0.5));
      if (e.key === "-") setZoom((z) => Math.max(1, z - 0.5));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, navigate]);

  // Touch Swipe for mobile navigation
  const touchStart = useRef({ x: 0, y: 0 });
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoom > 1) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      navigate(dx < 0 ? 1 : -1);
    }
  };

  // Pan / Drag handlers when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      dragOrigin.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragOrigin.current.x,
        y: e.clientY - dragOrigin.current.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const toggleZoom = () => {
    if (zoom === 1) {
      setZoom(2.2);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 select-none pointer-events-auto"
          onClick={onClose}
          style={{ isolation: "isolate" }}
        >
          {/* Top Bar Controls — Perfectly fitted for mobile and desktop viewports */}
          <div
            className="flex items-center justify-between w-full max-w-6xl mx-auto z-50 pointer-events-auto gap-2 px-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Image Counter (and Product Title only on desktop) */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono font-bold text-zinc-200 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shrink-0">
                {selected + 1} / {images.length}
              </span>
              <span className="hidden sm:inline-block text-xs sm:text-sm font-bold text-white tracking-wide truncate max-w-xs sm:max-w-md">
                {productName}
              </span>
            </div>

            {/* Right: Zoom Controls & Close Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Zoom pill */}
              <div className="flex items-center gap-0.5 sm:gap-1 bg-white/10 backdrop-blur-md rounded-xl p-0.5 sm:p-1 border border-white/15">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                  disabled={zoom <= 1}
                  className="p-1 sm:p-1.5 text-white/80 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleZoom}
                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-mono font-bold text-white hover:text-primary rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Toggle Zoom / Fit"
                >
                  {Math.round(zoom * 100)}%
                </button>

                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
                  disabled={zoom >= 4}
                  className="p-1 sm:p-1.5 text-white/80 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Zoom In (+)"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {zoom > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                    }}
                    className="p-1 sm:p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Reset Zoom"
                    aria-label="Reset zoom"
                  >
                    <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1.5 sm:p-2 text-white hover:text-white bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl transition-all cursor-pointer shadow-lg"
                title="Close (Esc)"
                aria-label="Close image modal"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Central High-Resolution Viewport — Fully Fitted for Mobile Viewports */}
          <div
            className={`relative flex-1 min-h-0 flex items-center justify-center my-auto w-full overflow-hidden ${
              zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={toggleZoom}
            onClick={(e) => {
              e.stopPropagation();
              if (zoom === 1) toggleZoom();
            }}
          >
            <motion.img
              key={selected}
              src={images[selected]}
              alt={productName}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{
                opacity: 1,
                scale: zoom,
                x: pan.x,
                y: pan.y,
              }}
              exit={{ opacity: 0 }}
              transition={{
                scale: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="max-h-[62dvh] sm:max-h-[75vh] max-w-[94vw] sm:max-w-[85vw] object-contain select-none pointer-events-none"
              draggable={false}
            />

            {/* Next / Prev Navigation — Clean transparent arrows */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(-1);
                  }}
                  className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-3 text-white/80 hover:text-white transition-all cursor-pointer bg-transparent border-0 outline-none hover:scale-110 active:scale-95"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow-xl" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(1);
                  }}
                  className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-3 text-white/80 hover:text-white transition-all cursor-pointer bg-transparent border-0 outline-none hover:scale-110 active:scale-95"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow-xl" strokeWidth={2} />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Navigation Bar */}
          {images.length > 1 && (
            <div
              className="flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto py-1 z-50 max-w-2xl mx-auto scrollbar-none pointer-events-auto shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => {
                const active = selected === idx;
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => {
                      setSelected(idx);
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                    }}
                    className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border transition-all cursor-pointer shrink-0 ${
                      active
                        ? "border-primary ring-2 ring-primary/60 scale-105 opacity-100"
                        : "border-white/20 opacity-40 hover:opacity-80"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ProductLightboxModal;
