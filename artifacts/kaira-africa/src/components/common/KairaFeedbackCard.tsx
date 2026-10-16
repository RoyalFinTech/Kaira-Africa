import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type KairaFeedbackCardProps = {
  variant: "success" | "error" | "info";
  title: string;
  message: string;
  onDismiss?: () => void;
};

/** Compact, branded toast used for success, validation and API feedback. */
export function KairaFeedbackCard({ variant, title, message, onDismiss }: KairaFeedbackCardProps) {
  const isSuccess = variant === "success";
  const isError = variant === "error";
  const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;
  const accent = isSuccess
    ? "bg-emerald-500"
    : isError
      ? "bg-rose-500"
      : "bg-sky-500";
  const iconPalette = isSuccess
    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
    : isError
      ? "bg-rose-100 text-rose-700 ring-rose-200"
      : "bg-sky-100 text-sky-700 ring-sky-200";

  return (
    <section
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 pr-11 text-slate-900 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.025] sm:gap-3.5 sm:p-4 sm:pr-12"
      data-variant={variant}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-1.5 shadow-sm">
        <img src="/kaira-logo.png" alt="Kaira Africa" className="max-h-full max-w-full object-contain" />
        <span className={`absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white ${iconPalette}`}>
          <Icon className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-emerald-800">Kaira Africa</p>
        <p className="pr-1 text-[14px] font-bold leading-5 text-slate-900 sm:text-[15px]">{title}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-[1.45rem] text-slate-600 sm:text-sm">{message}</p>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
