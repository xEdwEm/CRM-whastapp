"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * TypingIndicator — "someone is writing" affordance for the thread.
 *
 * Two variants:
 *   • `bubble` (default) — a chat bubble with three staggered bouncing
 *     dots, shaped like an incoming message (rounded-bl-sm tail).
 *   • `inline` — plain "{name} is typing…" text plus mini dots, for
 *     headers / conversation rows.
 *
 * Purely presentational: mount/unmount it from whatever presence or
 * realtime signal the caller has. Bounce is motion-gated.
 */
export function TypingIndicator({
  name,
  variant = "bubble",
  className,
}: {
  /** Who is typing — omit for the generic label. */
  name?: string;
  variant?: "bubble" | "inline";
  className?: string;
}) {
  const t = useTranslations("Inbox.typingIndicator");
  const label = name ? t("typing", { name }) : t("typingGeneric");

  if (variant === "inline") {
    return (
      <span
        role="status"
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
          className,
        )}
      >
        {label}
        <Dots dotClassName="size-1" />
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "flex w-fit items-center rounded-2xl rounded-bl-sm bg-muted px-3.5 py-3",
        className,
      )}
    >
      <Dots />
      <span className="sr-only">{label}</span>
    </div>
  );
}

function Dots({ dotClassName }: { dotClassName?: string }) {
  return (
    <span aria-hidden className="flex items-end gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full bg-muted-foreground motion-safe:animate-bounce",
            dotClassName,
          )}
          // Staggered delays make the three dots read as a wave.
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}
