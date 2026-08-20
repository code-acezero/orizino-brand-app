import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Store,
  Layers,
  Headphones,
  Truck,
  Bell,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  Sparkles,
  Info
} from "lucide-react";
import { useNotifications, DynamicIslandItem } from "@/lib/notifications";

function getIslandIcon(type: DynamicIslandItem["type"]) {
  switch (type) {
    case "order":
      return { icon: ShoppingBag, color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" };
    case "pos":
      return { icon: Store, color: "text-indigo-400", bg: "bg-indigo-500/20 border-indigo-500/30" };
    case "stock":
      return { icon: Layers, color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/30" };
    case "support":
      return { icon: Headphones, color: "text-sky-400", bg: "bg-sky-500/20 border-sky-500/30" };
    case "dispatch":
      return { icon: Truck, color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" };
    case "success":
      return { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" };
    case "warning":
      return { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/30" };
    default:
      return { icon: Bell, color: "text-purple-400", bg: "bg-purple-500/20 border-purple-500/30" };
  }
}

export function DynamicIsland() {
  const { activeIsland, dismissIsland } = useNotifications();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<any>(null);

  const duration = activeIsland?.durationMs || 4500;

  useEffect(() => {
    if (!activeIsland) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const startTime = Date.now();
    const intervalTime = 50;

    const interval = setInterval(() => {
      if (isHovered) return;
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        dismissIsland();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [activeIsland, duration, isHovered, dismissIsland]);

  if (!activeIsland) return null;

  const { icon: Icon, color, bg } = getIslandIcon(activeIsland.type);

  const handleClick = () => {
    if (activeIsland.actionUrl) {
      dismissIsland();
      navigate(activeIsland.actionUrl);
    }
  };

  return (
    <div
      className="fixed top-3 sm:top-4.5 inset-x-0 z-50 flex justify-center pointer-events-none px-3"
      role="alert"
      aria-live="polite"
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="pointer-events-auto relative w-full max-w-[420px] rounded-3xl bg-zinc-950/95 text-white border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all duration-300 ease-out overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-3"
        style={{
          boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.12)",
        }}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 pointer-events-none" />

        <div className="relative p-3.5 flex items-center gap-3">
          {/* Dynamic Island Animated Indicator / Icon */}
          <div className="relative shrink-0">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner ${bg}`}
            >
              <Icon className={`w-5 h-5 ${color} animate-pulse`} />
            </div>
            {/* Live Ripple Dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-zinc-950" />
            </span>
          </div>

          {/* Content Area */}
          <div
            onClick={handleClick}
            className={`min-w-0 flex-1 ${activeIsland.actionUrl ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold tracking-tight text-zinc-100 truncate">
                {activeIsland.title}
              </h4>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-300 font-mono tracking-wider">
                Live
              </span>
            </div>
            {activeIsland.subtitle && (
              <p className="text-[11px] text-zinc-400 font-normal leading-tight line-clamp-2 mt-0.5">
                {activeIsland.subtitle}
              </p>
            )}
          </div>

          {/* Action / Dismiss Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {activeIsland.actionUrl && (
              <button
                type="button"
                onClick={handleClick}
                className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <span>{activeIsland.actionLabel || "View"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={dismissIsland}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Dismiss"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Island Progress Auto-Collapse Bar */}
        <div className="h-0.5 w-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-primary to-emerald-400 transition-all ease-linear"
            style={{ width: `${progress}%`, transitionDuration: "50ms" }}
          />
        </div>
      </div>
    </div>
  );
}
