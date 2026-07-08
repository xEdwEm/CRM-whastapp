"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ImageIcon, Trash2, UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SettingsPanelHead } from "./settings-panel-head";

/**
 * BrandingSettings — white-label panel: account logo + primary /
 * secondary brand colors, with a live mini app-shell preview.
 *
 * Every accent token the theming system knows (--primary, hover, the
 * two softs, ring, sidebar-primary…) is DERIVED from the picked hex by
 * converting sRGB → OKLab → OKLCH by hand (no color library in the
 * project), so a custom brand color sits in the exact same space as
 * the five native accents in globals.css and follows the same
 * hover/soft recipes.
 *
 * Persistence is NOT here: `onSave` receives the full BrandingValue
 * (logo data URL + hexes + derived CSS custom properties) and the host
 * decides where it goes (the future `account_branding` table).
 */

/* ------------------------------------------------------------------ */
/* Color math: sRGB hex → OKLCH                                        */
/* ------------------------------------------------------------------ */

// The `--${string}` key type lets the token map be passed straight to
// React's style prop (CSSProperties accepts custom-property keys).
export type BrandingTokens = Record<`--${string}`, string>;

export interface BrandingValue {
  logoDataUrl: string | null;
  logoFileName: string | null;
  primaryHex: string;
  secondaryHex: string;
  /** Derived OKLCH custom properties, ready for `account_branding`. */
  tokens: BrandingTokens;
}

export interface BrandingSettingsProps {
  initialValue?: Partial<Pick<BrandingValue, "logoDataUrl" | "logoFileName" | "primaryHex" | "secondaryHex">>;
  onSave: (value: BrandingValue) => void | Promise<void>;
}

/** `#abc` / `#aabbcc` (with or without #) → canonical `#aabbcc`, else null. */
export function normalizeHex(input: string): string | null {
  let hex = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return `#${hex.toLowerCase()}`;
}

function srgbChannelToLinear(c: number): number {
  // Inverse of the sRGB transfer function (IEC 61966-2-1).
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Hex → OKLCH via Björn Ottosson's reference OKLab matrices:
 * linear sRGB → LMS (cone response) → cube root → OKLab → polar form.
 * Matches CSS Color 4's `oklch()` within rounding.
 */
export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const r = srgbChannelToLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = srgbChannelToLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = srgbChannelToLinear(parseInt(hex.slice(5, 7), 16) / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l3 = Math.cbrt(l);
  const m3 = Math.cbrt(m);
  const s3 = Math.cbrt(s);

  const L = 0.2104542553 * l3 + 0.793617785 * m3 - 0.0040720468 * s3;
  const a = 1.9779984951 * l3 - 2.428592205 * m3 + 0.4505937099 * s3;
  const bb = 0.0259040371 * l3 + 0.7827717662 * m3 - 0.808675766 * s3;

  const c = Math.hypot(a, bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  // Below this chroma the hue angle is numeric noise (grays).
  return { l: L, c, h: c < 1e-4 ? 0 : h };
}

const round = (n: number, places: number) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

function fmtOklch(l: number, c: number, h: number, alpha?: string): string {
  const base = `${round(l, 3)} ${round(c, 3)} ${round(h, 1)}`;
  return alpha ? `oklch(${base} / ${alpha})` : `oklch(${base})`;
}

/**
 * The whole accent token family from two hexes, following the recipes
 * the native themes in globals.css use: hover = lighter and slightly
 * desaturated, softs = same color at 12% / 22% alpha, ring/chart-1/
 * sidebar-primary = the color itself. Secondary only feeds --chart-2
 * (that's the one per-accent chart companion the native themes set).
 */
export function deriveBrandTokens(
  primaryHex: string,
  secondaryHex: string,
): BrandingTokens {
  const p = hexToOklch(primaryHex);
  const s = hexToOklch(secondaryHex);
  const primary = fmtOklch(p.l, p.c, p.h);
  // Light accents (amber territory, L ≥ .7) need near-black text for
  // contrast; everything darker gets the near-white the other accents use.
  const primaryForeground =
    p.l >= 0.7 ? `oklch(0.18 0.03 ${round(p.h, 1)})` : "oklch(0.985 0 0)";
  const hover = fmtOklch(Math.min(p.l + 0.07, 0.97), Math.max(p.c - 0.02, 0), p.h);

  return {
    "--primary": primary,
    "--primary-foreground": primaryForeground,
    "--primary-hover": hover,
    "--primary-soft": fmtOklch(p.l, p.c, p.h, "0.12"),
    "--primary-soft-2": fmtOklch(p.l, p.c, p.h, "0.22"),
    "--ring": primary,
    "--chart-1": primary,
    "--chart-2": fmtOklch(s.l, s.c, s.h),
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": primaryForeground,
    "--sidebar-ring": primary,
  };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const ACCEPTED_TYPES = ["image/png", "image/svg+xml", "image/jpeg"];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

// Roughly the five native accents plus a few extras, as hex seeds.
const SWATCHES = [
  "#7c3aed",
  "#10b981",
  "#2563eb",
  "#f59e0b",
  "#e11d48",
  "#0d9488",
  "#0284c7",
  "#64748b",
];

export function BrandingSettings({ initialValue, onSave }: BrandingSettingsProps) {
  const t = useTranslations("Branding");

  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(
    initialValue?.logoDataUrl ?? null,
  );
  const [logoFileName, setLogoFileName] = useState<string | null>(
    initialValue?.logoFileName ?? null,
  );
  const [logoError, setLogoError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [primaryHex, setPrimaryHex] = useState(
    initialValue?.primaryHex ?? "#7c3aed",
  );
  const [secondaryHex, setSecondaryHex] = useState(
    initialValue?.secondaryHex ?? "#10b981",
  );

  const [liveApply, setLiveApply] = useState(false);
  const [saving, setSaving] = useState(false);

  const tokens = useMemo(
    () => deriveBrandTokens(primaryHex, secondaryHex),
    [primaryHex, secondaryHex],
  );

  // "Apply live" — writes the derived tokens as inline custom
  // properties on <html>, overriding the active data-theme block.
  // Cleanup removes them, so toggling off (or unmounting the panel)
  // falls back to the user's saved accent instantly.
  useEffect(() => {
    if (!liveApply) return;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(tokens)) {
      root.style.setProperty(key, value);
    }
    return () => {
      for (const key of Object.keys(tokens)) {
        root.style.removeProperty(key);
      }
    };
  }, [liveApply, tokens]);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setLogoError(t("logoWrongType"));
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        setLogoError(t("logoTooLarge"));
        return;
      }
      setLogoError(null);
      const reader = new FileReader();
      reader.onload = () => {
        setLogoDataUrl(typeof reader.result === "string" ? reader.result : null);
        setLogoFileName(file.name);
      };
      reader.readAsDataURL(file);
    },
    [t],
  );

  const handleSave = useCallback(async () => {
    const value: BrandingValue = {
      logoDataUrl,
      logoFileName,
      primaryHex,
      secondaryHex,
      tokens,
    };
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  }, [logoDataUrl, logoFileName, primaryHex, secondaryHex, tokens, onSave]);

  return (
    <section className="max-w-3xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead title={t("title")} description={t("description")} />

      <div className="space-y-8">
        {/* ---- Logo ---- */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{t("logoLabel")}</h3>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors",
              dragActive
                ? "border-primary bg-primary-soft"
                : "border-border bg-card-2",
            )}
          >
            {logoDataUrl ? (
              <>
                {/* Data-URL preview — next/image can't optimize these. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoDataUrl}
                  alt={logoFileName ?? t("logoLabel")}
                  className="max-h-16 max-w-48 object-contain"
                />
                <p className="text-xs text-muted-foreground">{logoFileName}</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud data-icon="inline-start" />
                    {t("logoReplace")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setLogoDataUrl(null);
                      setLogoFileName(null);
                    }}
                  >
                    <Trash2 data-icon="inline-start" />
                    {t("logoRemove")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span
                  aria-hidden
                  className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary"
                >
                  <ImageIcon className="size-5" />
                </span>
                <p className="text-sm text-foreground">
                  {t("logoDrop")}{" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {t("logoBrowse")}
                  </button>
                </p>
                <p className="text-xs text-muted-foreground">{t("logoHint")}</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                // Allow re-picking the same file after a remove.
                e.target.value = "";
              }}
            />
          </div>
          {logoError && <p className="text-xs text-destructive">{logoError}</p>}
        </div>

        {/* ---- Colors ---- */}
        <div className="grid gap-6 sm:grid-cols-2">
          <ColorField
            id="branding-primary"
            label={t("primaryColor")}
            value={primaryHex}
            onChange={setPrimaryHex}
          />
          <ColorField
            id="branding-secondary"
            label={t("secondaryColor")}
            value={secondaryHex}
            onChange={setSecondaryHex}
          />
        </div>

        {/* ---- Live preview ---- */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {t("livePreview")}
          </h3>
          <BrandPreview tokens={tokens} logoDataUrl={logoDataUrl} />
        </div>

        {/* ---- Apply live + save ---- */}
        <div className="flex flex-col gap-4 rounded-xl bg-card-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-start gap-3">
            <Switch
              checked={liveApply}
              onCheckedChange={(checked) => setLiveApply(checked === true)}
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                {t("applyLive")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("applyLiveHint")}
              </span>
            </span>
          </label>
          <Button onClick={handleSave} disabled={saving}>
            <Check data-icon="inline-start" />
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Color field: native picker + manual hex + swatches                  */
/* ------------------------------------------------------------------ */

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  // The text input keeps its own draft so partially-typed hexes don't
  // thrash the committed color; valid drafts commit as you type.
  const [draft, setDraft] = useState(value);

  // Resync the draft when the committed value changes from outside
  // (picker drag / swatch click). Render-phase adjust against a state
  // snapshot of the previous prop — setState-in-a-useEffect and
  // ref-access-in-render are both error-level lint rules in this repo.
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    if (draft !== value) setDraft(value);
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="size-9 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-1"
        />
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const normalized = normalizeHex(e.target.value);
            if (normalized) onChange(normalized);
          }}
          onBlur={() => setDraft(value)}
          spellCheck={false}
          className="w-28 font-mono text-xs uppercase"
          aria-label={`${label} (hex)`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={hex}
            title={hex}
            onClick={() => onChange(hex)}
            className={cn(
              "size-6 rounded-full border border-foreground/10 transition-transform motion-safe:hover:scale-110",
              value === hex && "ring-2 ring-ring ring-offset-2 ring-offset-background",
            )}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mini app-shell preview                                              */
/* ------------------------------------------------------------------ */

/**
 * Isolated mock of the real shell (sidebar + header + conversation
 * list + composer). The derived tokens are applied as inline custom
 * properties on the wrapper, so every `bg-primary` / `text-primary`
 * inside re-themes instantly while the user drags the picker — without
 * touching the actual app (that's what the "apply live" switch is
 * for). Demo copy is intentionally hardcoded: it's fake data.
 */
function BrandPreview({
  tokens,
  logoDataUrl,
}: {
  tokens: BrandingTokens;
  logoDataUrl: string | null;
}) {
  return (
    <div
      aria-hidden
      style={tokens}
      className="pointer-events-none select-none overflow-hidden rounded-xl border border-border"
    >
      <div className="flex h-64 bg-background text-foreground">
        {/* Sidebar */}
        <div className="hidden w-36 shrink-0 flex-col border-r border-border bg-card p-2.5 sm:flex">
          <div className="flex items-center gap-1.5 px-1 pb-3">
            {logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoDataUrl}
                alt=""
                className="h-5 max-w-24 object-contain"
              />
            ) : (
              <>
                <span className="flex size-5 items-center justify-center rounded-md bg-primary text-[9px] font-bold text-primary-foreground">
                  W
                </span>
                <span className="text-[10px] font-semibold">Mi empresa</span>
              </>
            )}
          </div>
          <div className="space-y-1">
            <div className="rounded-md bg-primary-soft px-2 py-1.5 text-[10px] font-medium text-primary">
              Bandeja
            </div>
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
              Contactos
            </div>
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
              Pipelines
            </div>
          </div>
          <div className="mt-auto flex items-center gap-1.5 px-1">
            <span className="size-4 rounded-full bg-primary-soft-2" />
            <span className="h-1.5 w-12 rounded bg-muted" />
          </div>
        </div>

        {/* Main pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[11px] font-semibold">Bandeja de entrada</span>
            <span
              className="size-4 rounded-full"
              style={{ backgroundColor: "var(--chart-2)" }}
            />
          </div>
          <div className="flex-1 space-y-px overflow-hidden">
            {[
              { name: "María López", msg: "¡Gracias por la info!", unread: 2 },
              { name: "Carlos Ruiz", msg: "¿Tienen envíos hoy?", unread: 0 },
              { name: "Ana Torres", msg: "Perfecto, quedo atenta.", unread: 1 },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-2 px-3 py-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold">
                  {c.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-medium">
                    {c.name}
                  </span>
                  <span className="block truncate text-[9px] text-muted-foreground">
                    {c.msg}
                  </span>
                </span>
                {c.unread > 0 && (
                  <span className="flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                    {c.unread}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border p-2.5">
            <span className="h-6 flex-1 rounded-full bg-muted" />
            <span className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground">
              Responder
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
