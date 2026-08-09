"use client";
import * as React from "react";
import "./loaders.css";

export interface SectionLoaderProps {
  size?: number;
  tone?: "red" | "platinum";
  className?: string;
  testid?: string;
}

const SectionLoader: React.FC<SectionLoaderProps> = ({
  size = 56,
  tone = "red",
  className = "",
  testid = "section-loader",
}) => {
  const core = tone === "red" ? "#ff1a2e" : "#e8e8e8";
  const ring = tone === "red" ? "#b00006" : "#adadad";
  const ringAlt = tone === "red" ? "#8d0003" : "#4d4d4d";
  const uid = `sl-${tone}`;

  return (
    <div
      data-testid={testid}
      data-tone={tone}
      className={`ldr-root ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-core`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor={core} stopOpacity="1" />
            <stop offset="55%" stopColor={core} stopOpacity="0.6" />
            <stop offset="100%" stopColor={core} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ring} />
            <stop offset="50%" stopColor="#fefefe" />
            <stop offset="100%" stopColor={ringAlt} />
          </linearGradient>
        </defs>

        <g className="ldr-lite-ring" style={{ transformOrigin: "30px 30px" }}>
          <circle
            cx="30"
            cy="30"
            r="25"
            fill="none"
            stroke={`url(#${uid}-ring)`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 10 18 8 22 14"
            opacity="0.95"
          />
        </g>

        <g className="ldr-lite-ring-rev" style={{ transformOrigin: "30px 30px" }}>
          <circle
            cx="30"
            cy="30"
            r="17"
            fill="none"
            stroke={ring}
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="3 9 14 6"
            opacity="0.6"
          />
        </g>

      </svg>
    </div>
  );
};

export default SectionLoader;
// code:4ce0
