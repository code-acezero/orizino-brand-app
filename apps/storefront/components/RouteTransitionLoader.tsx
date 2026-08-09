"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/**
 * RouteTransitionLoader — Page switching loader.
 * Displays a small loader with the SVG logo file featuring an animated
 * fill loop with the theme accent color.
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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none select-none"
        >
          <div className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-card/80 border border-border/40 shadow-xl">
            {/* Small SVG Logo Fill Loop Animation */}
            <div className="relative w-10 h-10 flex items-center justify-center">
              {/* Outer Pulse Accent Halo */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              
              {/* SVG Logo Mark with Accent Fill Loop */}
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
                className="w-8 h-8 object-contain relative z-10 filter drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
              />
            </div>
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-primary">
              ORIZINO
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RouteTransitionLoader;
