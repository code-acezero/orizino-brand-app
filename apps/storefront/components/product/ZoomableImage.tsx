"use client";
import React, { useRef, useCallback, useEffect } from "react";

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Magnifying glass zoom.
 * Position written synchronously on every mousemove — no RAF, no spring, no delay.
 * Default circle: 300px. Scroll to resize up to 600px.
 * Zoom: 250% (2.5×).
 */
const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, alt, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lensRef      = useRef<HTMLDivElement>(null);
  const sizeRef      = useRef(300);
  const hovering     = useRef(false);

  const ZOOM   = 2.5;
  const MIN_SZ = 300;
  const MAX_SZ = 600;

  /** Write lens position/size synchronously — no batching, no RAF */
  const moveLens = (xPct: number, yPct: number) => {
    const el = lensRef.current;
    if (!el) return;
    const sz   = sizeRef.current;
    const half = sz / 2;
    el.style.width              = `${sz}px`;
    el.style.height             = `${sz}px`;
    el.style.left               = `calc(${xPct}% - ${half}px)`;
    el.style.top                = `calc(${yPct}% - ${half}px)`;
    el.style.backgroundSize     = `${ZOOM * 100}%`;
    el.style.backgroundPosition = `${xPct}% ${yPct}%`;
  };

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    const xPct = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width)  * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - r.top)  / r.height) * 100));
    moveLens(xPct, yPct);
  }, []);

  const showLens = useCallback(() => {
    hovering.current = true;
    const el = lensRef.current;
    if (el) el.style.opacity = "1";
  }, []);

  const hideLens = useCallback(() => {
    hovering.current    = false;
    sizeRef.current     = MIN_SZ;
    const el = lensRef.current;
    if (el) el.style.opacity = "0";
  }, []);

  // Scroll to resize — 300px → 600px
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      if (!hovering.current) return;
      e.preventDefault();
      sizeRef.current = Math.min(MAX_SZ, Math.max(MIN_SZ,
        sizeRef.current + (e.deltaY > 0 ? -30 : 30)
      ));
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden cursor-crosshair ${className}`}
      onMouseMove={onMouseMove}
      onMouseEnter={showLens}
      onMouseLeave={hideLens}
    >
      {/* Base image — never moves */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover select-none pointer-events-none"
        draggable={false}
      />

      {/*
        Lens — ALL styles set via JS, no CSS transitions except opacity.
        This means position never interpolates — it's always exactly under the cursor.
      */}
      <div
        ref={lensRef}
        aria-hidden
        style={{
          position:          "absolute",
          pointerEvents:     "none",
          zIndex:            30,
          borderRadius:      "50%",
          backgroundImage:   `url(${src})`,
          backgroundRepeat:  "no-repeat",
          width:             MIN_SZ,
          height:            MIN_SZ,
          top:               0,
          left:              0,
          backgroundSize:    `${ZOOM * 100}%`,
          backgroundPosition:"50% 50%",
          opacity:           0,
          // ONLY opacity transitions — position is always instant
          transition:        "opacity 0.12s ease",
          willChange:        "top, left, opacity",
          // Clean opaque glass ring
          border:            "3px solid rgba(255,255,255,0.92)",
          outline:           "1.5px solid rgba(0,0,0,0.12)",
          boxShadow:         "0 6px 24px rgba(0,0,0,0.28)",
        }}
      />
    </div>
  );
};

export default ZoomableImage;
// code:4ce0
