"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface AudioWaveVisualizerProps {
  stream?: MediaStream | null;
  active?: boolean;
  color?: string; // CSS color or Tailwind class
  barCount?: number;
  height?: number;
}

export const AudioWaveVisualizer: React.FC<AudioWaveVisualizerProps> = ({
  stream,
  active = true,
  color = "bg-emerald-400",
  barCount = 6,
  height = 24,
}) => {
  const [levels, setLevels] = useState<number[]>(() => Array(barCount).fill(0.2));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !stream || stream.getAudioTracks().length === 0) {
      setLevels(Array(barCount).fill(0.2));
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const update = () => {
        analyser.getByteFrequencyData(dataArray);

        // Compute energy per bar band
        const newLevels: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / barCount));
        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i * step] || 0;
          const normalized = Math.max(0.15, Math.min(1, val / 200));
          newLevels.push(normalized);
        }
        setLevels(newLevels);
        rafRef.current = requestAnimationFrame(update);
      };

      update();
    } catch {
      // Fallback: animated CSS wave
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream, active, barCount]);

  return (
    <div className="flex items-center justify-center gap-1 px-1 select-none" style={{ height }}>
      {levels.map((lvl, idx) => {
        // Dynamic bar heights
        const targetHeight = active
          ? stream
            ? Math.max(4, Math.round(lvl * height))
            : Math.max(4, Math.round((0.3 + 0.7 * Math.sin(Date.now() / 200 + idx)) * height))
          : 3;

        return (
          <motion.span
            key={idx}
            className={`w-1 rounded-full ${color}`}
            animate={
              !stream && active
                ? {
                    scaleY: [0.3, 1, 0.4, 0.9, 0.3],
                    opacity: [0.7, 1, 0.8, 1, 0.7],
                  }
                : {
                    height: targetHeight,
                    opacity: active ? 0.95 : 0.4,
                  }
            }
            transition={
              !stream && active
                ? {
                    repeat: Infinity,
                    duration: 1.2,
                    delay: idx * 0.15,
                    ease: "easeInOut",
                  }
                : { duration: 0.08 }
            }
            style={{
              height: targetHeight,
              transformOrigin: "center",
              minHeight: 3,
            }}
          />
        );
      })}
    </div>
  );
};
