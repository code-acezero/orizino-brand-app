import { useEffect, useState, useCallback } from "react";

export type OrderOpsTheme = "auto" | "dark" | "light";

const STORAGE_KEY = "orderops-theme";

export function useOrderOpsTheme() {
  const [theme, setThemeState] = useState<OrderOpsTheme>(() => {
    if (typeof window === "undefined") return "auto";
    return (localStorage.getItem(STORAGE_KEY) as OrderOpsTheme) || "auto";
  });

  const applyTheme = useCallback((mode: OrderOpsTheme) => {
    if (typeof document === "undefined") return;
    const isDark =
      mode === "dark" ||
      (mode === "auto" &&
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches);

    document.documentElement.classList.toggle("dark", !!isDark);
  }, []);

  useEffect(() => {
    applyTheme(theme);

    if (theme === "auto" && typeof window !== "undefined" && window.matchMedia) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyTheme("auto");
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, [theme, applyTheme]);

  const setTheme = (mode: OrderOpsTheme) => {
    setThemeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
    applyTheme(mode);
  };

  return { theme, setTheme };
}
