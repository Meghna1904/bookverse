import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "bookverse-theme";
const DARK_COLOR = "#221f1a";
const LIGHT_COLOR = "#f4ecdd";

let snapshot: Theme | null = null;
const listeners = new Set<() => void>();

function readTheme(): Theme {
  if (snapshot) return snapshot;
  if (typeof document === "undefined") return "light";
  snapshot = document.documentElement.classList.contains("dark") ? "dark" : "light";
  return snapshot;
}

function syncDocument(theme: Theme) {
  const root = document.documentElement;
  const dark = theme === "dark";
  root.classList.toggle("dark", dark);
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? DARK_COLOR : LIGHT_COLOR);
}

function setTheme(theme: Theme) {
  snapshot = theme;
  syncDocument(theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing can block storage; the in-memory theme still works.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  // The pre-paint script in index.html has already applied the saved (or
  // system) theme, so the external snapshot matches the document on load.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);

  useEffect(() => {
    syncDocument(readTheme());
  }, []);

  const toggle = useCallback(() => {
    setTheme(readTheme() === "dark" ? "light" : "dark");
  }, []);

  return { theme, toggle, isDark: theme === "dark" };
}
