"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  as?: keyof React.JSX.IntrinsicElements;
  padded?: boolean;
}

/**
 * Consistent section card: rounded-2xl, soft border, card surface.
 * Replaces the ad-hoc `rounded-2xl border border-border/60 bg-card p-5` string
 * repeated across admin pages.
 */
const SectionCard: React.FC<Props> = ({ as: Tag = "section", padded = true, className, children, ...rest }) => {
  const Comp = Tag as any;
  return (
    <Comp
      {...rest}
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm",
        padded && "p-5 md:p-6",
        className,
      )}
    >
      {children}
    </Comp>
  );
};

export default SectionCard;
// code:4ce0
