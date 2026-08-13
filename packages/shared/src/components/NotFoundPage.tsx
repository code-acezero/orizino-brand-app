"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Home, Search, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "../lib/router-compat";

export interface NotFoundPageProps {
  homeTo: string;
  browseTo: string;
  browseLabel?: string;
  extraTo?: string;
  extraLabel?: string;
}

/** Real Cursor-Tracking Eyes using Trigonometric Vector Math & Theme Accent Color */
function CursorTrackingEyes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;

      const deltaX = clientX - eyeCenterX;
      const deltaY = clientY - eyeCenterY;

      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.hypot(deltaX, deltaY);

      // Max pupil displacement in pixels
      const maxDisplacement = 12;
      const moveDist = Math.min(distance * 0.08, maxDisplacement);

      setPupilOffset({
        x: Math.cos(angle) * moveDist,
        y: Math.sin(angle) * moveDist,
      });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative flex items-center justify-center my-3">
      {/* Dark round container */}
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 bg-zinc-900 dark:bg-zinc-950 rounded-full border border-border/40 shadow-2xl flex items-center justify-center overflow-hidden">
        
        {/* Eye pair */}
        <div className="flex gap-4 sm:gap-5 z-10 pt-2">
          {[0, 1].map((idx) => (
            <div
              key={idx}
              className="w-9 h-12 sm:w-11 sm:h-15 rounded-full bg-white relative flex items-center justify-center shadow-md overflow-hidden"
            >
              {/* Pupil tracking ball — uses site theme accent color (bg-primary) */}
              <div
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary relative flex items-center justify-center transition-transform duration-75 ease-out shadow-xs"
                style={{
                  transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
                }}
              >
                {/* Catchlight reflection */}
                <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-white/90" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage({
  homeTo = "/",
  browseTo = "/inventory",
  browseLabel = "Browse Shop",
}: NotFoundPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[85vh] bg-background flex flex-col justify-start items-center text-center px-4 pt-4 sm:pt-8 pb-12">
      <main className="w-full max-w-lg mx-auto space-y-4">
        
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* Minimal 404 Display */}
          <h1 className="text-6xl sm:text-7xl font-extrabold font-display tracking-tight text-foreground">
            404
          </h1>

          {/* Centered Arched Doorway with Theme-Accent Cursor-Tracking Eyes */}
          <CursorTrackingEyes />

          {/* Clean Subtext */}
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
              Oh Crumbs!
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Looks like someone escaped with the page you were looking for.
            </p>
          </div>

          {/* Clean Minimal Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to={homeTo as any}
              className="w-full sm:w-auto h-11 px-7 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs inline-flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xs"
            >
              <Home className="w-4 h-4" /> Go Home
            </Link>

            <Link
              to={browseTo as any}
              className="w-full sm:w-auto h-11 px-7 rounded-xl border border-border/60 bg-background text-foreground font-semibold text-xs inline-flex items-center justify-center gap-2 hover:bg-secondary/60 active:scale-95 transition-all shadow-xs"
            >
              <Search className="w-4 h-4" /> {browseLabel}
            </Link>
          </div>

          {/* Minimal Back Button */}
          <div className="pt-1">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Previous Page
            </button>
          </div>

        </motion.div>

      </main>
    </div>
  );
}
