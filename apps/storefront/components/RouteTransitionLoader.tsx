"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/**
 * RouteTransitionLoader — Page switching loader.
 * Displays a small loader with the SVG logo file featuring an animated fill loop.
 * The logo is dark in light mode and pure white in dark mode.
 */
const RouteTransitionLoader: React.FC = () => {
  const pathname = usePathname();
  const [loading, setLoading] = React.useState(false);
  const prevPathRef = React.useRef(pathname);

  React.useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setLoading(true);
      prevPathRef.current = pathname;
      const timer = setTimeout(() => setLoading(false), 450);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/70 backdrop-blur-sm pointer-events-none select-none"
        >
          <div className="flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-3xl bg-card/90 border border-border/50 shadow-xl">
            {/* Small SVG Logo Fill Loop Animation */}
            <div className="relative w-10 h-10 flex items-center justify-center">
              {/* Outer Pulse Accent Halo */}
              <div className="absolute inset-0 rounded-full bg-foreground/10 animate-ping" />
              
              {/* SVG Logo Mark — White in Dark Mode, Dark in Light Mode */}
              <motion.img
                src="/orizino-logo.svg"
                alt="Loading..."
                animate={{
                  scale: [0.9, 1.1, 0.9],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-8 h-8 object-contain relative z-10 brightness-0 dark:invert"
              />
            </div>
            <span className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-foreground">
              ORIZINO
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RouteTransitionLoader;
