import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KairaLogo } from "@/components/common/KairaLogo";

export type KairaFeedbackVariant = "success" | "error" | "info";

type KairaFeedbackCardProps = {
  variant: KairaFeedbackVariant;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

const styles: Record<KairaFeedbackVariant, { card: string; mark: string; heading: string; Icon: typeof CheckCircle2; role: "status" | "alert" }> = {
  success: {
    card: "border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-emerald-100/70 text-emerald-950",
    mark: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    heading: "text-emerald-950",
    Icon: CheckCircle2,
    role: "status",
  },
  error: {
    card: "border-rose-200 bg-gradient-to-br from-white via-rose-50 to-rose-100/60 text-rose-950",
    mark: "bg-rose-100 text-rose-700 ring-rose-200",
    heading: "text-rose-950",
    Icon: AlertCircle,
    role: "alert",
  },
  info: {
    card: "border-amber-200 bg-gradient-to-br from-white via-amber-50 to-amber-100/60 text-amber-950",
    mark: "bg-amber-100 text-amber-800 ring-amber-200",
    heading: "text-amber-950",
    Icon: Info,
    role: "status",
  },
};

export function KairaFeedbackCard({ variant, title, description, actionLabel, onAction }: KairaFeedbackCardProps) {
  const style = styles[variant];
  const Icon = style.Icon;

  return (
    <section
      role={style.role}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={"flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-start sm:gap-5 sm:p-5 " + style.card}
    >
      <div className="flex shrink-0 items-center gap-3 sm:block">
        <div className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-[#D8B45A]/30 bg-[#0D2818] p-2 shadow-sm">
          <KairaLogo width={88} className="max-w-full" />
        </div>
        <div className="sm:hidden">
          <p className="text-xs font-bold tracking-[0.16em] text-[#0D2818]">KAIRA AFRICA</p>
          <p className="text-[11px] text-muted-foreground">Business workspace</p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className={"mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 " + style.mark}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">Kaira Africa · {variant === "success" ? "Completed" : variant === "error" ? "Needs attention" : "Information"}</p>
            <h3 className={"text-base font-semibold leading-snug " + style.heading}>{title}</h3>
            <p className="mt-1 text-sm leading-6 opacity-90">{description}</p>
            {actionLabel && onAction && (
              <Button type="button" size="sm" variant="outline" className="mt-3 border-current/20 bg-white/70" onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
