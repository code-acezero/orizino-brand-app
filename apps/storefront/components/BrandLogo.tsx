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
  className = "",
  style,
}) => {
  const isCustomLogo = Boolean(
    logoUrl &&
    logoUrl.trim() !== "" &&
    !logoUrl.endsWith("/orizino-logo.svg") &&
    !logoUrl.endsWith("/orizino.svg")
  );

  const hasExplicitSize = Boolean(style?.height || style?.width || className?.includes("h-"));
  const defaultSizeClass = hasExplicitSize ? "" : "h-6 sm:h-7 w-8 sm:w-10";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 aspect-[539/565] ${defaultSizeClass} ${className}`.trim()}
      style={style}
    >
      {isCustomLogo ? (
        <span
          className="w-full h-full block transition-colors duration-300"
          style={{
            backgroundColor: "hsl(var(--foreground))",
            maskImage: `url("${logoUrl}")`,
            WebkitMaskImage: `url("${logoUrl}")`,
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
      ) : (
        <svg
          viewBox="0 0 539.27 565.14"
          className="w-full h-full overflow-visible fill-current text-foreground transition-colors duration-300"
          style={{ color: "hsl(var(--foreground))" }}
          xmlns="http://www.w3.org/2000/svg"
          aria-label={alt}
          role="img"
        >
          <path d="M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z" />
          <path d="M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z" />
          <path d="M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z" />
        </svg>
      )}
    </div>
  );
};

export default BrandLogo;
