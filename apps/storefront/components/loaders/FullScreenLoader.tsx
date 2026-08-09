"use client";
import * as React from "react";
import LogoMark from "./LogoMark";
import "./loaders.css";

export type FullScreenLoaderVariant = "liquid" | "stroke" | "shimmer" | "cloud";

export interface FullScreenLoaderProps {
  variant?: FullScreenLoaderVariant;
  size?: number;
  withBackdrop?: boolean;
  show?: boolean;
  className?: string;
  testid?: string;
}

const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  variant = "liquid",
  size = 240,
  withBackdrop = false,
  show = true,
  className = "",
  testid = "fullscreen-loader",
}) => {
  if (!show) return null;

  return (
    <div
      data-testid={testid}
      data-variant={variant}
      className={`ldr-fullscreen ${withBackdrop ? "ldr-backdrop" : ""} ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="ldr-stage" style={{ width: size, height: size }}>
        <div className="ldr-halo" />
        {variant === "liquid" && <LiquidVariant size={size} uid="fs-liquid" />}
        {variant === "stroke" && <LogoMark size={size} variant="outline" uid="fs-stroke" />}
        {variant === "shimmer" && <LogoMark size={size} variant="solid" uid="fs-shimmer" showShimmer />}
        {variant === "cloud" && <CloudVariant size={size} uid="fs-cloud" />}
        {withBackdrop && <div className="ldr-grain" />}
      </div>
    </div>
  );
};

/* ---------------- Liquid Fill — real liquid feel ---------------- */
export const LiquidVariant: React.FC<{ size: number; uid: string }> = ({ size, uid }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    {/* Ghost outline of the full logo */}
    <div style={{ position: "absolute", inset: 0, opacity: 0.22 }}>
      <LogoMark size={size} variant="outline" uid={`${uid}-ghost`} />
    </div>

    <svg
      width={size}
      height={size}
      viewBox="0 0 177.89 177.89"
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff5a6e" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#d40015" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#4a0002" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${uid}-surface`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe4e8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ff1a2e" stopOpacity="0" />
        </linearGradient>

        {/* Gooey filter merges droplets with the body */}
        <filter id={`${uid}-goo`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>

        {/* Combined clip = entire logo silhouette */}
        <clipPath id={`${uid}-clip-logo`}>
          <path d="M94.31,71.82l24.46-26.75-57.16-1.64-7.82-.4c3.96-1.29,7.4-1.9,11.35-2.56l57.36-9.59,46.58-7.6-7.5,7.42c-27.24,26.3-54.38,52.23-82.57,77.95l11.18-32.48,4.11-4.34Z" />
          <path d="M112.57,141.03 L73.26,124.27 L95.31,117.93 L166.02,100.22 L112.57,141.03 Z" />
          <path d="M87.11,143.39 L11.67,147.48 L40.98,119.31 L72.79,88.94 L57.53,129.94 L87.11,143.39 Z" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-clip-logo)`}>
        {/* Rising body of water with gooey droplets merging at the surface */}
        <g className="ldr-liquid-level" filter={`url(#${uid}-goo)`}>
          {/* Body fill below the waves */}
          <rect x="-200" y="20" width="600" height="400" fill={`url(#${uid}-water)`} />

          {/* Wave layer A (front) */}
          <path
            className="ldr-liquid-wave-a"
            d="M -300,20 Q -250,8 -200,20 T -100,20 T 0,20 T 100,20 T 200,20 T 300,20 T 400,20 T 500,20 V 60 H -300 Z"
            fill={`url(#${uid}-water)`}
          />
          {/* Wave layer B (back, offset) */}
          <path
            className="ldr-liquid-wave-b"
            d="M -300,24 Q -250,14 -200,24 T -100,24 T 0,24 T 100,24 T 200,24 T 300,24 T 400,24 T 500,24 V 60 H -300 Z"
            fill={`url(#${uid}-water)`}
            opacity="0.7"
          />

          {/* Rising droplets that merge into the surface via the goo filter */}
          <circle className="ldr-liquid-drop ldr-liquid-drop-1" cx="55" cy="18" r="3.5" fill={`url(#${uid}-water)`} />
          <circle className="ldr-liquid-drop ldr-liquid-drop-2" cx="95" cy="18" r="2.6" fill={`url(#${uid}-water)`} />
          <circle className="ldr-liquid-drop ldr-liquid-drop-3" cx="130" cy="18" r="3" fill={`url(#${uid}-water)`} />
        </g>

        {/* Surface highlight band — sits on top of the wave crest */}
        <g className="ldr-liquid-level">
          <rect
            x="-200"
            y="14"
            width="600"
            height="8"
            fill={`url(#${uid}-surface)`}
            opacity="0.85"
          />
        </g>
      </g>
    </svg>
  </div>
);

/* ---------------- Cloud Loader — fluffy cloud forming the logo ---------------- */
export const CloudVariant: React.FC<{ size: number; uid: string }> = ({ size, uid }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    {/* Ghost outline of the full logo */}
    <div style={{ position: "absolute", inset: 0, opacity: 0.22 }}>
      <LogoMark size={size} variant="outline" uid={`${uid}-ghost`} />
    </div>

    <svg
      width={size}
      height={size}
      viewBox="0 0 177.89 177.89"
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${uid}-cloud-body`} cx="0.4" cy="0.3" r="0.85">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="60%" stopColor="#e9edf5" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#9aa3b8" stopOpacity="0.95" />
        </radialGradient>
        <radialGradient id={`${uid}-cloud-shadow`} cx="0.5" cy="0.9" r="0.6">
          <stop offset="0%" stopColor="#1a0608" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-cloud-bloom`} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#ff6b78" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ff1a2e" stopOpacity="0" />
        </radialGradient>

        {/* Gooey merge — fuses puffs into a fluffy mass */}
        <filter id={`${uid}-cloud-goo`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
          />
        </filter>

        <linearGradient id={`${uid}-drop`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6b78" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#b00006" stopOpacity="1" />
        </linearGradient>

        {/* Clip to the logo silhouette */}
        <clipPath id={`${uid}-cloud-clip`}>
          <path d="M94.31,71.82l24.46-26.75-57.16-1.64-7.82-.4c3.96-1.29,7.4-1.9,11.35-2.56l57.36-9.59,46.58-7.6-7.5,7.42c-27.24,26.3-54.38,52.23-82.57,77.95l11.18-32.48,4.11-4.34Z" />
          <path d="M112.57,141.03 L73.26,124.27 L95.31,117.93 L166.02,100.22 L112.57,141.03 Z" />
          <path d="M87.11,143.39 L11.67,147.48 L40.98,119.31 L72.79,88.94 L57.53,129.94 L87.11,143.39 Z" />
        </clipPath>
      </defs>

      {/* Subtle red bloom behind */}
      <ellipse cx="89" cy="89" rx="70" ry="60" fill={`url(#${uid}-cloud-bloom)`} />

      {/* Cloud filling the logo shape */}
      <g clipPath={`url(#${uid}-cloud-clip)`}>
        {/* Cloud body — densely-packed puffs that cover the whole logo silhouette */}
        <g filter={`url(#${uid}-cloud-goo)`} className="ldr-cloud-puff-group">
          <circle className="ldr-cloud-puff ldr-cloud-puff-1" cx="50"  cy="60"  r="22" fill={`url(#${uid}-cloud-body)`} />
          <circle className="ldr-cloud-puff ldr-cloud-puff-2" cx="90"  cy="48"  r="26" fill={`url(#${uid}-cloud-body)`} />
          <circle className="ldr-cloud-puff ldr-cloud-puff-3" cx="130" cy="60"  r="22" fill={`url(#${uid}-cloud-body)`} />
          <circle className="ldr-cloud-puff ldr-cloud-puff-4" cx="60"  cy="100" r="26" fill={`url(#${uid}-cloud-body)`} />
          <circle className="ldr-cloud-puff ldr-cloud-puff-5" cx="100" cy="100" r="28" fill={`url(#${uid}-cloud-body)`} />
          <circle className="ldr-cloud-puff ldr-cloud-puff-6" cx="140" cy="105" r="22" fill={`url(#${uid}-cloud-body)`} />
          <circle className="ldr-cloud-puff ldr-cloud-puff-7" cx="40"  cy="135" r="22" fill={`url(#${uid}-cloud-body)`} />
          <circle className="ldr-cloud-puff ldr-cloud-puff-8" cx="80"  cy="140" r="24" fill={`url(#${uid}-cloud-body)`} />
          <circle className="ldr-cloud-puff ldr-cloud-puff-9" cx="125" cy="138" r="22" fill={`url(#${uid}-cloud-body)`} />
        </g>
        {/* Soft inner shadow at the bottom */}
        <ellipse cx="89" cy="160" rx="80" ry="14" fill={`url(#${uid}-cloud-shadow)`} />
      </g>

      {/* Drifting wisps outside the logo */}
      <g className="ldr-cloud-wisp ldr-cloud-wisp-a">
        <ellipse cx="20" cy="50" rx="12" ry="4" fill="#fff" opacity="0.55" />
      </g>
      <g className="ldr-cloud-wisp ldr-cloud-wisp-b">
        <ellipse cx="158" cy="40" rx="10" ry="3.5" fill="#fff" opacity="0.45" />
      </g>

      {/* Falling rain drops below the logo */}
      <g>
        <path className="ldr-cloud-rain ldr-cloud-rain-1" d="M55,150 q-2.5,7 0,12 q2.5,-5 0,-12 Z" fill={`url(#${uid}-drop)`} />
        <path className="ldr-cloud-rain ldr-cloud-rain-2" d="M80,150 q-2.5,7 0,12 q2.5,-5 0,-12 Z" fill={`url(#${uid}-drop)`} />
        <path className="ldr-cloud-rain ldr-cloud-rain-3" d="M105,150 q-2.5,7 0,12 q2.5,-5 0,-12 Z" fill={`url(#${uid}-drop)`} />
        <path className="ldr-cloud-rain ldr-cloud-rain-4" d="M125,150 q-2.5,7 0,12 q2.5,-5 0,-12 Z" fill={`url(#${uid}-drop)`} />
      </g>
    </svg>
  </div>
);

export default FullScreenLoader;
// code:4ce0
