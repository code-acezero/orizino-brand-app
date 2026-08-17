"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const PATHS = [
  "M11.31,303.01l10.42,10.61,102.73,114.11c-16.27-34.27-34.28-66.2-53.79-98.11L0,219.52l41.25-42.82,104.13-107.09C169.3,45.99,192.23,22.22,218.19,0l-71.11,101.28L55.74,232.06c26,65.57,52.95,130.16,81.76,194.32l12.16,25.25,71.16,112.86L52.01,416.82l-40.7-113.8Z",
  "M510.24,351.74l-23.18,64.87-169.05,148.54,27.52-44.45,45.28-70.91,30.12-65.82,16.7-38.98,46-113.02-81.21-116.77-25.93-36.85L321.38.16c14.41,11.93,26.61,24.47,40.1,37.05l86.76,87.48,77.26,80.22,13.77,14.47-52.64,81.42c-26.66,41.23-50.32,83.4-72.56,127.58l33.83-36.98,79.5-88.8-17.16,49.14Z",
  "M356.28,185.04l26.95,46.73-36.12,40.33-32.01,35.6-5.9,33.94-22.1,115.86-19.75,106.98-25.06-136.06-23.26-120.77-10.57-11.82-57.13-64.08,17.38-30.41,40.24-67.6c-.28,10.99,4.75,22.09,2.63,32.95l-18.99,63.2,44.02,68.95,9.75,55.81,20.97,113.31,20.22-107.91,10.47-61.52,44.22-68.68-19.37-63.68,2.55-32.17,30.86,51.02Z",
];

const BRAND = "ORIZINO";

export function OrizinoIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  const [isMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 768px), (pointer: coarse)").matches,
  );

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 2200),
      setTimeout(() => setPhase(3), 3300),
      setTimeout(() => setPhase(4), 5200),
      setTimeout(() => onDone(), 5900),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#040203] overflow-hidden pointer-events-none"
      initial={{ opacity: 1 }}
      animate={{
        opacity: phase >= 4 ? 0 : 1,
        filter: isMobile ? "blur(0px)" : phase >= 4 ? "blur(18px)" : "blur(0px)",
      }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="absolute w-[70vmax] h-[70vmax] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(140,22,30,0.5), rgba(74,15,18,0.15) 40%, transparent 70%)",
        }}
        initial={{ opacity: 0.3, scale: 0.7 }}
        animate={{ opacity: phase >= 2 ? 0.9 : 0.4, scale: phase >= 2 ? 1.1 : 0.85 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />

      <div className="relative flex flex-col items-center gap-8">
        <svg
          viewBox="0 0 539.27 565.14"
          className="w-[min(54vmin,380px)] h-[min(54vmin,380px)]"
          aria-hidden
        >
          <defs>
            <linearGradient id="orizinoFill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#B81E30" />
              <stop offset="55%" stopColor="#8C1620" />
              <stop offset="100%" stopColor="#FF6B7A" />
            </linearGradient>
            <clipPath id="liquidClip">
              <motion.rect
                x={0}
                width={540}
                height={566}
                initial={{ y: 566 }}
                animate={{ y: phase >= 2 ? 0 : 566 }}
                transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
              />
            </clipPath>
          </defs>

          {/* Single anticlockwise sweep into place */}
          <motion.g
            initial={{ rotate: 540, scale: 0.35, opacity: 0 }}
            animate={{
              rotate: phase >= 1 ? 0 : 540,
              scale: phase >= 1 ? 1 : 0.35,
              opacity: phase >= 1 ? 1 : 0,
            }}
            transition={{
              rotate: { duration: 2.0, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 2.0, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.5 },
            }}
            style={{ transformOrigin: "269.6px 282.5px", transformBox: "fill-box" }}
          >
            {PATHS.map((d, i) => (
              <g key={i}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke="#F5F5F5"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: phase >= 1 ? 1 : 0,
                    opacity: phase >= 1 ? (phase >= 3 ? 0 : 0.95) : 0,
                  }}
                  transition={{
                    pathLength: { duration: 1.7, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.5 },
                  }}
                />
                <motion.path
                  d={d}
                  fill="#F5F5F5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: phase >= 2 ? 0.9 : 0 }}
                  transition={{ duration: 0.5, delay: 0.05 * i }}
                />
                <path d={d} fill="url(#orizinoFill)" clipPath="url(#liquidClip)" />
              </g>
            ))}
          </motion.g>
        </svg>

        {/* Brand title wordmark */}
        <motion.div
          className="text-center font-display tracking-[0.35em] text-2xl sm:text-3xl font-black uppercase text-white"
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: phase >= 3 ? 1 : 0,
            y: phase >= 3 ? 0 : 12,
          }}
          transition={{
            opacity: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
            y: { duration: 1, ease: [0.22, 1, 0.36, 1] },
          }}
          style={{ filter: "drop-shadow(0 0 12px rgba(180,30,45,0.55))" }}
        >
          {BRAND}
        </motion.div>
      </div>
    </motion.div>
  );
}
