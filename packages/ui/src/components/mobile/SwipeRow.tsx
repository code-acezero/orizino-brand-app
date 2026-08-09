"use client";
import * as React from "react";
import { cn } from "@orizino/ui/utils";

/**
 * Lightweight iOS-style swipe-to-action row.
 * Swipe left to reveal trailing actions (e.g. Delete).
 * Pointer-based, no external deps. Falls back to a visible trailing
 * trigger button on devices that don't support touch fine enough.
 */
export interface SwipeRowAction {
  label: string;
  onClick: () => void;
  variant?: "destructive" | "default";
  icon?: React.ReactNode;
}

export interface SwipeRowProps {
  children: React.ReactNode;
  trailingActions: SwipeRowAction[];
  /** Pixels to reveal per action. */
  actionWidth?: number;
  className?: string;
}

export function SwipeRow({
  children,
  trailingActions,
  actionWidth = 80,
  className,
}: SwipeRowProps) {
  const totalWidth = trailingActions.length * actionWidth;
  const [offset, setOffset] = React.useState(0);
  const startX = React.useRef<number | null>(null);
  const startOffset = React.useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startOffset.current = offset;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    const next = Math.min(0, Math.max(-totalWidth, startOffset.current + dx));
    setOffset(next);
  };
  const onPointerUp = () => {
    startX.current = null;
    setOffset((o) => (o < -totalWidth / 2 ? -totalWidth : 0));
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width: totalWidth }}
        aria-hidden={offset === 0}
      >
        {trailingActions.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setOffset(0);
              a.onClick();
            }}
            style={{ width: actionWidth }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs font-medium text-white",
              a.variant === "destructive" ? "bg-destructive" : "bg-primary",
            )}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translate3d(${offset}px, 0, 0)`, touchAction: "pan-y" }}
        className="relative bg-background transition-transform duration-150 ease-out will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}

export default SwipeRow;
