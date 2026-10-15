import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KairaLogo } from "@/components/common/KairaLogo";
import { cn } from "@/lib/utils";

export type KairaFeedbackTone = "success" | "error" | "warning" | "info";

type KairaFeedbackCardProps = {
  tone: KairaFeedbackTone;
  title: string;
  description: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

const toneStyles: Record<KairaFeedbackTone, {
  Icon: LucideIcon;
  panel: string;
  mark: string;
  icon: string;
  label: string;
}> = {
  success: {
    Icon: CheckCircle2,
    panel: "border-emerald-700/20 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/70 text-emerald-950",
    mark: "border-emerald-700/15 bg-white",
    icon: "text-emerald-700",
    label: "KAIRA AFRICA · COMPLETED",
  },
  error: {
    Icon: AlertTriangle,
    panel: "border-rose-700/20 bg-gradient-to-r from-rose-50 via-white to-rose-50/70 text-rose-950",
    mark: "border-rose-700/15 bg-white",
    icon: "text-rose-700",
    label: "KAIRA AFRICA · NEEDS ATTENTION",
  },
  warning: {
    Icon: ShieldAlert,
    panel: "border-amber-700/20 bg-gradient-to-r from-amber-50 via-white to-amber-50/70 text-amber-950",
    mark: "border-amber-700/15 bg-white",
    icon: "text-amber-700",
    label: "KAIRA AFRICA · CHECK REQUIRED",
  },
  info: {
    Icon: Info,
    panel: "border-sky-700/20 bg-gradient-to-r from-sky-50 via-white to-sky-50/70 text-sky-950",
    mark: "border-sky-700/15 bg-white",
    icon: "text-sky-700",
    label: "KAIRA AFRICA · INFORMATION",
  },
};

export function KairaFeedbackCard({
  tone,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: KairaFeedbackCardProps) {
  const style = toneStyles[tone];
  const Icon = style.Icon;

  return (
    <section
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 shadow-sm sm:p-5",
        style.panel,
        className,
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border p-2 shadow-sm", style.mark)}>
          <KairaLogo width={44} className="max-h-10 max-w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", style.icon)} aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="font-semibold leading-5">{title}</h3>
              <div className="mt-1 text-sm leading-6 opacity-90">{description}</div>
            </div>
          </div>
          {actionLabel && onAction && (
            <Button type="button" variant="outline" size="sm" onClick={onAction} className="mt-3 bg-white/80">
              {actionLabel}
            </Button>
          )}
          <p className="mt-3 border-t border-current/10 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-60">
            {style.label}
          </p>
        </div>
      </div>
      <div aria-hidden="true" className={cn("absolute -right-8 -top-9 h-24 w-24 rounded-full opacity-30 blur-2xl", style.icon.replace("text-", "bg-"))} />
    </section>
  );
}
