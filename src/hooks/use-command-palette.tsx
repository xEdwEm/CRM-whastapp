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
 * CommandPaletteProvider — owns the palette's open state and the
 * global ⌘K / Ctrl+K listener. The UI itself lives in
 * src/components/command-palette/command-palette.tsx; both are mounted
 * once from dashboard-shell.tsx, and the header trigger button reuses
 * this hook to open the palette on click.
 */

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  // Global shortcut. We claim Ctrl+K even though some browsers map it
  // to the address bar — that's the established convention for in-app
  // palettes, and preventDefault only fires while the app has focus.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    // No-op fallback (same contract as useTheme/useDensity) so a
    // trigger rendered outside the provider degrades gracefully.
    return { open: false, setOpen: () => {}, toggle: () => {} };
  }
  return ctx;
}
