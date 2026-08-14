import React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useOrderOpsTheme, OrderOpsTheme } from "@/lib/theme";

const OPTIONS: { value: OrderOpsTheme; label: string; icon: React.ElementType }[] = [
  { value: "auto", label: "Auto", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useOrderOpsTheme();

  return (
    <div
      role="group"
      aria-label="Color theme selector"
      className={`inline-flex items-center p-0.5 rounded-xl border border-border/60 bg-muted/40 ${
        compact ? "w-auto" : "w-full justify-between"
      }`}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            title={`Theme: ${opt.label} ${opt.value === "auto" ? "(Device Theme)" : ""}`}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              compact ? "" : "flex-1"
            } ${
              isActive
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
