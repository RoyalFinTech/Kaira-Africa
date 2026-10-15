import { AlertTriangle, CheckCircle2, Info, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KairaLogo } from "@/components/common/KairaLogo";

export type KairaFeedbackVariant = "success" | "error" | "warning" | "info";

type KairaFeedbackCardProps = {
  variant: KairaFeedbackVariant;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
};

const feedbackStyles: Record<KairaFeedbackVariant, {
  icon: LucideIcon;
  iconClass: string;
  cardClass: string;
  eyebrow: string;
}> = {
  success: {
    icon: CheckCircle2,
    iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    cardClass: "border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 text-emerald-950",
    eyebrow: "SUCCESS",
  },
  error: {
    icon: AlertTriangle,
    iconClass: "bg-rose-100 text-rose-700 ring-rose-200",
    cardClass: "border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50 text-rose-950",
    eyebrow: "ACTION REQUIRED",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "bg-amber-100 text-amber-800 ring-amber-200",
    cardClass: "border-amber-200 bg-gradient-to-r from-amber-50 via-white to-yellow-50 text-amber-950",
    eyebrow: "PLEASE NOTE",
  },
  info: {
    icon: Info,
    iconClass: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    cardClass: "border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-slate-50 text-emerald-950",
    eyebrow: "KAIRA AFRICA",
  },
};

/**
 * Shared, accessible feedback card for clear success, warning and failure states.
 * Every message carries Kaira Africa branding and never relies on raw object output.
 */
export function KairaFeedbackCard({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  onDismiss,
  className = "",
}: KairaFeedbackCardProps) {
  const style = feedbackStyles[variant];
  const StatusIcon = style.icon;

  return (
    <section
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`relative flex w-full items-start gap-3 rounded-2xl border p-4 shadow-sm sm:gap-4 sm:p-5 ${style.cardClass} ${className}`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ${style.iconClass}`} aria-hidden="true">
        <StatusIcon className="h-5 w-5" strokeWidth={2.5} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[10px] font-bold tracking-[0.18em] opacity-70">{style.eyebrow}</p>
          <KairaLogo width={86} className="h-auto max-h-6 rounded bg-white/90 px-1.5 py-0.5" />
        </div>
        <h3 className="mt-1 text-sm font-bold leading-5 sm:text-base">{title}</h3>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 opacity-85">{description}</p>
        {(actionLabel && onAction) && (
          <div className="mt-3">
            <Button type="button" size="sm" variant="outline" onClick={onAction} className="border-current/20 bg-white/80 font-semibold hover:bg-white">
              {actionLabel}
            </Button>
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
