"use client";
import React, { useState, useEffect } from "react";

interface SaleCountdownProps {
  endsAt: string;
  color?: string;
}

const SaleCountdown: React.FC<SaleCountdownProps> = ({ endsAt, color }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      };
    };
    setTimeLeft(calc());
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (timeLeft.expired) return <span className="text-xs font-semibold text-destructive">Sale Ended</span>;

  const bgColor = color?.startsWith("var") ? `hsl(var(--primary) / 0.15)` : `hsl(${color} / 0.15)`;
  const textColor = color?.startsWith("var") ? `hsl(var(--primary))` : `hsl(${color})`;

  const units = [
    { label: "D", value: timeLeft.days },
    { label: "H", value: timeLeft.hours },
    { label: "M", value: timeLeft.minutes },
    { label: "S", value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {units.map((u) => (
        <div key={u.label} className="flex flex-col items-center rounded-lg px-2 py-1 min-w-[36px]" style={{ background: bgColor }}>
          <span className="text-sm font-bold font-mono leading-none" style={{ color: textColor }}>{String(u.value).padStart(2, "0")}</span>
          <span className="text-[9px] text-muted-foreground leading-none mt-0.5">{u.label}</span>
        </div>
      ))}
    </div>
  );
};

export default SaleCountdown;
// code:4ce0
