import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type KairaFeedbackCardProps = {
  variant: "success" | "error" | "info";
  title: string;
  message: string;
  onDismiss?: () => void;
};

/** Branded, accessible feedback for user-visible API results across Kaira Africa. */
export function KairaFeedbackCard({ variant, title, message, onDismiss }: KairaFeedbackCardProps) {
  const isSuccess = variant === "success";
  const isError = variant === "error";
  const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;
  const palette = isSuccess
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : isError
      ? "border-rose-200 bg-rose-50 text-rose-950"
      : "border-sky-200 bg-sky-50 text-sky-950";
  const iconPalette = isSuccess
    ? "bg-emerald-100 text-emerald-700"
    : isError
      ? "bg-rose-100 text-rose-700"
      : "bg-sky-100 text-sky-700";

  return (
    <section
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={`relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 pr-11 shadow-sm sm:p-5 ${palette}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 ring-1 ring-black/5">
        <img src="/kaira-logo.png" alt="Kaira Africa" className="max-h-9 max-w-9 object-contain" />
      </div>
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconPalette}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-5">{title}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 opacity-90">{message}</p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] opacity-60">Kaira Africa · Workspace notification</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="absolute right-3 top-3 rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
