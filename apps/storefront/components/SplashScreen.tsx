"use client";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface SplashScreenProps {
  visible: boolean;
}

/**
 * Minimal & Clean Cinematic App Splash Loader.
 * Features a blank screen with a large brand title watermark in the center,
 * then smoothly fades out.
 */
const SplashScreen: React.FC<SplashScreenProps> = ({ visible }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cinematic-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background select-none pointer-events-none"
        >
          {/* Centered Large Brand Title Watermark */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="flex flex-col items-center justify-center space-y-3"
          >
            {/* SVG Logo Mark (Subtle) */}
            <img
              src="/orizino-logo.svg"
              alt="Orizino"
              className="w-12 h-12 sm:w-16 sm:h-16 opacity-30 dark:opacity-40 object-contain mb-1"
              style={{ filter: "brightness(0) invert(1)" }}
            />

            {/* Large Brand Title Watermark */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black font-display tracking-[0.25em] uppercase text-foreground/20 dark:text-foreground/25">
              ORIZINO
            </h1>

            <p className="text-[10px] sm:text-xs font-mono font-medium tracking-[0.3em] uppercase text-foreground/30">
              EST. 2026 • STREETWEAR
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
