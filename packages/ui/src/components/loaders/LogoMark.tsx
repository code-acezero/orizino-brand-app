"use client";
import * as React from "react";

export type LogoMarkVariant = "solid" | "outline" | "clip";

export interface LogoMarkProps {
  size?: number;
  variant?: LogoMarkVariant;
  uid?: string;
  showShimmer?: boolean;
  className?: string;
  /** Color of the mark. Defaults to white. */
  color?: string;
}

/**
 * Orizino official brand mark — three sharp geometric shards.
 * viewBox: 0 0 539.27 565.14
 */
const PATH_LEFT =
  "M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z";
const PATH_RIGHT =
  "M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z";
const PATH_MIDDLE =
  "M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z";

const LogoMark: React.FC<LogoMarkProps> = ({
  size = 220,
  variant = "solid",
  uid = "ldr",
  showShimmer = false,
  className = "",
  color = "#ffffff",
}) => {
  const idShimmer = `${uid}-grad-shimmer`;
  const idClip = `${uid}-clip-all`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 539.27 565.14"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={idShimmer} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={idClip}>
          <path d={PATH_LEFT} />
          <path d={PATH_RIGHT} />
          <path d={PATH_MIDDLE} />
        </clipPath>
      </defs>

      {variant === "solid" && (
        <g fill={color}>
          <path d={PATH_LEFT} className="ldr-shape ldr-snap-top" />
          <path d={PATH_RIGHT} className="ldr-shape ldr-snap-right" />
          <path
            d={PATH_MIDDLE}
            className={showShimmer ? "ldr-shape ldr-snap-red" : "ldr-shape ldr-shape-pulse"}
          />
        </g>
      )}

      {variant === "outline" && (
        <g>
          {[PATH_LEFT, PATH_RIGHT, PATH_MIDDLE].map((d, i) => (
            <path
              key={`s-${i}`}
              d={d}
              fill="none"
              stroke={color}
              className="ldr-stroke-path"
              style={{ "--ldr-len": 800, animationDelay: `${i * 0.12}s` } as React.CSSProperties}
            />
          ))}
          {[PATH_LEFT, PATH_RIGHT, PATH_MIDDLE].map((d, i) => (
            <path
              key={`f-${i}`}
              d={d}
              fill={color}
              className="ldr-stroke-fill"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </g>
      )}

      {showShimmer && (
        <g clipPath={`url(#${idClip})`}>
          <rect
            x="-200"
            y="-50"
            width="140"
            height="500"
            fill={`url(#${idShimmer})`}
            className="ldr-shimmer-rect"
          />
        </g>
      )}
    </svg>
  );
};

export default LogoMark;
