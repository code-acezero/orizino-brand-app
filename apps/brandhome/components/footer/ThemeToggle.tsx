import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";

const THEME_OPTIONS = [
  { value: "system", label: "Auto", icon: Monitor, tip: "Match device OS theme" },
  { value: "light", label: "Light", icon: Sun, tip: "Light theme" },
  { value: "dark", label: "Dark", icon: Moon, tip: "Dark theme" },
] as const;

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex items-center p-0.5 rounded-full border border-border/40 bg-foreground/5 text-muted-foreground">
        <div className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider">
          <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Auto</span>
        </div>
      </div>
    );
  }

  const currentTheme = theme || "system";

  return (
    <div
      role="group"
      aria-label="Select color theme mode"
      className="inline-flex items-center p-0.5 rounded-full border border-border/40 bg-foreground/5 backdrop-blur-sm"
    >
      {THEME_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = currentTheme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            title={opt.tip}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              isActive
                ? "bg-foreground text-background shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline-block capitalize">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
