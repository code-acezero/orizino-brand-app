"use client";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "../../utils";

/**
 * Native-feel bottom sheet built on top of the shadcn Sheet primitive.
 * - Rounded top corners
 * - Drag handle affordance
 * - Safe-area bottom padding
 * - Snap heights via `height` prop (50/75/100)
 */
export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  height?: "auto" | "half" | "tall" | "full";
  className?: string;
}

const HEIGHT_CLASS: Record<NonNullable<BottomSheetProps["height"]>, string> = {
  auto: "max-h-[85vh]",
  half: "h-[50vh]",
  tall: "h-[75vh]",
  full: "h-[100dvh]",
};

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  height = "auto",
  className,
}: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-3xl border-t-0 p-0 flex flex-col",
          "pb-[max(env(safe-area-inset-bottom),1rem)]",
          HEIGHT_CLASS[height],
          className,
        )}
      >
        <div className="flex justify-center pt-2 pb-1" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        {(title || description) && (
          <SheetHeader className="px-5 pt-2 pb-3 text-left">
            {title ? <SheetTitle className="text-xl">{title}</SheetTitle> : null}
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-2 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default BottomSheet;
// code:4ce0
