import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KairaLogo } from "@/components/common/KairaLogo";
import { cn } from "@/lib/utils";

export type KairaFeedbackTone = "success" | "error" | "warning";

type KairaFeedbackCardProps = {
  tone: KairaFeedbackTone;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

const toneClasses: Record<KairaFeedbackTone, { card: string; icon: string }> = {
  success: {
    card: "border-emerald-200 bg-emerald-50/90 text-emerald-950",
    icon: "bg-emerald-100 text-emerald-700",
  },
  error: {
    card: "border-rose-200 bg-rose-50/90 text-rose-950",
    icon: "bg-rose-100 text-rose-700",
  },
  warning: {
    card: "border-amber-200 bg-amber-50/90 text-amber-950",
    icon: "bg-amber-100 text-amber-700",
  },
};

/** Branded, accessible feedback for important Kaira Africa actions. */
export function KairaFeedbackCard({
  tone,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: KairaFeedbackCardProps) {
  const StatusIcon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : AlertTriangle;
  const role = tone === "error" ? "alert" : "status";
  const live = tone === "error" ? "assertive" : "polite";

  return (
    <section
      role={role}
      aria-live={live}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 shadow-sm",
        toneClasses[tone].card,
        className,
      )}
    >
      <KairaLogo width={42} className="shrink-0 rounded-xl border border-white bg-white p-1 shadow-sm" />
      <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", toneClasses[tone].icon)}>
        <StatusIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-5">{title}</h3>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 opacity-90">{description}</p>
        {actionLabel && onAction && (
          <Button type="button" size="sm" variant="outline" className="mt-3 bg-white/80" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </section>
  );
}
