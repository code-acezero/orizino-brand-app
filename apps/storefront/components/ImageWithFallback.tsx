"use client";
import React, { useState, useEffect, forwardRef } from "react";
import SkeletonWatermark from "@/components/skeletons/SkeletonWatermark";

export interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  className?: string;
  containerClassName?: string;
}

/**
 * Image component that falls back to a sleek ORIZINO brand watermark shadow
 * whenever the image URL is missing, invalid, or fails to load.
 */
const ImageWithFallback = forwardRef<HTMLImageElement, ImageWithFallbackProps>(({
  src,
  alt = "",
  fallbackText,
  className = "",
  containerClassName = "",
  onError,
  ...props
}, ref) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  const isInvalid = !src || src.trim() === "" || src.includes("placeholder.png") || src.includes("placeholder.svg") || error;

  if (isInvalid) {
    return (
      <div className={`relative inset-0 w-full h-full bg-gradient-to-br from-[#3b0204] via-[#1a0102] to-[#0a0001] flex items-center justify-center p-4 overflow-hidden border border-red-950/40 shadow-inner ${containerClassName}`}>
        {/* Subtle ORIZINO shadow watermark */}
        <SkeletonWatermark size="md" />
      </div>
    );
  }

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        setError(true);
        if (onError) onError(e);
      }}
      {...props}
    />
  );
});

ImageWithFallback.displayName = "ImageWithFallback";
export default ImageWithFallback;
