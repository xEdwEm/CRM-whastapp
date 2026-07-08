import Link from "next/link"
import {
  Bell,
  Bot,
  GitBranch,
  Inbox,
  Radio,
  SearchX,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * EmptyState — the standard "nothing here yet" block: icon on a
 * primary-soft tile, title, one-liner, and up to two CTAs.
 *
 * The preset catalog below ships final Spanish copy per product
 * decision (the deliverable asked for ready-made Spanish presets),
 * bypassing next-intl on purpose. Presets only carry copy + icon;
 * the caller wires behavior by passing `primaryAction` /
 * `secondaryAction` (their labels default to the preset's).
 */

export type EmptyStatePresetKey =
  | "inbox"
  | "pipelines"
  | "contacts"
  | "broadcasts"
  | "automations"
  | "search"
  | "ai"
  | "notifications"

interface EmptyStateCopy {
  icon: LucideIcon
  title: string
  description: string
  primaryLabel?: string
  secondaryLabel?: string
}

export const EMPTY_STATE_PRESETS: Record<EmptyStatePresetKey, EmptyStateCopy> =
  {
    inbox: {
      icon: Inbox,
      title: "Todo tranquilo por aquí",
      description:
        "Cuando un cliente te escriba por WhatsApp, la conversación aparecerá en esta bandeja.",
      primaryLabel: "Conectar WhatsApp",
      secondaryLabel: "Importar contactos",
    },
    pipelines: {
      icon: GitBranch,
      title: "Aún no tienes pipelines",
      description:
        "Crea tu primer pipeline para arrastrar oportunidades entre etapas y no perder ninguna venta.",
      primaryLabel: "Crear pipeline",
      secondaryLabel: "Ver plantillas",
    },
    contacts: {
      icon: Users,
      title: "Sin contactos todavía",
      description:
        "Agrega tu primer contacto o importa tu lista existente para empezar a conversar.",
      primaryLabel: "Nuevo contacto",
      secondaryLabel: "Importar CSV",
    },
    broadcasts: {
      icon: Radio,
      title: "Ninguna difusión enviada",
      description:
        "Envía mensajes masivos con plantillas aprobadas y mide aperturas y respuestas desde aquí.",
      primaryLabel: "Crear difusión",
    },
    automations: {
      icon: Zap,
      title: "Sin automatizaciones activas",
      description:
        "Automatiza respuestas, asignaciones y etiquetas para que tu equipo se concentre en vender.",
      primaryLabel: "Nueva automatización",
      secondaryLabel: "Ver ejemplos",
    },
    search: {
      icon: SearchX,
      title: "Sin resultados",
      description:
        "No encontramos nada que coincida con tu búsqueda. Prueba con otros términos o limpia los filtros.",
      primaryLabel: "Limpiar filtros",
    },
    ai: {
      icon: Bot,
      title: "Tu asistente IA está listo",
      description:
        "Configura el asistente para que responda preguntas frecuentes y capture datos por ti.",
      primaryLabel: "Configurar IA",
    },
    notifications: {
      icon: Bell,
      title: "Estás al día",
      description:
        "No tienes notificaciones pendientes. Te avisaremos cuando pase algo importante.",
    },
  }

export interface EmptyStateAction {
  /** Falls back to the preset's suggested label when omitted. */
  label?: string
  onClick?: () => void
  /** Renders the CTA as a link instead of a button. */
  href?: string
}

export interface EmptyStateProps {
  preset?: EmptyStatePresetKey
  /** Explicit props override whatever the preset provides. */
  icon?: LucideIcon
  title?: string
  description?: string
  primaryAction?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  /** Tighter paddings + smaller tile, for sidebars and list panes. */
  compact?: boolean
  className?: string
}

function ActionButton({
  action,
  fallbackLabel,
  variant,
}: {
  action: EmptyStateAction
  fallbackLabel?: string
  variant: "default" | "outline"
}) {
  const label = action.label ?? fallbackLabel
  if (!label) return null
  if (action.href) {
    return (
      <Button size="sm" variant={variant} render={<Link href={action.href} />}>
        {label}
      </Button>
    )
  }
  return (
    <Button size="sm" variant={variant} onClick={action.onClick}>
      {label}
    </Button>
  )
}

export function EmptyState({
  preset,
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  compact = false,
  className,
}: EmptyStateProps) {
  const copy = preset ? EMPTY_STATE_PRESETS[preset] : undefined
  const Icon = icon ?? copy?.icon ?? Inbox
  const resolvedTitle = title ?? copy?.title
  const resolvedDescription = description ?? copy?.description

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-16",
        className
      )}
    >
      <div
        aria-hidden
        className={cn(
          "flex items-center justify-center rounded-xl bg-primary-soft text-primary",
          compact ? "size-10" : "size-14"
        )}
      >
        <Icon className={compact ? "size-5" : "size-6"} />
      </div>
      {resolvedTitle ? (
        <h3
          className={cn(
            "font-semibold text-foreground",
            compact ? "text-sm" : "mt-1 text-base"
          )}
        >
          {resolvedTitle}
        </h3>
      ) : null}
      {resolvedDescription ? (
        <p
          className={cn(
            "max-w-sm text-muted-foreground",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {resolvedDescription}
        </p>
      ) : null}
      {primaryAction || secondaryAction ? (
        <div className={cn("flex flex-wrap items-center justify-center gap-2", compact ? "mt-1" : "mt-2")}>
          {primaryAction ? (
            <ActionButton
              action={primaryAction}
              fallbackLabel={copy?.primaryLabel}
              variant="default"
            />
          ) : null}
          {secondaryAction ? (
            <ActionButton
              action={secondaryAction}
              fallbackLabel={copy?.secondaryLabel}
              variant="outline"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
