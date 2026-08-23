"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Minus,
  Plus,
  Maximize2,
} from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";
import { useIsMobile } from "@/hooks/use-mobile";
import { useImageDominantColor } from "@/hooks/use-image-dominant-color";

interface ImageGalleryProps {
  images: string[];
  productName: string;
  discount?: number;
  layout?: "minimal" | "premium" | "editorial";
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  productName,
  discount = 0,
  layout = "premium",
}) => {
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const activeImage = images[selected] || images[0] || "";
  const dominantColor = useImageDominantColor(activeImage);

  const isMobile = useIsMobile();
  const imgRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const [lensVisible, setLensVisible] = useState(false);

  // 5-second inactivity auto-hide for gallery arrows (reappears on screen tap / hover / interaction)
  const [arrowsVisible, setArrowsVisible] = useState(true);
  const arrowTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showArrowsTemporarily = useCallback(() => {
    setArrowsVisible(true);
    if (arrowTimerRef.current) clearTimeout(arrowTimerRef.current);
    arrowTimerRef.current = setTimeout(() => {
      setArrowsVisible(false);
    }, 5000);
  }, []);

  useEffect(() => {
    showArrowsTemporarily();
    return () => {
      if (arrowTimerRef.current) clearTimeout(arrowTimerRef.current);
    };
  }, [showArrowsTemporarily]);

  // Loupe Configuration
  const [lensSize, setLensSize] = useState(300);
  const [zoomPower, setZoomPower] = useState(2.5);
  const lensSizeRef = useRef(300);
  const zoomPowerRef = useRef(2.5);
  lensSizeRef.current = lensSize;
  zoomPowerRef.current = zoomPower;

  // GPU translate3d lens positioning
  const moveLens = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = lensRef.current;
    const img = imgRef.current;
    if (!el || !img) return;
    const rect = img.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    const xPct = Math.max(0, Math.min(100, (xPx / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, (yPx / rect.height) * 100));

    el.style.transform = `translate3d(calc(${xPx}px - 50%), calc(${yPx}px - 50%), 0)`;
    el.style.backgroundPosition = `${xPct}% ${yPct}%`;
  }, []);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      setSelected((p) => (p + dir + images.length) % images.length);
      setLightboxZoom(1);
      setPanPosition({ x: 0, y: 0 });
    },
    [images.length]
  );

  // Keyboard navigation for lightbox & gallery
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === "ArrowLeft") navigate(-1);
        if (e.key === "ArrowRight") navigate(1);
        if (e.key === "Escape") setLightboxOpen(false);
        if (e.key === "+" || e.key === "=") setLightboxZoom((z) => Math.min(4, z + 0.5));
        if (e.key === "-") setLightboxZoom((z) => Math.max(1, z - 0.5));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, navigate]);

  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) {
      if (diff < 0) setSelected((s) => (s + 1) % images.length);
      else setSelected((s) => (s - 1 + images.length) % images.length);
    }
  };

  // Lightbox Pan & Zoom Handlers
  const handleLightboxMouseDown = (e: React.MouseEvent) => {
    if (lightboxZoom > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
    }
  };

  const handleLightboxMouseMove = (e: React.MouseEvent) => {
    if (isDragging && lightboxZoom > 1) {
      setPanPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleLightboxMouseUp = () => {
    setIsDragging(false);
  };

  const toggleZoom = () => {
    if (lightboxZoom === 1) {
      setLightboxZoom(2.2);
    } else {
      setLightboxZoom(1);
      setPanPosition({ x: 0, y: 0 });
    }
  };

  const isMinimal = layout === "minimal";
  const isEditorial = layout === "editorial";

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className={`space-y-3 ${isEditorial ? "md:col-span-3" : ""}`}>
        {/* Main Stage Frame */}
        <div
          ref={imgRef}
          className={`relative overflow-hidden group select-none transition-all duration-700 ${
            isMobile ? "cursor-default" : "cursor-crosshair"
          } ${
            isMinimal
              ? "rounded-2xl bg-secondary/15 border border-border/40"
              : isEditorial
              ? "rounded-none aspect-[4/3] bg-card border border-border/40"
              : "rounded-3xl aspect-[1/1] sm:aspect-[4/5] border border-border/80 shadow-none"
          }`}
          style={{
            background: `radial-gradient(ellipse 120% 85% at 50% 15%, ${dominantColor.rgba(0.22)} 0%, ${dominantColor.rgba(0.08)} 50%, var(--card) 100%)`,
          }}
          {...(!isMobile
            ? {
                onWheel: (e: React.WheelEvent) => {
                  if (!hovering.current) return;
                  e.preventDefault();
                  setLensSize((s) => Math.min(600, Math.max(260, s + (e.deltaY < 0 ? 30 : -30))));
                },
              }
            : {})}
          onMouseMove={!isMobile ? moveLens : undefined}
          onMouseEnter={
            !isMobile
              ? () => {
                  hovering.current = true;
                  setLensVisible(true);
                }
              : undefined
          }
          onMouseLeave={
            !isMobile
              ? () => {
                  hovering.current = false;
                  setLensVisible(false);
                }
              : undefined
          }
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            setLightboxOpen(true);
            setLightboxZoom(1);
            setPanPosition({ x: 0, y: 0 });
          }}
        >
          {/* Studio Accent Lighting Following Image Hue */}
          <div
            className="absolute top-0 inset-x-0 h-44 pointer-events-none z-10 blur-xl transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at top, ${dominantColor.rgba(0.35)}, transparent 70%)`,
            }}
          />
          <div
            className="absolute bottom-6 inset-x-6 h-16 rounded-full pointer-events-none blur-xl z-10 transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at center, ${dominantColor.rgba(0.25)}, transparent 70%)`,
            }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full absolute inset-0 flex items-center justify-center"
            >
              <ImageWithFallback
                src={images[selected]}
                alt={productName}
                className="w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>

          {/* Desktop Hardware-Accelerated Loupe */}
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
                transition: "opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "transform, opacity",
                border: "2px solid hsl(var(--primary))",
                outline: "1px solid rgba(255, 255, 255, 0.4)",
              }}
            />
          )}

          {/* Loupe Controls Pill */}
          {!isMobile && lensVisible && (
            <div
              className="absolute top-3 right-3 z-30 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-md border border-border/80 rounded-full px-2.5 py-1">
                <button
                  type="button"
                  onClick={() => setLensSize((s) => Math.max(260, s - 30))}
                  disabled={lensSize <= 260}
                  className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors cursor-pointer"
                  title="Decrease lens size"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-[11px] font-mono font-semibold text-foreground min-w-[34px] text-center">
                  {lensSize}px
                </span>
                <button
                  type="button"
                  onClick={() => setLensSize((s) => Math.min(600, s + 30))}
                  disabled={lensSize >= 600}
                  className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors cursor-pointer"
                  title="Increase lens size"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-md border border-border/80 rounded-full px-2.5 py-1">
                <ZoomIn className="w-3 h-3 text-primary shrink-0" />
                <input
                  type="range"
                  min="1.5"
                  max="4.5"
                  step="0.25"
                  value={zoomPower}
                  onChange={(e) => setZoomPower(parseFloat(e.target.value))}
                  className="w-14 h-1 accent-primary bg-secondary rounded-full appearance-none cursor-pointer"
                />
                <span className="text-[11px] font-mono font-bold text-primary min-w-[28px] text-center">
                  {zoomPower}x
                </span>
              </div>
            </div>
          )}

          {/* Navigation Arrows — Smoothly visible on interaction/tap, auto-hides after 5s of inactivity */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showArrowsTemporarily();
                  navigate(-1);
                }}
                className={`absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 z-20 p-2 text-foreground/85 hover:text-primary transition-all duration-300 ${
                  arrowsVisible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                } cursor-pointer bg-background/50 sm:bg-background/40 hover:bg-background/80 backdrop-blur-md rounded-full border border-border/40 shadow-none outline-none`}
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5 sm:w-7 sm:h-7 drop-shadow-none" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showArrowsTemporarily();
                  navigate(1);
                }}
                className={`absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 z-20 p-2 text-foreground/85 hover:text-primary transition-all duration-300 ${
                  arrowsVisible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                } cursor-pointer bg-background/50 sm:bg-background/40 hover:bg-background/80 backdrop-blur-md rounded-full border border-border/40 shadow-none outline-none`}
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5 sm:w-7 sm:h-7 drop-shadow-none" strokeWidth={2} />
              </button>
            </>
          )}

          {/* Discount Badge */}
          {discount > 0 && (
            <span className="absolute top-3.5 left-3.5 z-10 text-[11px] font-bold py-0.5 px-2.5 rounded-full bg-rose-500 text-white font-mono tracking-tight shadow-none">
              -{discount}%
            </span>
          )}

          {/* Image Counter & Fullscreen Icon — Guaranteed Tiny Micro Dots */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            {images.length > 1 && (
              <div className="flex items-center gap-1.5 bg-background/85 backdrop-blur-md rounded-full px-2.5 py-1 border border-border/50 shadow-none pointer-events-auto">
                <div className="flex items-center gap-1">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(i);
                      }}
                      className="p-0.5 !min-w-0 !min-h-0 bg-transparent border-0 outline-none flex items-center justify-center cursor-pointer"
                      aria-label={`Go to image ${i + 1}`}
                    >
                      <span
                        className={`block rounded-full transition-all duration-300 pointer-events-none ${
                          i === selected ? "w-3.5 h-1 bg-primary" : "w-1.5 h-1 bg-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-[9.5px] font-mono font-bold text-foreground/90 pl-1 border-l border-border/50 leading-none">
                  {selected + 1}/{images.length}
                </span>
              </div>
            )}
            <span className="ml-auto bg-background/85 backdrop-blur-md rounded-full p-2 text-foreground border border-border/50 transition-opacity pointer-events-auto cursor-pointer hover:bg-background shadow-none">
              <Maximize2 className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Thumbnail Carousel */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
            {images.map((img, idx) => {
              const active = selected === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelected(idx);
                    setLightboxZoom(1);
                  }}
                  className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    active
                      ? "border-primary ring-1 ring-primary/40 opacity-100 scale-102"
                      : "border-border/60 opacity-60 hover:opacity-100"
                  }`}
                >
                  <ImageWithFallback
                    src={img}
                    alt={`${productName} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── LUXURY HIGH-PRECISION FULLSCREEN LIGHTBOX (MOBILE-OPTIMIZED FIT) ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-2.5 sm:p-6"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Top Toolbar */}
            <div
              className="flex items-center justify-between w-full z-10 max-w-6xl mx-auto shrink-0 pb-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate max-w-[160px] sm:max-w-md">
                  {productName}
                </span>
                <span className="text-[10px] sm:text-[10.5px] font-mono text-zinc-400 shrink-0">
                  ({selected + 1}/{images.length})
                </span>
              </div>

              {/* Zoom & Close Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center gap-0.5 sm:gap-1 bg-white/10 backdrop-blur-md rounded-xl p-0.5 sm:p-1 border border-white/15">
                  <button
                    type="button"
                    onClick={() => setLightboxZoom((z) => Math.max(1, z - 0.5))}
                    disabled={lightboxZoom <= 1}
                    className="p-1 sm:p-1.5 text-white/80 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleZoom}
                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-mono font-bold text-white hover:text-primary rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Toggle Fit / Zoom"
                  >
                    {Math.round(lightboxZoom * 100)}%
                  </button>

                  <button
                    type="button"
                    onClick={() => setLightboxZoom((z) => Math.min(4, z + 0.5))}
                    disabled={lightboxZoom >= 4}
                    className="p-1 sm:p-1.5 text-white/80 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {lightboxZoom > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxZoom(1);
                        setPanPosition({ x: 0, y: 0 });
                      }}
                      className="p-1 sm:p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="p-1.5 sm:p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-all cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Central High-Resolution Viewport — Fully Fitted for Mobile Screens */}
            <div
              className={`relative flex-1 min-h-0 flex items-center justify-center my-auto w-full overflow-hidden ${
                lightboxZoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
              }`}
              onMouseDown={handleLightboxMouseDown}
              onMouseMove={handleLightboxMouseMove}
              onMouseUp={handleLightboxMouseUp}
              onDoubleClick={toggleZoom}
              onClick={(e) => {
                e.stopPropagation();
                if (lightboxZoom === 1) toggleZoom();
              }}
            >
              <motion.img
                key={selected}
                src={images[selected]}
                alt={productName}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  scale: lightboxZoom,
                  x: panPosition.x,
                  y: panPosition.y,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  scale: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="max-h-[62dvh] sm:max-h-[75vh] max-w-[94vw] sm:max-w-[85vw] object-contain select-none pointer-events-none"
                draggable={false}
              />

              {/* Next / Prev Navigation — Transparent clean arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(-1);
                    }}
                    className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 text-white/80 hover:text-white transition-all cursor-pointer bg-transparent border-0 outline-none hover:scale-110"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-none" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(1);
                    }}
                    className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 text-white/80 hover:text-white transition-all cursor-pointer bg-transparent border-0 outline-none hover:scale-110"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-none" strokeWidth={2} />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Thumbnails Navigation Bar */}
            {images.length > 1 && (
              <div
                className="flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto py-1 z-10 max-w-2xl mx-auto scrollbar-none shrink-0"
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
                        setLightboxZoom(1);
                        setPanPosition({ x: 0, y: 0 });
                      }}
                      className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border transition-all cursor-pointer shrink-0 ${
                        active
                          ? "border-primary ring-1 ring-primary/50 scale-105 opacity-100"
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
    </>
  );
};

export default ImageGallery;
