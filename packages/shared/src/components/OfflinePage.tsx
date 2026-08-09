"use client";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import { useDeviceClass } from "../hooks/use-device-class";
import { SnakeGame } from "./SnakeGame";
import { Link } from "../lib/router-compat";

export interface OfflinePageProps {
  /** Where the Home button points */
  homeTo?: string;
  /** Brand/app label shown in the header */
  appName?: string;
}

/**
 * Chrome-style no-internet page with a built-in Snake game.
 * - Desktop / large tablet: editorial split with copy + game
 * - Mobile / small tablet: iOS-style with large title, safe-area, stacked actions
 */
export function OfflinePage({ homeTo = "/", appName = "Orizino" }: OfflinePageProps) {
  const device = useDeviceClass();
  const isSmall = device !== "desktop";

  const reload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  if (isSmall) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)",
        }}
      >
        <div
          className="flex items-center justify-between px-4"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}
        >
          <span className="text-[13px] font-medium text-muted-foreground">{appName}</span>
          <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
            <WifiOff className="w-3.5 h-3.5" /> Offline
          </span>
        </div>

        <div className="px-5 pt-4">
          <h1 className="text-[34px] leading-tight font-display font-bold tracking-tight text-foreground">
            No Internet
          </h1>
          <p className="text-[15px] text-muted-foreground mt-1">
            Check your connection. In the meantime, play a round.
          </p>
        </div>

        <div className="flex-1 px-5 pt-4 pb-2">
          <SnakeGame size={14} speedMs={140} className="max-w-md mx-auto" />
        </div>

        <div
          className="px-4 pt-2 space-y-2"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
        >
          <button
            type="button"
            onClick={reload}
            className="flex items-center justify-center gap-2 w-full h-[52px] rounded-2xl font-semibold text-[17px] active:opacity-70"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            <RefreshCw className="w-[18px] h-[18px]" strokeWidth={2.4} />
            Try again
          </button>
          <Link
            to={homeTo}
            className="flex items-center justify-center gap-2 w-full h-[52px] rounded-2xl font-medium text-[17px] active:opacity-70"
            style={{
              background: "hsl(var(--muted) / 0.6)",
              color: "hsl(var(--foreground))",
            }}
          >
            <Home className="w-[18px] h-[18px]" strokeWidth={2.2} />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center px-6"
      style={{ background: "hsl(var(--background))" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[560px] h-[560px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 70%)",
            top: "-10%",
            left: "-8%",
            filter: "blur(90px)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1fr_1fr] gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur-md px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <WifiOff className="w-3.5 h-3.5" /> Connection lost
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight text-foreground">
            You're offline.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            {appName} can't reach the network. Your changes will resume once you're back —
            in the meantime, one game of Snake.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-2 h-12 pl-5 pr-6 rounded-full bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
            <Link
              to={homeTo}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-full border border-border/70 bg-card/40 backdrop-blur-md text-foreground font-medium text-sm hover:bg-card/70 transition-colors"
            >
              <Home className="w-4 h-4" /> Home
            </Link>
          </div>
        </div>

        <div className="justify-self-center w-full max-w-md">
          <SnakeGame size={18} speedMs={110} />
        </div>
      </div>
    </div>
  );
}
// code:4ce0
