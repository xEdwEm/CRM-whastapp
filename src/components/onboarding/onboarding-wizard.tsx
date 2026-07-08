"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  GitBranch,
  Mail,
  MessageSquare,
  Smartphone,
  UserPlus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * OnboardingWizard — 3-step first-run flow:
 *   1. Connect WhatsApp (QR placeholder / Phone Number ID)
 *   2. Invite the team (Enter-to-add emails + shareable link)
 *   3. First pipeline (industry stage templates with a live preview)
 *
 * Presentation-only: nothing is persisted here. The host page decides
 * what to do with the result via `onComplete` (and may dismiss the
 * whole flow through `onSkip`).
 *
 * Step transitions slide horizontally following the travel direction.
 * The animation utilities are all `motion-safe:`-gated, so
 * prefers-reduced-motion users get an instant swap.
 */

export type PipelineTemplateId = "general" | "legal" | "retail";

export interface OnboardingResult {
  /** Meta Phone Number ID as typed, or null if the step was skipped. */
  phoneNumberId: string | null;
  whatsappConnected: boolean;
  invitedEmails: string[];
  pipelineTemplate: PipelineTemplateId | null;
}

export interface OnboardingWizardProps {
  onComplete: (result: OnboardingResult) => void;
  onSkip?: () => void;
  className?: string;
}

const STEP_COUNT = 3;

// Deliberately loose: the real dedup/normalization belongs to the
// invites backend. This only keeps obvious typos out of the list.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Static store for the useSyncExternalStore origin read below — the
// value never changes after load, so subscribing is a no-op.
const emptySubscribe = () => () => {};

/** Deterministic fake QR (a real one needs the WhatsApp session URL).
 *  Fixed bit pattern → identical SSR/client markup, no hydration risk. */
function QrPlaceholder() {
  const size = 11;
  const cells: boolean[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const corner =
        (x < 3 && y < 3) || (x > size - 4 && y < 3) || (x < 3 && y > size - 4);
      cells.push(corner || (x * 7 + y * 13 + ((x * y) % 5)) % 3 === 0);
    }
  }
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="size-36 rounded-lg bg-card p-2 ring-1 ring-border"
    >
      {cells.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={i % size}
            y={Math.floor(i / size)}
            width={0.9}
            height={0.9}
            className="fill-foreground"
          />
        ) : null,
      )}
    </svg>
  );
}

export function OnboardingWizard({
  onComplete,
  onSkip,
  className,
}: OnboardingWizardProps) {
  const t = useTranslations("Onboarding");

  const [step, setStep] = useState(0);
  // Which way the last transition traveled — picks the slide-in side.
  const [direction, setDirection] = useState<1 | -1>(1);

  // Step 1 — WhatsApp
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [connected, setConnected] = useState(false);

  // Step 2 — team
  const [emailDraft, setEmailDraft] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 3 — pipeline
  const [template, setTemplate] = useState<PipelineTemplateId | null>(null);

  const templates: {
    id: PipelineTemplateId;
    name: string;
    stages: string[];
  }[] = [
    // Stage lists live in the dictionary as one pipe-joined string per
    // template — next-intl has no array messages, and a single key per
    // template keeps the catalog easy to translate.
    { id: "general", name: t("templateGeneral"), stages: t("templateGeneralStages").split("|") },
    { id: "legal", name: t("templateLegal"), stages: t("templateLegalStages").split("|") },
    { id: "retail", name: t("templateRetail"), stages: t("templateRetailStages").split("|") },
  ];

  const stepDone = [
    connected || phoneNumberId.trim().length > 0,
    invitedEmails.length > 0,
    template !== null,
  ];

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(STEP_COUNT - 1, next));
      setDirection(clamped >= step ? 1 : -1);
      setStep(clamped);
    },
    [step],
  );

  const addEmail = useCallback(() => {
    const email = emailDraft.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setEmailError(t("invalidEmail"));
      return;
    }
    if (invitedEmails.includes(email)) {
      setEmailError(t("duplicateEmail"));
      return;
    }
    setInvitedEmails((prev) => [...prev, email]);
    setEmailDraft("");
    setEmailError(null);
  }, [emailDraft, invitedEmails, t]);

  // window.location.origin without a hydration mismatch: the server
  // snapshot renders the bare path and React swaps in the client value
  // right after hydrating (no setState-in-effect involved).
  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => "",
  );
  const inviteLink = `${origin}/join`;

  const copyInviteLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (permissions / non-secure context);
      // the visible readonly input remains selectable by hand.
    }
  }, [inviteLink]);

  const finish = useCallback(() => {
    onComplete({
      phoneNumberId: phoneNumberId.trim() || null,
      whatsappConnected: connected,
      invitedEmails,
      pipelineTemplate: template,
    });
  }, [onComplete, phoneNumberId, connected, invitedEmails, template]);

  const stepMeta = [
    { title: t("stepConnectTitle"), icon: Smartphone },
    { title: t("stepTeamTitle"), icon: UserPlus },
    { title: t("stepPipelineTitle"), icon: GitBranch },
  ];

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-2xl rounded-xl bg-card ring-1 ring-foreground/10",
        className,
      )}
    >
      {/* ---- Progress header: clickable steps + fill bar ---- */}
      <div className="border-b border-border p-4 sm:px-6">
        <ol className="flex items-center gap-2">
          {stepMeta.map((meta, i) => {
            const isCurrent = i === step;
            const isDone = stepDone[i];
            return (
              <li key={meta.title} className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={t("stepLabel", { number: i + 1, title: meta.title })}
                  className="group flex min-w-0 items-center gap-2"
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                          ? "bg-primary-soft-2 text-primary"
                          : "bg-muted text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {isDone ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "hidden truncate text-xs font-medium sm:block",
                      isCurrent ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {meta.title}
                  </span>
                </button>
                {i < STEP_COUNT - 1 && (
                  <span className="h-px flex-1 bg-border" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
        <div
          className="mt-3 h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEP_COUNT}
          aria-valuenow={step + 1}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 motion-reduce:transition-none"
            style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
          />
        </div>
      </div>

      {/* ---- Step body — keyed by step so each change remounts with a
             directional slide-in. ---- */}
      <div className="overflow-hidden p-4 sm:p-6">
        <div
          key={step}
          className={cn(
            "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
            direction === 1
              ? "motion-safe:slide-in-from-right-8"
              : "motion-safe:slide-in-from-left-8",
          )}
        >
          {step === 0 && (
            <section className="space-y-4">
              <header>
                <h2 className="text-lg font-semibold text-foreground">
                  {t("stepConnectTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("stepConnectDescription")}
                </p>
              </header>
              <div className="flex flex-col items-center gap-4 rounded-xl bg-card-2 p-5 sm:flex-row sm:items-start">
                <QrPlaceholder />
                <div className="w-full flex-1 space-y-3">
                  <p className="text-sm text-muted-foreground">{t("scanQr")}</p>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="onboarding-phone-number-id"
                      className="text-xs font-medium text-foreground"
                    >
                      {t("phoneNumberIdLabel")}
                    </label>
                    <Input
                      id="onboarding-phone-number-id"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      placeholder={t("phoneNumberIdPlaceholder")}
                      disabled={connected}
                    />
                  </div>
                  {connected ? (
                    <Badge className="gap-1 bg-primary-soft text-primary">
                      <Check className="size-3" />
                      {t("connected")}
                    </Badge>
                  ) : (
                    <Button size="sm" onClick={() => setConnected(true)}>
                      <MessageSquare data-icon="inline-start" />
                      {t("markConnected")}
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-4">
              <header>
                <h2 className="text-lg font-semibold text-foreground">
                  {t("stepTeamTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("stepTeamDescription")}
                </p>
              </header>

              <div className="space-y-1.5">
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => {
                      setEmailDraft(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEmail();
                      }
                    }}
                    placeholder={t("emailPlaceholder")}
                    aria-invalid={emailError ? true : undefined}
                    className="pl-8"
                  />
                </div>
                <p
                  className={cn(
                    "text-xs",
                    emailError ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {emailError ?? t("emailHint")}
                </p>
              </div>

              {invitedEmails.length > 0 && (
                <ul className="space-y-1.5">
                  {invitedEmails.map((email) => (
                    <li
                      key={email}
                      className="flex items-center gap-2 rounded-lg bg-card-2 px-3 py-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200"
                    >
                      <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {email}
                      </span>
                      <Badge variant="secondary">{t("pending")}</Badge>
                      <button
                        type="button"
                        aria-label={t("remove", { email })}
                        onClick={() =>
                          setInvitedEmails((prev) =>
                            prev.filter((e) => e !== email),
                          )
                        }
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">
                  {t("inviteLinkLabel")}
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={inviteLink} className="flex-1" />
                  <Button size="sm" variant="outline" onClick={copyInviteLink}>
                    {copied ? (
                      <Check data-icon="inline-start" className="text-primary" />
                    ) : (
                      <Copy data-icon="inline-start" />
                    )}
                    {copied ? t("copied") : t("copy")}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <header>
                <h2 className="text-lg font-semibold text-foreground">
                  {t("stepPipelineTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("stepPipelineDescription")}
                </p>
              </header>

              <div className="grid gap-3 sm:grid-cols-3">
                {templates.map((tpl) => {
                  const isSelected = template === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setTemplate(tpl.id)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        isSelected
                          ? "border-primary/60 bg-primary-soft ring-2 ring-primary/40"
                          : "border-border bg-card-2 hover:bg-muted/40",
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          {tpl.name}
                        </span>
                        {isSelected && <Check className="size-4 text-primary" />}
                      </span>
                      <span className="mt-2 block text-xs text-muted-foreground">
                        {tpl.stages.length} {t("stages")}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Chained-stage preview of the selected (or first) template */}
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-card-2 p-3">
                {(templates.find((tpl) => tpl.id === template) ?? templates[0]).stages.map(
                  (stage, i, arr) => (
                    <span key={stage} className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          template
                            ? "bg-primary-soft text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {stage}
                      </span>
                      {i < arr.length - 1 && (
                        <ChevronRight
                          aria-hidden
                          className="size-3.5 text-muted-foreground"
                        />
                      )}
                    </span>
                  ),
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ---- Footer nav ---- */}
      <div className="flex items-center justify-between gap-2 border-t border-border p-4 sm:px-6">
        <div>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              {t("skip")}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => goTo(step - 1)}>
              <ArrowLeft data-icon="inline-start" />
              {t("back")}
            </Button>
          )}
          {step < STEP_COUNT - 1 ? (
            <Button onClick={() => goTo(step + 1)}>
              {t("next")}
              <ArrowRight data-icon="inline-end" />
            </Button>
          ) : (
            <Button onClick={finish}>
              <Check data-icon="inline-start" />
              {t("finish")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
