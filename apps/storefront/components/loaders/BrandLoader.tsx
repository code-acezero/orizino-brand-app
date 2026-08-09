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

const PATH_A =
  "M159.4,300.18c-42.48-5.86-83.72-13.44-124.86-24.27L0,266.03c2.08-.16,3.62.29,5.74.62,32.42,5.02,64.58,8.56,97.45,10.31,16.93.9,32.86.79,49.59-.25,15.42-.95,29.36-4.65,43.68-10.44,31.29-12.64,60.68-27.6,90.9-43.75l-63.47,55.02-111.91,97.11-14.3,11.95,67.7-69.91,6.46-7.81c1.79-2.16.23-5.44-2.23-6.29-3.28-1.14-6.1-1.84-10.21-2.41Z";
const PATH_B =
  "M162.86,215.76c-4.44-10.59-8.9-20.35-11.31-31.35-1.22-5.6.66-11.95,2.25-17.49,6.22-21.67,15.6-41.75,26.83-61.4,19.44-34.03,42.53-65.35,68.73-94.33l11.08-11.19c-21.8,30.39-41.05,61.59-56.65,95.5-15.7,34.15-29.39,70.89-29.38,108.74,0,17.44,3.87,33.3,8.07,50.49-8.19-12.43-13.87-25.25-19.62-38.97Z";
const PATH_C =
  "M241.78,152.43c11.45.83,22.18,1.27,33.07,4.1,5.55,1.44,10.36,5.99,14.58,9.91,16.52,15.35,30.18,32.79,42.63,51.7,21.55,32.73,39.05,67.49,53.04,103.96l4.97,14.94c-17.25-33.18-36.36-64.47-59.55-93.72-23.36-29.45-49.93-58.28-83.69-75.38-15.55-7.88-31.45-11.61-48.68-15.64,14.79-1.68,28.79-.94,43.63.13Z";

/**
 * BrandLoader — full brand spiral logo with stroke-draw → fill animation.
 * Draws each path from nothing → filled, then fades out and repeats.
 * Use for high-impact loading moments (splash, first-paint, etc.).
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
          viewBox="0 0 390.08 386.6"
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

          {[PATH_A, PATH_B, PATH_C].map((d, i) => (
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
// code:4ce0
