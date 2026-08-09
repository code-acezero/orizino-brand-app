"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * MobileListCard — reusable card row for mobile admin list views.
 *
 * Used by AdminCustomers, AdminCoupons, AdminProducts to keep the mobile
 * card UI visually consistent. Renders a compact card with slots:
 *
 *   [checkbox] [leading] [title / subtitle / meta] [trailing]
 *                                                   [actions]
 */
export interface MobileListCardProps {
  selected?: boolean;
  onSelectedChange?: (v: boolean) => void;
  onClick?: () => void;

  /** Left thumbnail / avatar. */
  leading?: React.ReactNode;
  /** Primary heading (usually a name or code). */
  title: React.ReactNode;
  /** Inline badges rendered after the title. */
  badges?: React.ReactNode;
  /** One-line secondary text below the title. */
  subtitle?: React.ReactNode;
  /** Small stat/meta row (dot-separated info). */
  meta?: React.ReactNode;
  /** Content in the top-right corner (e.g. a Switch). */
  trailing?: React.ReactNode;
  /** Action buttons rendered at the bottom-right. */
  actions?: React.ReactNode;

  className?: string;
  /** Aria label for the selection checkbox. */
  selectLabel?: string;
}

export function MobileListCard({
  selected = false,
  onSelectedChange,
  onClick,
  leading,
  title,
  badges,
  subtitle,
  meta,
  trailing,
  actions,
  className,
  selectLabel = "Select row",
}: MobileListCardProps) {
  const selectable = typeof onSelectedChange === "function";
  const clickable = typeof onClick === "function";

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "rounded-xl border bg-card p-3 transition-colors",
        selected ? "border-primary/60 bg-primary/5" : "border-border",
        clickable && "hover:bg-muted/40 active:bg-muted/60 cursor-pointer",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelectedChange?.(Boolean(v))}
              aria-label={selectLabel}
            />
          </div>
        )}

        {leading && <div className="shrink-0">{leading}</div>}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-sm truncate">{title}</span>
                {badges}
              </div>
              {subtitle && (
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {subtitle}
                </div>
              )}
            </div>
            {trailing && (
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                {trailing}
              </div>
            )}
          </div>

          {meta && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {meta}
            </div>
          )}

          {actions && (
            <div
              className="mt-2.5 flex flex-wrap gap-2 justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MobileListCard;
