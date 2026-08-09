"use client";
import React, { useRef, useEffect } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  fadeDir: number;
}

interface ParticleOverlayProps {
  width: number;
  height: number;
  count?: number;
  speed?: number;
  size?: number;
}

const ParticleOverlay: React.FC<ParticleOverlayProps> = ({
  width, height, count = 40, speed = 1, size = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef(0);
  const prevKey = useRef("");

  useEffect(() => {
    if (!width || !height) return;

    const key = `${width}-${height}-${count}-${speed}-${size}`;
    if (key !== prevKey.current) {
      prevKey.current = key;
      particles.current = Array.from({ length: Math.max(1, Math.round(count)) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: (Math.random() * 2 + 0.5) * size,
        speedX: (Math.random() - 0.5) * 0.4 * speed,
        speedY: (-Math.random() * 0.3 - 0.1) * speed,
        opacity: Math.random() * 0.5 + 0.1,
        fadeDir: Math.random() > 0.5 ? 1 : -1,
      }));
    }

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles.current) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += p.fadeDir * 0.003;
        if (p.opacity >= 0.6) p.fadeDir = -1;
        if (p.opacity <= 0.05) p.fadeDir = 1;
        if (p.y < -5) { p.y = height + 5; p.x = Math.random() * width; }
        if (p.x < -5) p.x = width + 5;
        if (p.x > width + 5) p.x = -5;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
      }
      raf.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [width, height, count, speed, size]);

  if (!width || !height) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 z-[15] pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
};

export default React.memo(ParticleOverlay);
// code:4ce0
