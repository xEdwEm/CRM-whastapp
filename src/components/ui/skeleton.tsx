import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Skeleton primitives.
 *
 * The base block combines Tailwind's pulse with a shimmer sweep
 * (`.skeleton-shimmer`, defined in globals.css — needs a ::after
 * pseudo-element so it can't be a utility). Both animations are
 * motion-gated: pulse via `motion-safe:`, shimmer via the
 * prefers-reduced-motion media query next to its keyframes.
 *
 * The named presets below copy the real geometry of each view
 * (paddings, avatar sizes, column counts) so the swap from skeleton
 * to content doesn't cause a layout jump. When a view's row anatomy
 * changes, update its preset in the same PR.
 */

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "skeleton-shimmer rounded-md bg-muted motion-safe:animate-pulse",
        className
      )}
      {...props}
    />
  )
}

/* ---------------------------------------------------------------- */
/* Presets — one per real view geometry                              */
/* ---------------------------------------------------------------- */

/** Mirrors `ConversationItem` in conversation-list.tsx: 40px circular
 *  avatar + name/time line + preview/badge line, same paddings. */
function SkeletonConversationRow() {
  return (
    // Same density-aware spacing as the real rows so the swap to
    // content doesn't shift the list under either density.
    <div className="flex w-full items-start gap-density px-3 py-density">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2 py-0.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-8" />
        </div>
        <Skeleton className="h-3 w-full max-w-44" />
      </div>
    </div>
  )
}

function SkeletonConversationList({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonConversationRow key={i} />
      ))}
    </div>
  )
}

/** Generic data table: header row + N body rows of M columns. The
 *  first column is wider (usually a name), the rest share the space. */
function SkeletonTable({
  rows = 6,
  columns = 4,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  const widths = ["w-3/4", "w-1/2", "w-2/3", "w-1/3"]
  return (
    <div aria-hidden className={cn("w-full", className)}>
      <div
        className="grid items-center gap-4 border-b border-border px-4 py-3"
        style={{ gridTemplateColumns: `2fr repeat(${columns - 1}, 1fr)` }}
      >
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="grid items-center gap-4 border-b border-border px-4 py-3.5"
          style={{ gridTemplateColumns: `2fr repeat(${columns - 1}, 1fr)` }}
        >
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              key={c}
              className={cn("h-3.5", widths[(r + c) % widths.length])}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Kanban board: N columns, each with a header pill and a stack of
 *  cards (two text lines + a meta row, like the pipeline deal cards). */
function SkeletonKanban({
  columns = 3,
  cards = 3,
  className,
}: {
  columns?: number
  cards?: number
  className?: string
}) {
  return (
    <div aria-hidden className={cn("flex gap-4 overflow-hidden", className)}>
      {Array.from({ length: columns }, (_, col) => (
        <div
          key={col}
          className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-card-2 p-3"
        >
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          {Array.from({ length: cards }, (_, i) => (
            <div
              key={i}
              className="space-y-2.5 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
            >
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="size-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Dashboard metric cards: label, big number, delta line. */
function SkeletonMetricCards({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  )
}

/** Chat thread: bubbles alternating sides with varied widths, like the
 *  message thread while history loads. */
function SkeletonChatBubbles({
  count = 6,
  className,
}: {
  count?: number
  className?: string
}) {
  // Fixed pattern (no randomness) so SSR and client render identically.
  const widths = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3", "w-3/5"]
  return (
    <div aria-hidden className={cn("flex flex-col gap-3 px-4 py-4", className)}>
      {Array.from({ length: count }, (_, i) => {
        const mine = i % 2 === 1
        return (
          <div
            key={i}
            className={cn("flex", mine ? "justify-end" : "justify-start")}
          >
            <Skeleton
              className={cn(
                "h-12 max-w-[75%] rounded-2xl",
                widths[i % widths.length],
                mine ? "rounded-br-sm" : "rounded-bl-sm"
              )}
            />
          </div>
        )
      })}
    </div>
  )
}

export {
  Skeleton,
  SkeletonConversationRow,
  SkeletonConversationList,
  SkeletonTable,
  SkeletonKanban,
  SkeletonMetricCards,
  SkeletonChatBubbles,
}
