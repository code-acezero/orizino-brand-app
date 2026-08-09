"use client";
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ZoomIn, Minus, Plus } from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";
import { useIsMobile } from "@/hooks/use-mobile";

interface ImageGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
  layout?: "minimal" | "premium" | "editorial";
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, productName, discount = 0, layout = "premium" }) => {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pinchScale, setPinchScale] = useState(1);
  const [pinchOrigin, setPinchOrigin] = useState({ x: 50, y: 50 });
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const isSwiping = useRef(false);
  const lightboxImgRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Magnifier Controls
  const [lensSize, setLensSize] = useState(300); // Default 300px, max 600px
  const [zoomPower, setZoomPower] = useState(2.5); // Default 2.5x, max 5x
  const lensRef = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const [lensVisible, setLensVisible] = useState(false);

  // Store current refs for smooth hardware-accelerated movement
  const lensSizeRef = useRef(300);
  const zoomPowerRef = useRef(2.5);
  lensSizeRef.current = lensSize;
  zoomPowerRef.current = zoomPower;

  // Ultra-fast GPU composite-only move (uses translate3d to avoid DOM reflow lag)
  const moveLens = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = lensRef.current;
    const img = imgRef.current;
    if (!el || !img) return;
    const rect = img.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    const xPct = Math.max(0, Math.min(100, (xPx / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, (yPx / rect.height) * 100));
    const sz = lensSizeRef.current;
    const zp = zoomPowerRef.current;
    const half = sz / 2;

    // Use GPU hardware acceleration via translate3d (zero layout reflow)
    el.style.transform = `translate3d(${xPx - half}px, ${yPx - half}px, 0)`;
    el.style.width = `${sz}px`;
    el.style.height = `${sz}px`;
    el.style.backgroundSize = `${rect.width * zp}px ${rect.height * zp}px`;
    el.style.backgroundPosition = `${xPct}% ${yPct}%`;
  }, []);

  const navigate = (dir: 1 | -1) => {
    setSelected((p) => (p + dir + images.length) % images.length);
    setPinchScale(1);
  };

  // Lightbox touch handlers
  const getTouchDist = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isSwiping.current = false;
      pinchStartDist.current = getTouchDist(e.touches);
      pinchStartScale.current = pinchScale;
      const rect = lightboxImgRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setPinchOrigin({
          x: ((cx - rect.left) / rect.width) * 100,
          y: ((cy - rect.top) / rect.height) * 100,
        });
      }
    } else if (e.touches.length === 1 && pinchScale <= 1) {
      swipeStartX.current = e.touches[0].clientX;
      swipeStartY.current = e.touches[0].clientY;
      isSwiping.current = true;
    }
  }, [pinchScale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isSwiping.current = false;
      const dist = getTouchDist(e.touches);
      const newScale = Math.min(5, Math.max(1, pinchStartScale.current * (dist / pinchStartDist.current)));
      setPinchScale(newScale);
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (pinchScale < 1.1) setPinchScale(1);
    if (isSwiping.current && e.changedTouches.length === 1 && pinchScale <= 1) {
      const dx = e.changedTouches[0].clientX - swipeStartX.current;
      const dy = e.changedTouches[0].clientY - swipeStartY.current;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        navigate(dx < 0 ? 1 : -1);
      }
    }
    isSwiping.current = false;
  }, [pinchScale, images.length]);

  const isMinimal = layout === "minimal";
  const isEditorial = layout === "editorial";

  return (
    <>
      <div className={`space-y-3 ${isEditorial ? "md:col-span-3" : ""}`}>
        {/* Main image with zoom */}
        <div
          ref={imgRef}
          className={`relative overflow-hidden group ${
            isMobile ? "cursor-default" : "cursor-crosshair"
          } ${isMinimal ? "rounded-2xl" : isEditorial ? "rounded-none aspect-[4/3]" : "rounded-3xl aspect-square bg-card border border-border/50"}`}
          {...(!isMobile ? {
            onWheel: (e: React.WheelEvent) => {
              if (!hovering.current) return;
              e.preventDefault();
              setLensSize((s) => Math.min(600, Math.max(300, s + (e.deltaY < 0 ? 30 : -30))));
            },
          } : {})}
          onMouseMove={!isMobile ? moveLens : undefined}
          onMouseEnter={!isMobile ? () => { hovering.current = true; setLensVisible(true); } : undefined}
          onMouseLeave={!isMobile ? () => { hovering.current = false; setLensVisible(false); } : undefined}
          onClick={() => setLightboxOpen(true)}
        >
          <ImageWithFallback
            key={selected}
            src={images[selected]}
            alt={productName}
            className="w-full h-full object-cover absolute inset-0 select-none pointer-events-none"
            draggable={false}
          />

          {/* Magnifying Glass Lens — Accent Color Frame + GPU Translate3d */}
          {!isMobile && (
            <div
              ref={lensRef}
              aria-hidden
              style={{
                position: "absolute",
                pointerEvents: "none",
                zIndex: 20,
                top: 0,
                left: 0,
                borderRadius: "50%",
                backgroundImage: `url(${images[selected]})`,
                backgroundRepeat: "no-repeat",
                width: lensSize,
                height: lensSize,
                opacity: lensVisible ? 1 : 0,
                transition: "opacity 0.12s ease",
                willChange: "transform, opacity",
                // Theme accent color frame border + glow shadow
                border: "3px solid hsl(var(--primary))",
                outline: "1px solid rgba(0,0,0,0.4)",
                boxShadow: "0 0 16px hsl(var(--primary) / 0.4), 0 8px 32px rgba(0,0,0,0.5)",
              }}
            />
          )}

          {/* Lens controls overlay — Size & Zoom level changer */}
          {!isMobile && lensVisible && (
            <div className="absolute top-3 right-3 z-30 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {/* Circle Size Control (- 300 +) */}
              <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-md border border-primary/30 rounded-full px-3 py-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => setLensSize((s) => Math.max(300, s - 30))}
                  disabled={lensSize <= 300}
                  className="p-0.5 text-foreground/70 hover:text-primary disabled:opacity-30 transition-colors"
                  title="Decrease lens size"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-semibold text-foreground min-w-[36px] text-center">
                  {lensSize}px
                </span>
                <button
                  type="button"
                  onClick={() => setLensSize((s) => Math.min(600, s + 30))}
                  disabled={lensSize >= 600}
                  className="p-0.5 text-foreground/70 hover:text-primary disabled:opacity-30 transition-colors"
                  title="Increase lens size"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Zoom Level Slider (1.5x -> 5.0x) */}
              <div className="flex items-center gap-2 bg-background/90 backdrop-blur-md border border-primary/30 rounded-full px-3 py-1.5 shadow-lg">
                <ZoomIn className="w-3.5 h-3.5 text-primary shrink-0" />
                <input
                  type="range"
                  min="1.5"
                  max="5.0"
                  step="0.25"
                  value={zoomPower}
                  onChange={(e) => setZoomPower(parseFloat(e.target.value))}
                  className="w-16 h-1.5 accent-primary bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
                <span className="text-xs font-bold text-primary min-w-[32px] text-center">
                  {zoomPower}x
                </span>
              </div>
            </div>
          )}

          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 text-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); navigate(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 text-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {discount > 0 && (
            <span className={`absolute top-4 left-4 text-sm font-semibold py-1 px-4 ${
              isMinimal ? "bg-foreground text-background rounded-md" : "btn-pill bg-destructive text-destructive-foreground"
            }`}>
              -{discount}%
            </span>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <span className="absolute bottom-4 left-4 bg-background/80 rounded-full px-3 py-1 text-xs text-foreground font-medium border border-border/40">
              {selected + 1} / {images.length}
            </span>
          )}
        </div>

        {/* Thumbnail Carousel */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => { setSelected(idx); setPinchScale(1); }}
                className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  selected === idx ? "border-primary ring-2 ring-primary/30" : "border-border/60 opacity-70 hover:opacity-100"
                }`}
              >
                <ImageWithFallback src={img} alt={`${productName} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => { setLightboxOpen(false); setPinchScale(1); }}
          >
            <button
              onClick={() => { setLightboxOpen(false); setPinchScale(1); }}
              className="absolute top-4 right-4 text-white hover:text-primary p-2 z-50 rounded-full bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>

            <div
              ref={lightboxImgRef}
              className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center overflow-hidden touch-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={images[selected]}
                alt={productName}
                className="max-w-full max-h-full object-contain transition-transform duration-100"
                style={{
                  transform: `scale(${pinchScale})`,
                  transformOrigin: `${pinchOrigin.x}% ${pinchOrigin.y}%`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageGallery;
// code:4ce0
