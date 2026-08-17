"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor: a 3-point sparkle whose tip sits at (0,0) — the click point.
 * Over a clickable element it transforms to focus interactive feedback.
 */
export function CursorTrail() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (hover: hover) and (min-width: 769px)");
    const upd = () => setEnabled(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-custom-cursor");
    return () => document.documentElement.classList.remove("has-custom-cursor");
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const cursor = cursorRef.current;
    if (!cursor) return;

    const mouse = { x: -100, y: -100 };
    let popTimer = 0;

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onDown = () => {
      cursor.classList.remove("is-pop");
      void cursor.offsetWidth;
      cursor.classList.add("is-pop");
      window.clearTimeout(popTimer);
      popTimer = window.setTimeout(() => cursor.classList.remove("is-pop"), 360);
    };
    const onOverInteractive = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const inter = !!t?.closest("a,button,input,textarea,select,[role=button],label");
      cursor.classList.toggle("is-hover", inter);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousemove", onOverInteractive, { passive: true });
    window.addEventListener("mousedown", onDown);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      cursor.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(popTimer);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousemove", onOverInteractive);
      window.removeEventListener("mousedown", onDown);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={cursorRef} className="cursor-star" aria-hidden>
      <svg viewBox="0 0 28 28" width="28" height="28" style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="starArrowFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFEAEE" />
            <stop offset="45%" stopColor="#FF4858" />
            <stop offset="100%" stopColor="#6E1218" />
          </linearGradient>
        </defs>
        <polygon className="cursor-shape cursor-shape--star" points="0,0 11,8 22,9 13,13 9,22 8,11" fill="url(#starArrowFill)" />
        <polygon className="cursor-shape cursor-shape--pyramid" points="0,0 20,7 7,20" fill="url(#starArrowFill)" />
      </svg>
    </div>
  );
}
