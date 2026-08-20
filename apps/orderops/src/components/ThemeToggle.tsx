import React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useOrderOpsTheme, type OrderOpsTheme } from "@/lib/theme";

export function ThemeToggle({
  compact = false,
  showLabel = false,
}: {
  compact?: boolean;
  showLabel?: boolean;
}) {
  const { theme, setTheme } = useOrderOpsTheme();
  const isDark =
    theme === "dark" ||
    (theme === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="relative p-2 rounded-xl bg-secondary/70 border border-border/70 text-foreground hover:bg-secondary active:scale-95 transition-all cursor-pointer flex items-center justify-center overflow-hidden"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        <div className="relative w-4 h-4">
          <Sun
            className={`w-4 h-4 text-amber-500 absolute inset-0 transition-all duration-300 transform ${
              isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
            }`}
          />
          <Moon
            className={`w-4 h-4 text-indigo-400 absolute inset-0 transition-all duration-300 transform ${
              isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
            }`}
          />
        </div>
      </button>
    );
  }

  // 3-Way Segmented Control (Light / Auto / Dark)
  const options: { value: OrderOpsTheme; label: string; icon: any }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "auto", label: "Auto", icon: Monitor },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div className="w-full flex items-center justify-between p-0.5 rounded-xl bg-secondary/60 border border-border/60 select-none">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.value;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              isSelected
                ? "bg-background text-foreground shadow-xs border border-border/70"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
            title={`Switch to ${opt.label} Theme`}
          >
            <Icon
              className={`w-3 h-3 ${
                isSelected
                  ? opt.value === "light"
                    ? "text-amber-500"
                    : opt.value === "dark"
                    ? "text-indigo-400"
                    : "text-primary"
                  : "opacity-70"
              }`}
            />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
