"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bot,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Moon,
  Palette,
  PlugZap,
  Radio,
  Search,
  Settings,
  Sun,
  UserPlus,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useCommandPalette } from "@/hooks/use-command-palette";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

/**
 * CommandPalette — hand-rolled ⌘K palette (no cmdk in this project).
 * Overlay + centered panel, substring fuzzy filter, ↑↓/Enter/Esc
 * keyboard model, mouse hover synced with the active index.
 *
 * State resets (clear query on open, reset the highlight when the
 * result set changes) happen DURING RENDER by comparing against a
 * snapshot of the previous open/query values. Both alternatives are
 * error-level lint rules in this repo: setState inside a useEffect
 * trips react-hooks/set-state-in-effect, and a mutable ref of the
 * previous value trips react-hooks/refs (no ref access in render) —
 * so the snapshot lives in state, per the react.dev "adjusting state
 * from previous renders" pattern.
 */

type CommandSection = "navigation" | "actions";

interface Command {
  id: string;
  section: CommandSection;
  label: string;
  /** Extra substrings the filter should also match (e.g. the route). */
  keywords?: string;
  icon: LucideIcon;
  run: () => void;
}

/** Case- and accent-insensitive haystack normalization. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { mode, toggleMode } = useTheme();
  const t = useTranslations("CommandPalette");
  const tNav = useTranslations("Sidebar");

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), [setOpen]);

  // Ordered navigation-first so section grouping in the render below
  // can reuse the flat filtered order for the active index.
  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    return [
      { id: "nav-dashboard", section: "navigation", label: tNav("dashboard"), keywords: "/dashboard", icon: LayoutDashboard, run: go("/dashboard") },
      { id: "nav-inbox", section: "navigation", label: tNav("inbox"), keywords: "/inbox chat", icon: MessageSquare, run: go("/inbox") },
      { id: "nav-notifications", section: "navigation", label: tNav("notifications"), keywords: "/notifications", icon: Bell, run: go("/notifications") },
      { id: "nav-contacts", section: "navigation", label: tNav("contacts"), keywords: "/contacts", icon: Users, run: go("/contacts") },
      { id: "nav-pipelines", section: "navigation", label: tNav("pipelines"), keywords: "/pipelines deals kanban", icon: GitBranch, run: go("/pipelines") },
      { id: "nav-broadcasts", section: "navigation", label: tNav("broadcasts"), keywords: "/broadcasts campaigns", icon: Radio, run: go("/broadcasts") },
      { id: "nav-automations", section: "navigation", label: tNav("automations"), keywords: "/automations", icon: Zap, run: go("/automations") },
      { id: "nav-flows", section: "navigation", label: tNav("flows"), keywords: "/flows", icon: Workflow, run: go("/flows") },
      { id: "nav-agents", section: "navigation", label: tNav("aiAgents"), keywords: "/agents ai", icon: Bot, run: go("/agents") },
      { id: "nav-settings", section: "navigation", label: tNav("settings"), keywords: "/settings", icon: Settings, run: go("/settings") },
      {
        id: "action-mode",
        section: "actions",
        label: mode === "dark" ? t("actionToggleToLight") : t("actionToggleToDark"),
        keywords: "theme dark light mode",
        icon: mode === "dark" ? Sun : Moon,
        run: toggleMode,
      },
      { id: "action-broadcast", section: "actions", label: t("actionNewBroadcast"), keywords: "broadcast campaign send", icon: Radio, run: go("/broadcasts") },
      { id: "action-invite", section: "actions", label: t("actionInviteMember"), keywords: "team member invite", icon: UserPlus, run: go("/settings?tab=members") },
      { id: "action-whatsapp", section: "actions", label: t("actionConnectWhatsapp"), keywords: "whatsapp phone number", icon: PlugZap, run: go("/settings?tab=whatsapp") },
      { id: "action-theme", section: "actions", label: t("actionChangeTheme"), keywords: "accent color appearance theme", icon: Palette, run: go("/settings?tab=appearance") },
    ];
  }, [router, mode, toggleMode, t, tNav]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return commands;
    return commands.filter((cmd) =>
      normalize(`${cmd.label} ${cmd.keywords ?? ""}`).includes(q),
    );
  }, [commands, query]);

  // Render-phase state adjustment (see the header comment).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      if (query !== "") setQuery("");
      if (activeIndex !== 0) setActiveIndex(0);
    }
  }
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    if (activeIndex !== 0) setActiveIndex(0);
  }

  // Keep the highlighted row visible while arrowing through a long
  // list — DOM scroll only, no state involved.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  // Lock body scroll while the overlay is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const runCommand = useCallback(
    (cmd: Command) => {
      close();
      cmd.run();
    },
    [close],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeIndex];
      if (cmd) runCommand(cmd);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  if (!open) return null;

  const sections: { key: CommandSection; label: string }[] = [
    { key: "navigation", label: t("navigation") },
    { key: "actions", label: t("quickActions") },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]"
    >
      <button
        type="button"
        aria-label={t("close")}
        onClick={close}
        className="absolute inset-0 cursor-default bg-background/70 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
      />
      <div
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-top-2 motion-safe:duration-150"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            // Transient modal: focusing its input on open is the point.
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("noResults", { query: query.trim() })}
            </p>
          ) : (
            sections.map(({ key, label }) => {
              const items = filtered.filter((cmd) => cmd.section === key);
              if (items.length === 0) return null;
              return (
                <div key={key} className="mb-1 last:mb-0">
                  <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  {items.map((cmd) => {
                    // filtered keeps navigation-then-actions order, so
                    // the flat index doubles as the keyboard index.
                    const index = filtered.indexOf(cmd);
                    const isActive = index === activeIndex;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        data-index={index}
                        onClick={() => runCommand(cmd)}
                        onMouseMove={() => {
                          if (!isActive) setActiveIndex(index);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm",
                          isActive
                            ? "bg-primary-soft text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        <cmd.icon
                          className={cn(
                            "size-4 shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className="truncate">{cmd.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5">↑↓</kbd>
            {t("hintNavigate")}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5">↵</kbd>
            {t("hintOpen")}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5">esc</kbd>
            {t("hintClose")}
          </span>
        </div>
      </div>
    </div>
  );
}
