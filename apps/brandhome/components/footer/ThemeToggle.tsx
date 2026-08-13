import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-foreground/5 hover:bg-foreground/10 transition-colors text-muted-foreground hover:text-foreground"
      aria-label="Toggle theme"
    >
      <Sun className="w-3.5 h-3.5 hidden dark:block" />
      <Moon className="w-3.5 h-3.5 block dark:hidden" />
      <span className="text-[10px] font-medium uppercase tracking-wider hidden sm:inline-block">
        {!mounted ? "Theme" : theme === "dark" ? "Dark Mode" : "Light Mode"}
      </span>
    </button>
  );
}
