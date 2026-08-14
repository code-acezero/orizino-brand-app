"use client";
import React, { useRef, useCallback, useEffect } from "react";

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  zoomScale?: number;
  objectFit?: "cover" | "contain";
}

/**
 * Luxury Magnifying Glass & High-Precision Zoom Engine.
 * Synchronous hardware-accelerated position mapping on mousemove (GPU-optimized).
 * Dynamic scroll-wheel lens sizing (300px -> 600px).
 */
const ZoomableImage: React.FC<ZoomableImageProps> = ({
  src,
  alt,
  className = "",
  zoomScale = 2.5,
  objectFit = "cover",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef(300);
  const hovering = useRef(false);

  const ZOOM = zoomScale;
  const MIN_SZ = 260;
  const MAX_SZ = 600;

  /** Write lens position/size synchronously without RAF delay */
  const moveLens = (xPct: number, yPct: number) => {
    const el = lensRef.current;
    if (!el) return;
    const sz = sizeRef.current;
    const half = sz / 2;
    el.style.width = `${sz}px`;
    el.style.height = `${sz}px`;
    el.style.left = `calc(${xPct}% - ${half}px)`;
    el.style.top = `calc(${yPct}% - ${half}px)`;
    el.style.backgroundSize = `${ZOOM * 100}%`;
    el.style.backgroundPosition = `${xPct}% ${yPct}%`;
  };

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    const xPct = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    moveLens(xPct, yPct);
  }, []);

  const showLens = useCallback(() => {
    hovering.current = true;
    const el = lensRef.current;
    if (el) el.style.opacity = "1";
  }, []);

  const hideLens = useCallback(() => {
    hovering.current = false;
    sizeRef.current = MIN_SZ;
    const el = lensRef.current;
    if (el) el.style.opacity = "0";
  }, []);

  // Scroll to resize lens diameter smoothly
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      if (!hovering.current) return;
      e.preventDefault();
      sizeRef.current = Math.min(
        MAX_SZ,
        Math.max(MIN_SZ, sizeRef.current + (e.deltaY > 0 ? -30 : 30))
      );
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
      {/* Base image */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full select-none pointer-events-none ${
          objectFit === "contain" ? "object-contain" : "object-cover"
        }`}
        draggable={false}
      />

      {/* Hardware-accelerated Precision Loupe */}
      <div
        ref={lensRef}
        aria-hidden
        style={{
          position: "absolute",
          pointerEvents: "none",
          zIndex: 30,
          borderRadius: "50%",
          backgroundImage: `url(${src})`,
          backgroundRepeat: "no-repeat",
          width: MIN_SZ,
          height: MIN_SZ,
          top: 0,
          left: 0,
          backgroundSize: `${ZOOM * 100}%`,
          backgroundPosition: "50% 50%",
          opacity: 0,
          transition: "opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "top, left, opacity",
          border: "2.5px solid hsl(var(--primary))",
          outline: "1px solid rgba(255, 255, 255, 0.3)",
          backdropFilter: "blur(2px)",
        }}
      />
    </div>
  );
};

export default ZoomableImage;
