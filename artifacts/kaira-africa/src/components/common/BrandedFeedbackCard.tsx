import { AlertCircle, CheckCircle2, Info, RefreshCw, X } from "lucide-react";
import { KairaLogo } from "@/components/common/KairaLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BrandedFeedbackVariant = "success" | "error" | "info";

type BrandedFeedbackCardProps = {
  variant: BrandedFeedbackVariant;
  title: string;
  message: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
};

const feedbackStyle: Record<BrandedFeedbackVariant, {
  role: "status" | "alert";
  accent: string;
  icon: string;
  panel: string;
  Icon: typeof CheckCircle2;
  eyebrow: string;
}> = {
  success: {
    role: "status",
    accent: "bg-emerald-600",
    icon: "text-emerald-700",
    panel: "border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-amber-50",
    Icon: CheckCircle2,
    eyebrow: "SUCCESSFUL",
  },
  error: {
    role: "alert",
    accent: "bg-rose-600",
    icon: "text-rose-700",
    panel: "border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50",
    Icon: AlertCircle,
    eyebrow: "ACTION NEEDED",
  },
  info: {
    role: "status",
    accent: "bg-amber-500",
    icon: "text-amber-700",
    panel: "border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50",
    Icon: Info,
    eyebrow: "KAIRA AFRICA",
  },
};

export function BrandedFeedbackCard({
  variant,
  title,
  message,
  description,
  actionLabel,
  onAction,
  onDismiss,
  className,
}: BrandedFeedbackCardProps) {
  const style = feedbackStyle[variant];
  const Icon = style.Icon;

  return (
    <section
      role={style.role}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn(
        "relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border p-4 pr-3 shadow-sm sm:gap-4 sm:p-5",
        style.panel,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", style.accent)} />
      <div className="ml-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#D8B45A]/35 bg-white p-1.5 shadow-xs">
        <KairaLogo width={40} className="max-h-10 max-w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <Icon aria-hidden="true" className={cn("h-5 w-5 shrink-0", style.icon)} />
          <h3 className="font-semibold leading-tight text-slate-900">{title}</h3>
          <span className="rounded-full border border-[#D8B45A]/35 bg-white/75 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-emerald-950">
            {style.eyebrow}
          </span>
        </div>
        <p className="mt-1.5 break-words text-sm leading-6 text-slate-700">{message}</p>
        {description && <p className="mt-1 break-words text-xs leading-5 text-slate-500">{description}</p>}
        {actionLabel && onAction && (
          <Button type="button" size="sm" variant="outline" className="mt-3 border-emerald-900/15 bg-white/80" onClick={onAction}>
            <RefreshCw className="h-3.5 w-3.5" />
            {actionLabel}
          </Button>
        )}
      </div>
      {onDismiss && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Dismiss message"
          className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-900"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </section>
  );
}
