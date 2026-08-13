"use client";
import React from "react";
import { motion } from "framer-motion";
import { useEffectivePerf } from "@/hooks/use-perf-settings";

/** Volumetric light beams for cinematic hero backgrounds. */
const LightBeams: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { lightweightMode } = useEffectivePerf();
  if (lightweightMode) return null;
  return (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute top-[-20%] left-1/2 origin-top"
        style={{
          width: 320 + i * 80,
          height: "140%",
          marginLeft: -(160 + i * 40),
          rotate: -18 + i * 14,
          background: `linear-gradient(180deg, hsl(var(--primary)/${0.14 - i * 0.03}) 0%, transparent 65%)`,
          filter: "blur(40px)",
          mixBlendMode: "screen",
        }}
        animate={{ opacity: [0.35, 0.7, 0.35], scaleY: [1, 1.08, 1] }}
        transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
      />
    ))}
    {/* Horizontal scan */}
    <motion.div
      className="absolute left-0 right-0 h-[2px]"
      style={{
        top: "55%",
        background: "linear-gradient(90deg, transparent, hsl(var(--primary)/0.5), transparent)",
        filter: "blur(2px)",
      }}
      animate={{ y: [-200, 200, -200], opacity: [0, 0.7, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
  );
};

export default React.memo(LightBeams);
// code:4ce0
