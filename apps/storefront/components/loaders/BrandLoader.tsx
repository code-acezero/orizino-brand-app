"use client";
import * as React from "react";
import "./loaders.css";

export interface BrandLoaderProps {
  size?: number;
  withBackdrop?: boolean;
  show?: boolean;
  className?: string;
  testid?: string;
}

const PATH_LEFT =
  "M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z";
const PATH_RIGHT =
  "M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z";
const PATH_MIDDLE =
  "M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z";

/**
 * BrandLoader — official ORIZINO geometric brand mark with stroke-draw → fill animation.
 */
const BrandLoader: React.FC<BrandLoaderProps> = ({
  size = 220,
  withBackdrop = false,
  show = true,
  className = "",
  testid = "brand-loader",
}) => {
  if (!show) return null;

  return (
    <div
      data-testid={testid}
      className={`ldr-fullscreen ${withBackdrop ? "ldr-backdrop" : ""} ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="ldr-stage" style={{ width: size, height: size }}>
        <div className="ldr-halo" />

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 539.27 565.14"
          width={size}
          height={size}
          aria-hidden="true"
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="bl-g-white" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#d9d9d9" />
            </linearGradient>
          </defs>

          {[PATH_LEFT, PATH_RIGHT, PATH_MIDDLE].map((d, i) => (
            <React.Fragment key={i}>
              <path
                d={d}
                fill="none"
                stroke="url(#bl-g-white)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                className="ldr-brand-stroke"
                style={{ "--ldr-brand-delay": `${i * 0.12}s` } as React.CSSProperties}
              />
              <path
                d={d}
                fill="#ffffff"
                className="ldr-brand-fill"
                style={{ "--ldr-brand-delay": `${i * 0.12}s` } as React.CSSProperties}
              />
            </React.Fragment>
          ))}
        </svg>

        {withBackdrop && <div className="ldr-grain" />}
      </div>
    </div>
  );
};

export default BrandLoader;
