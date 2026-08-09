"use client";
import React from "react";

interface GradientMeshBgProps {
  variant?: "teal" | "copper" | "crimson" | "mixed";
  className?: string;
}

/**
 * Subtle animated gradient mesh background for sections.
 * Uses theme tokens for consistency.
 */
const GradientMeshBg: React.FC<GradientMeshBgProps> = ({ variant = "mixed", className = "" }) => {
  const configs = {
    teal: [
      { color: "192 78% 7%", x: "20%", y: "30%", size: "500px", delay: "0s" },
      { color: "190 40% 20%", x: "70%", y: "60%", size: "400px", delay: "-3s" },
    ],
    copper: [
      { color: "24 83% 35%", x: "30%", y: "40%", size: "450px", delay: "0s" },
      { color: "36 42% 58%", x: "75%", y: "20%", size: "350px", delay: "-2s" },
    ],
    crimson: [
      { color: "355 99% 38%", x: "50%", y: "30%", size: "500px", delay: "0s" },
      { color: "355 80% 30%", x: "20%", y: "70%", size: "350px", delay: "-4s" },
    ],
    mixed: [
      { color: "var(--primary)", x: "15%", y: "25%", size: "450px", delay: "0s" },
      { color: "var(--accent)", x: "75%", y: "60%", size: "400px", delay: "-3s" },
      { color: "192 60% 15%", x: "55%", y: "15%", size: "350px", delay: "-5s" },
    ],
  };

  const blobs = configs[variant] || configs.mixed;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true" suppressHydrationWarning>
      {blobs.map((blob, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: blob.size,
            height: blob.size,
            left: blob.x,
            top: blob.y,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, hsl(${blob.color} / 0.12), transparent 70%)`,
            filter: "blur(60px)",
            animation: `mesh-float 8s ease-in-out infinite alternate`,
            animationDelay: blob.delay,
          }}
          suppressHydrationWarning
        />
      ))}
    </div>
  );
};

export default React.memo(GradientMeshBg);
// code:4ce0
