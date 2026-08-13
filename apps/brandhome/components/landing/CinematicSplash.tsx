"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "orizino_splash";

/* ─── Letter-by-letter tagline ─────────────────────────────────── */
function TaglineChars({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span aria-label={text}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + i * 0.04, duration: 0.4, ease: "easeOut" }}
          className="inline-block"
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Core splash animation ─────────────────────────────────────── */
interface SplashProps {
  onComplete: () => void;
}
function CinematicSplash({ onComplete }: SplashProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 1600);
    const t2 = setTimeout(() => setPhase("out"), 3900);
    const t3 = setTimeout(onComplete, 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  const skip = () => {
    if (phase === "out") return;
    setPhase("out");
    setTimeout(onComplete, 680);
  };

  return (
    <AnimatePresence>
      {phase !== "out" ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#080808] select-none cursor-pointer overflow-hidden"
          onClick={skip}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeIn" }}
          aria-label="Click to enter"
        >
          {/* Ambient red glow — pulses behind the logo */}
          <motion.div
            className="absolute w-[520px] h-[520px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(355,99%,38%,0.18), transparent 65%)",
              top: "50%", left: "50%", x: "-50%", y: "-50%",
            }}
            animate={{ scale: [0.7, 1.35, 1.1], opacity: [0, 0.85, 0.5] }}
            transition={{ duration: 1.9, ease: "easeOut" }}
          />

          {/* Horizontal cinematic scan line */}
          <motion.div
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg,transparent,hsl(355,99%,38%,0.55),transparent)" }}
            initial={{ y: "-42vh", opacity: 0 }}
            animate={{ y: "42vh", opacity: [0, 0.9, 0] }}
            transition={{ delay: 0.25, duration: 1.25, ease: "easeInOut" }}
          />

          {/* Logo + tagline */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-8"
            initial={{ scale: 0.52, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.img
              src="/orizino-logo.svg"
              alt="Orizino"
              className="w-52 sm:w-72 h-auto"
              style={{ filter: "drop-shadow(0 0 40px hsl(355,99%,38%,0.3))" }}
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.95, duration: 0.6 }}
              className="text-center"
            >
              <p className="text-[11px] uppercase tracking-[0.5em] text-white/30 font-light">
                <TaglineChars text="Premium Fashion" delay={0.95} />
              </p>
            </motion.div>
          </motion.div>

          {/* Red hairline draws under logo */}
          <motion.div
            className="absolute pointer-events-none"
            style={{ top: "calc(50% + 90px)", left: "50%", x: "-50%" }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "130px", opacity: 0.5 }}
            transition={{ delay: 1.05, duration: 0.75, ease: "easeOut" }}
          >
            <div className="h-px bg-[hsl(355,99%,38%)]" />
          </motion.div>

          {/* "Tap to enter" prompt */}
          <AnimatePresence>
            {phase === "hold" && (
              <motion.p
                key="enter"
                className="absolute bottom-14 text-[10px] uppercase tracking-[0.45em] text-white/20 pointer-events-none"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: [0, 0.75, 0.3, 0.75], y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.6, ease: "easeInOut" }}
              >
                Tap anywhere to enter
              </motion.p>
            )}
          </AnimatePresence>

          {/* Film-frame corner ticks */}
          {(["top-6 left-6 border-t border-l",
             "top-6 right-6 border-t border-r",
             "bottom-6 left-6 border-b border-l",
             "bottom-6 right-6 border-b border-r"] as const).map((cls, i) => (
            <motion.div
              key={i}
              className={`absolute w-5 h-5 border-white/15 pointer-events-none ${cls}`}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 + i * 0.07, duration: 0.4 }}
            />
          ))}
        </motion.div>
      ) : (
        /* Exit: vertical wipe curtain (film-slate close) */
        <motion.div
          key="curtain"
          className="fixed inset-0 z-[99999] bg-[#080808] pointer-events-none origin-top"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
        />
      )}
    </AnimatePresence>
  );
}

/* ─── Wrapper: version-aware, SSR-safe ──────────────────────────── */
export function FirstVisitSplash() {
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);
  const [version, setVersion] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // 1. Quick localStorage read — if definitely seen (version matches), bail fast
      let stored: { version: number; ts: number } | null = null;
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) stored = JSON.parse(raw);
      } catch { /* ignore */ }

      // 2. Fetch current splash_version from site_settings
      let dbVersion = 1;
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "splash_version")
          .maybeSingle();
        if (data?.value != null) {
          dbVersion = Number(data.value) || 1;
        }
      } catch { /* network error — fall back to showing splash */ }

      if (cancelled) return;
      setVersion(dbVersion);

      const alreadySeen = stored && stored.version === dbVersion;
      setShow(!alreadySeen);
      setReady(true);
    }

    check();
    return () => { cancelled = true; };
  }, []);

  const handleComplete = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ version, ts: Date.now() }));
    } catch { /* private / blocked storage */ }
    setShow(false);
  };

  if (!ready || !show) return null;
  return <CinematicSplash onComplete={handleComplete} />;
}
// code:4ce0
