"use client";

import * as React from "react";

export type Theme = string;

export interface UseThemeProps {
  /** List of all available theme names */
  themes: string[];
  /** Forced theme name for the current page */
  forcedTheme?: string;
  /** Active theme name */
  theme?: string;
  /** If `enableSystem` is true and the active theme is "system", this returns whether the system preference resolved to "dark" or "light". Otherwise, identical to `theme` */
  resolvedTheme?: "light" | "dark" | string;
  /** If `enableSystem` is true, returns the system theme preference ("dark" or "light"), regardless of the active theme */
  systemTheme?: "light" | "dark";
  /** Function to update the active theme */
  setTheme: (theme: string | ((prev: string) => string)) => void;
}

export interface ThemeProviderProps {
  children?: React.ReactNode;
  /** List of all available theme names. Default: `['light', 'dark']` */
  themes?: string[];
  /** Forced theme name for the current page */
  forcedTheme?: string;
  /** Whether to switch between dark and light themes based on prefers-color-scheme. Default: `true` */
  enableSystem?: boolean;
  /** Disable all CSS transitions when switching themes. Default: `false` */
  disableTransitionOnChange?: boolean;
  /** Whether to indicate to browsers which color scheme is used (via CSS color-scheme). Default: `true` */
  enableColorScheme?: boolean;
  /** Key used to store theme setting in localStorage. Default: `'theme'` */
  storageKey?: string;
  /** Default theme name. Default: `'system'` */
  defaultTheme?: string;
  /** HTML attribute modified based on the active theme. Default: `'data-theme'` */
  attribute?: string | string[];
  /** Value mapping from theme name to attribute value. */
  value?: Record<string, string>;
  /** Nonce string for CSP */
  nonce?: string;
}

const ThemeContext = React.createContext<UseThemeProps>({
  themes: ["light", "dark", "system"],
  setTheme: () => {},
});

const MEDIA = "(prefers-color-scheme: dark)";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia(MEDIA).matches ? "dark" : "light";
}

function getInitialTheme(storageKey: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(storageKey) || fallback;
  } catch {
    return fallback;
  }
}

const disableAnimation = () => {
  const css = document.createElement("style");
  css.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
    )
  );
  document.head.appendChild(css);
  return () => {
    // Force layout reflow
    (() => window.getComputedStyle(document.body))();
    setTimeout(() => {
      document.head.removeChild(css);
    }, 1);
  };
};

export function ThemeProvider({
  forcedTheme,
  disableTransitionOnChange = false,
  enableSystem = true,
  enableColorScheme = true,
  storageKey = "theme",
  themes = ["light", "dark"],
  defaultTheme = enableSystem ? "system" : "light",
  attribute = "data-theme",
  value,
  children,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(() =>
    getInitialTheme(storageKey, defaultTheme)
  );
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">(() =>
    getSystemTheme()
  );

  const resolvedTheme = React.useMemo(() => {
    if (forcedTheme) return forcedTheme;
    if (theme === "system") return systemTheme;
    return theme;
  }, [forcedTheme, theme, systemTheme]);

  const applyTheme = React.useCallback(
    (themeToApply: string) => {
      if (typeof window === "undefined" || !themeToApply) return;

      const enableTransitions = disableTransitionOnChange
        ? disableAnimation()
        : null;

      const d = document.documentElement;
      const targetValue = value ? value[themeToApply] || themeToApply : themeToApply;
      const allPossibleValues = value ? Object.values(value) : themes;

      const attrs = Array.isArray(attribute) ? attribute : [attribute];
      attrs.forEach((attr) => {
        if (attr === "class") {
          d.classList.remove(...allPossibleValues, "light", "dark");
          if (targetValue) {
            d.classList.add(targetValue);
          }
        } else if (attr.startsWith("data-")) {
          if (targetValue) {
            d.setAttribute(attr, targetValue);
          } else {
            d.removeAttribute(attr);
          }
        }
      });

      if (enableColorScheme) {
        const isStandard = ["light", "dark"].includes(themeToApply);
        if (isStandard) {
          d.style.colorScheme = themeToApply;
        } else {
          d.style.colorScheme = "";
        }
      }

      enableTransitions?.();
    },
    [attribute, disableTransitionOnChange, enableColorScheme, themes, value]
  );

  const setTheme = React.useCallback(
    (newTheme: string | ((prev: string) => string)) => {
      setThemeState((prev) => {
        const next = typeof newTheme === "function" ? newTheme(prev) : newTheme;
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          // ignore
        }
        return next;
      });
    },
    [storageKey]
  );

  // Listen to system prefers-color-scheme changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(MEDIA);
    const handler = () => {
      setSystemTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  // Listen to localStorage changes across tabs
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) return;
      const nextTheme = e.newValue || defaultTheme;
      setThemeState(nextTheme);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [defaultTheme, storageKey]);

  // Apply theme to DOM on changes
  React.useEffect(() => {
    applyTheme(resolvedTheme);
  }, [applyTheme, resolvedTheme]);

  const providerValue = React.useMemo<UseThemeProps>(
    () => ({
      theme,
      setTheme,
      forcedTheme,
      resolvedTheme,
      themes: enableSystem ? [...themes, "system"] : themes,
      systemTheme,
    }),
    [theme, setTheme, forcedTheme, resolvedTheme, enableSystem, themes, systemTheme]
  );

  return (
    <ThemeContext.Provider value={providerValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): UseThemeProps {
  return React.useContext(ThemeContext);
}
