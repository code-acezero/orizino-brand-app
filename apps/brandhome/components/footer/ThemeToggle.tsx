import React from "react";
import { useTheme } from "@orizino/ui";
import { Moon, Sun, Monitor } from "lucide-react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleCycle = () => {
    if (theme === "system" || !theme) setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const getTitle = () => {
    if (!mounted) return "Theme mode";
    if (theme === "dark") return "Theme: Dark (click for Auto/System)";
    if (theme === "light") return "Theme: Light (click for Dark)";
    return "Theme: Auto/System (click for Light)";
  };

  return (
    <button
      type="button"
      onClick={handleCycle}
      title={getTitle()}
      aria-label="Toggle theme mode"
      className={`w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full border border-border/40 bg-foreground/5 hover:bg-foreground/10 shrink-0 cursor-pointer ${className}`}
    >
      {!mounted ? (
        <Monitor className="w-4 h-4" strokeWidth={1.5} />
      ) : theme === "dark" ? (
        <Moon className="w-4 h-4" strokeWidth={1.5} />
      ) : theme === "light" ? (
        <Sun className="w-4 h-4" strokeWidth={1.5} />
      ) : (
        <Monitor className="w-4 h-4" strokeWidth={1.5} />
      )}
    </button>
  );
}

