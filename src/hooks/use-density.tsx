"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * DensityProvider — third data-attribute axis on <html> next to the
 * mode/theme pair from use-theme.tsx: `data-density` picks between
 * comfortable (default) and compact row spacing. The CSS side lives in
 * globals.css (`--density-py` / `--density-gap` + the `py-density` /
 * `gap-density` utilities); adopting a view is just swapping its fixed
 * paddings for those utilities.
 *
 * The initial value is read lazily inside useState — never via
 * setState in an effect (react-hooks/set-state-in-effect is an error
 * in this repo). There is no boot script for density: "comfortable"
 * is also the CSS no-attribute fallback, so only compact users see a
 * single pre-hydration frame with the roomier spacing.
 *
 * Persistence mirrors use-theme.tsx: localStorage, plus a storage
 * listener so a change in one tab propagates to the others.
 */

export const DENSITIES = ["comfortable", "compact"] as const;

export type Density = (typeof DENSITIES)[number];

export const DEFAULT_DENSITY: Density = "comfortable";

export const DENSITY_STORAGE_KEY = "wacrm.density";

export function isDensity(value: unknown): value is Density {
  return (
    typeof value === "string" &&
    (DENSITIES as ReadonlyArray<string>).includes(value)
  );
}

interface DensityContextValue {
  density: Density;
  setDensity: (next: Density) => void;
}

const DensityContext = createContext<DensityContextValue | null>(null);

function readInitialDensity(): Density {
  if (typeof window === "undefined") return DEFAULT_DENSITY;
  const fromAttr = document.documentElement.dataset.density;
  if (isDensity(fromAttr)) return fromAttr;
  try {
    const stored = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (isDensity(stored)) return stored;
  } catch {
    // localStorage can throw in private-browsing / sandboxed contexts.
  }
  return DEFAULT_DENSITY;
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>(readInitialDensity);

  // Reflect the state onto <html> — a DOM mutation (not setState), so
  // an effect is the right home for it. Also covers the first paint
  // for compact users restored from localStorage.
  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.density = next;
    }
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, next);
    } catch {
      // Same private-browsing edge case; in-memory state still works.
    }
  }, []);

  // Cross-tab sync, same shape as use-theme.tsx.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== DENSITY_STORAGE_KEY) return;
      if (isDensity(e.newValue)) {
        setDensityState(e.newValue);
        document.documentElement.dataset.density = e.newValue;
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ density, setDensity }),
    [density, setDensity],
  );

  return (
    <DensityContext.Provider value={value}>{children}</DensityContext.Provider>
  );
}

export function useDensity(): DensityContextValue {
  const ctx = useContext(DensityContext);
  if (!ctx) {
    // No-op fallback outside the provider (same contract as useTheme) —
    // the CSS default keeps the page rendering correctly either way.
    return { density: DEFAULT_DENSITY, setDensity: () => {} };
  }
  return ctx;
}
