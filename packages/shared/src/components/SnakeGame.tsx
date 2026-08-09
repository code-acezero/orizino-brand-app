"use client";
import { useEffect, useRef, useState, useCallback } from "react";

type Dir = "up" | "down" | "left" | "right";
const OPP: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export interface SnakeGameProps {
  /** Grid cells per side. Lower = easier, higher = harder. */
  size?: number;
  /** Tick interval in ms (lower = faster). */
  speedMs?: number;
  /** Accent color (CSS color). Defaults to `hsl(var(--primary))`. */
  accent?: string;
  className?: string;
}

/**
 * Minimal, mobile-safe Snake game.
 * - No external deps.
 * - Keyboard (arrows/WASD) + swipe controls.
 * - Redraws with rAF only on tick, not every frame — cheap on mobile.
 */
export function SnakeGame({
  size = 16,
  speedMs = 130,
  accent = "hsl(var(--primary))",
  className,
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    snake: [{ x: 8, y: 8 }],
    dir: "right" as Dir,
    nextDir: "right" as Dir,
    food: { x: 12, y: 8 },
    dead: false,
  });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(true);

  const reset = useCallback(() => {
    stateRef.current = {
      snake: [{ x: Math.floor(size / 2), y: Math.floor(size / 2) }],
      dir: "right",
      nextDir: "right",
      food: {
        x: Math.floor(Math.random() * size),
        y: Math.floor(Math.random() * size),
      },
      dead: false,
    };
    setScore(0);
    setRunning(true);
  }, [size]);

  const setDir = useCallback((d: Dir) => {
    const s = stateRef.current;
    if (OPP[s.dir] === d) return;
    s.nextDir = d;
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") setDir("up");
      else if (k === "arrowdown" || k === "s") setDir("down");
      else if (k === "arrowleft" || k === "a") setDir("left");
      else if (k === "arrowright" || k === "d") setDir("right");
      else if (k === " " || k === "enter") {
        if (stateRef.current.dead) reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDir, reset]);

  // Touch swipe
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let sx = 0,
      sy = 0;
    const start = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? "right" : "left");
      else setDir(dy > 0 ? "down" : "up");
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchend", end, { passive: true });
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchend", end);
    };
  }, [setDir]);

  // Game loop
  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();
    let raf = 0;

    const draw = () => {
      const s = stateRef.current;
      const cell = canvas.width / size;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // grid dots
      ctx.fillStyle = "rgba(127,127,127,0.15)";
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          ctx.fillRect(x * cell + cell / 2 - 0.5, y * cell + cell / 2 - 0.5, 1, 1);
        }
      }
      // food
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(
        s.food.x * cell + cell / 2,
        s.food.y * cell + cell / 2,
        cell * 0.35,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // snake
      s.snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? accent : "currentColor";
        ctx.globalAlpha = i === 0 ? 1 : Math.max(0.35, 1 - i * 0.03);
        const pad = cell * 0.1;
        ctx.fillRect(seg.x * cell + pad, seg.y * cell + pad, cell - pad * 2, cell - pad * 2);
      });
      ctx.globalAlpha = 1;
    };

    const tick = () => {
      const s = stateRef.current;
      s.dir = s.nextDir;
      const head = { ...s.snake[0] };
      if (s.dir === "up") head.y--;
      else if (s.dir === "down") head.y++;
      else if (s.dir === "left") head.x--;
      else head.x++;

      // wall or self
      const hitWall = head.x < 0 || head.y < 0 || head.x >= size || head.y >= size;
      const hitSelf = s.snake.some((seg) => seg.x === head.x && seg.y === head.y);
      if (hitWall || hitSelf) {
        s.dead = true;
        setRunning(false);
        setBest((b) => (score > b ? score : b));
        return;
      }
      s.snake.unshift(head);
      if (head.x === s.food.x && head.y === s.food.y) {
        setScore((sc) => sc + 1);
        // place food not on snake
        let nf;
        do {
          nf = {
            x: Math.floor(Math.random() * size),
            y: Math.floor(Math.random() * size),
          };
        } while (s.snake.some((seg) => seg.x === nf.x && seg.y === nf.y));
        s.food = nf;
      } else {
        s.snake.pop();
      }
    };

    const loop = (t: number) => {
      if (t - last >= speedMs) {
        tick();
        last = t;
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, size, speedMs, accent, score]);

  // Canvas sizing (device-pixel-ratio aware)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = rect.width * dpr;
    c.height = rect.width * dpr; // square
    const ctx = c.getContext("2d");
    if (ctx) ctx.scale(1, 1);
  }, []);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2 text-xs font-medium text-muted-foreground">
        <span>
          Score <span className="text-foreground tabular-nums">{score}</span>
        </span>
        <span>
          Best <span className="text-foreground tabular-nums">{Math.max(best, score)}</span>
        </span>
      </div>
      <div
        className="relative rounded-2xl overflow-hidden select-none touch-none"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          color: "hsl(var(--foreground))",
        }}
      >
        <canvas ref={canvasRef} className="block w-full aspect-square" />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
            <p className="text-lg font-display font-bold">Game Over</p>
            <p className="text-xs text-muted-foreground">Score: {score}</p>
            <button
              type="button"
              onClick={reset}
              className="h-10 px-5 rounded-full font-semibold text-sm"
              style={{ background: accent, color: "hsl(var(--primary-foreground))" }}
            >
              Play again
            </button>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-2">
        Arrow keys / WASD · Swipe on mobile
      </p>
    </div>
  );
}
// code:4ce0
