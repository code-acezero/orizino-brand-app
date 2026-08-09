"use client";
import * as React from "react";
import LogoMark from "./LogoMark";
import "./loaders.css";

export interface SplashLoaderProps {
  size?: number;
  logoSize?: number;
  bubbleCount?: number;
  withBackdrop?: boolean;
  className?: string;
  testid?: string;
}

const SplashLoader: React.FC<SplashLoaderProps> = ({
  size = 320,
  logoSize = 150,
  bubbleCount = 14,
  withBackdrop = false,
  className = "",
  testid = "splash-loader",
}) => {
  const bubbles = React.useMemo(
    () =>
      Array.from({ length: bubbleCount }, (_, i) => ({
        id: i,
        s: 4 + Math.random() * 16,
        left: 8 + Math.random() * 84,
        bottom: 10 + Math.random() * 20,
        delay: -(Math.random() * 5).toFixed(2),
        dur: (3.4 + Math.random() * 3.6).toFixed(2),
        drift: (Math.random() * 40 - 20).toFixed(1),
      })),
    [bubbleCount],
  );

  const Inner = (
    <div
      className={`ldr-splash-stage ${className}`}
      style={{ width: size * 1.5, height: size * 1.6 }}
      data-testid={testid}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="ldr-mini-bubble"
          style={
            {
              width: b.s,
              height: b.s,
              left: `${b.left}%`,
              bottom: `${b.bottom}%`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
              "--drift": `${b.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}

      <div
        className="ldr-bubble-main"
        style={{ position: "relative", width: size, height: size }}
      >
        {/* Real water bubble — pure CSS sphere */}
        <div
          className="ldr-real-bubble ldr-bubble-wobble"
          style={{ width: size, height: size }}
        >
          {/* Outer rim refraction */}
          <div className="ldr-bubble-rim" />
          {/* Bottom caustic glow (light passing through) */}
          <div className="ldr-bubble-caustic" />
          {/* Specular highlight - top left */}
          <div className="ldr-bubble-specular" />
          {/* Tiny secondary highlight */}
          <div className="ldr-bubble-specular-mini" />
          {/* Red bloom from background */}
          <div className="ldr-bubble-bloom" />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.55))" }}>
            <LogoMark size={logoSize} variant="solid" uid="splash-logo" showShimmer />
          </div>
        </div>
      </div>
    </div>
  );

  if (withBackdrop) {
    return (
      <div className="ldr-fullscreen ldr-backdrop">
        {Inner}
        <div className="ldr-grain" />
      </div>
    );
  }
  return Inner;
};

export default SplashLoader;
