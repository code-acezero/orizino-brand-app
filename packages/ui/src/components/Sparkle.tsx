import React from "react";

export interface SparkleProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
}

/**
 * Clean four-point star icon representing AI intelligence.
 * Compatible with Lucide React icon props and classes.
 */
export const Sparkle = React.forwardRef<SVGSVGElement, SparkleProps>(
  ({ className = "w-4 h-4", size, width, height, color, strokeWidth = 2, ...props }, ref) => {
    const w = size ?? width ?? 24;
    const h = size ?? height ?? 24;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color || "currentColor"}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    );
  }
);

Sparkle.displayName = "Sparkle";

export default Sparkle;
