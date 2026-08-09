"use client";
import React from "react";

interface BrandLogoProps {
  logoUrl?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  logoUrl,
  alt = "Orizino",
  className = "h-6 sm:h-7 w-8 sm:w-10",
  style,
}) => {
  const activeUrl = logoUrl || "/orizino-logo.svg";

  return (
    <div className={`relative inline-flex items-center shrink-0 ${className}`} style={style}>
      {/* Theme adaptive SVG mask rendering Midnight Charcoal (#1E232A) in Light Mode and Cream Vanilla (#F3EAD8) in Dark Mode */}
      <span
        className="w-full h-full bg-[#1E232A] dark:bg-[#F3EAD8] transition-colors duration-300 block"
        style={{
          maskImage: `url("${activeUrl}")`,
          WebkitMaskImage: `url("${activeUrl}")`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
        role="img"
        aria-label={alt}
      />
      <img
        src={activeUrl}
        alt={alt}
        className="sr-only"
      />
    </div>
  );
};

export default BrandLogo;
