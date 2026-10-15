import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { KairaLogo } from "@/components/common/KairaLogo";

export type KairaFeedbackVariant = "success" | "error" | "info";

type KairaFeedbackCardProps = {
  variant: KairaFeedbackVariant;
  title: string;
  message: string;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
  testId?: string;
};

const visual = {
  success: {
    card: "border-emerald-800/20 bg-emerald-50 text-emerald-950",
    icon: "text-emerald-700",
    mark: "bg-white text-emerald-700 ring-1 ring-emerald-700/15",
  },
  error: {
    card: "border-rose-700/25 bg-rose-50 text-rose-950",
    icon: "text-rose-700",
    mark: "bg-white text-rose-700 ring-1 ring-rose-700/15",
  },
  info: {
    card: "border-amber-600/25 bg-amber-50 text-emerald-950",
    icon: "text-amber-700",
    mark: "bg-white text-amber-700 ring-1 ring-amber-700/15",
  },
} as const;

/** Accessible, Kaira Africa-branded feedback for completed and failed actions. */
export function KairaFeedbackCard({
  variant,
  title,
  message,
  action,
  onDismiss,
  className = "",
  testId,
}: KairaFeedbackCardProps) {
  const Icon = variant === "success" ? CheckCircle2 : variant === "error" ? AlertTriangle : Info;
  const styles = visual[variant];

  return (
    <section
      data-testid={testId ?? `kaira-feedback-${variant}`}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm sm:p-5 ${styles.card} ${className}`}
    >
      <div className="flex shrink-0 items-center gap-2">
        <KairaLogo width={42} className="rounded-lg bg-white p-1 shadow-sm" />
        <span className={`grid h-7 w-7 place-items-center rounded-full ${styles.mark}`}>
          <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <h3 className="font-semibold leading-5">{title}</h3>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 opacity-90">{message}</p>
        {action && <div className="mt-3 flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-current/60 transition hover:bg-black/5 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
