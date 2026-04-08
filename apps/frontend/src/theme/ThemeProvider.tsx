import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ThemeId } from "@/theme/designTokens";
import { applyThemeClass, readStoredTheme, THEME_STORAGE_KEY } from "@/theme/themeStorage";

export interface IThemeContextValue {
  readonly theme: ThemeId;
  readonly setTheme: (t: ThemeId) => void;
  readonly toggleTheme: () => void;
}

const ThemeContext = createContext<IThemeContextValue | null>(null);

/**
 * Provides light/dark theme state, syncs `<html class="dark">`, and persists preference.
 */
export function ThemeProvider(props: { readonly children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<ThemeId>(() => readStoredTheme());

  useEffect(() => {
    applyThemeClass(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore quota / private mode
    }
  }, [theme]);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<IThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
}

export function useTheme(): IThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
