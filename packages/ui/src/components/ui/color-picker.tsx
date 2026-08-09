"use client";
import React, { useState, useCallback } from "react";
import { Input } from "./input";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#000000",
  "#ffffff", "#6b7280", "#9ca3af", "#d1d5db",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  const [hue, setHue] = useState(0);

  const handleHueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const h = Number(e.target.value);
    setHue(h);
    onChange(`hsl(${h}, 70%, 50%)`);
  }, [onChange]);

  return (
    <div className="space-y-3">
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      
      {/* Current color preview */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl border border-border shadow-sm flex-shrink-0"
          style={{ background: value || "#6366f1" }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366f1 or hsl(..."
          className="rounded-xl text-sm font-mono"
        />
      </div>

      {/* Preset tiles */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${value === c ? "border-foreground ring-2 ring-primary/30 scale-110" : "border-transparent"}`}
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>

      {/* Hue bar */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Custom hue</p>
        <input
          type="range"
          min="0"
          max="360"
          value={hue}
          onChange={handleHueChange}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background: "linear-gradient(to right, hsl(0,70%,50%), hsl(60,70%,50%), hsl(120,70%,50%), hsl(180,70%,50%), hsl(240,70%,50%), hsl(300,70%,50%), hsl(360,70%,50%))",
          }}
        />
      </div>
    </div>
  );
};

export default ColorPicker;
