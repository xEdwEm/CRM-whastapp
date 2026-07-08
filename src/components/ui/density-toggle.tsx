"use client";

import { Rows2, Rows4, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useDensity, type Density } from "@/hooks/use-density";
import { cn } from "@/lib/utils";

/**
 * DensityToggle — segmented pill that flips the app between
 * comfortable and compact row spacing (see use-density.tsx). Labels
 * collapse to icon-only below `sm` to keep the header tight.
 */
export function DensityToggle({ className }: { className?: string }) {
  const t = useTranslations("DensityToggle");
  const { density, setDensity } = useDensity();

  const options: { value: Density; icon: LucideIcon; label: string }[] = [
    { value: "comfortable", icon: Rows2, label: t("comfortable") },
    { value: "compact", icon: Rows4, label: t("compact") },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted/50 p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = density === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={opt.label}
            onClick={() => setDensity(opt.value)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <opt.icon className="size-3.5" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
