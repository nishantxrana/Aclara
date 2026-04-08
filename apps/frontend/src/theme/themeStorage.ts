import type { ThemeId } from "@/theme/designTokens";

export const THEME_STORAGE_KEY = "insightops-theme";

/**
 * Read persisted theme preference. Defaults to light when missing or invalid.
 */
export function readStoredTheme(): ThemeId {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "light";
  }
  const v = localStorage.getItem(THEME_STORAGE_KEY);
  return v === "dark" || v === "light" ? v : "light";
}

/**
 * Apply `dark` class and `data-theme` on `<html>` (idempotent).
 */
export function applyThemeClass(theme: ThemeId): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}
