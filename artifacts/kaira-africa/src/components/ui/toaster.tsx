import { isValidElement, type ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { KairaLogo } from "@/components/common/KairaLogo";
import { useToast } from "@/hooks/use-toast";
import { getReadableErrorMessage } from "@/lib/error-message";

function safeToastContent(value: ReactNode, fallback: string): ReactNode {
  if (typeof value === "string") {
    return value.trim() === "[object Object]" ? fallback : value;
  }
  if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (isValidElement(value)) return value;
  if (Array.isArray(value)) {
    return value.map((item, index) => <span key={index}>{safeToastContent(item, fallback)}</span>);
  }
  return getReadableErrorMessage(value, fallback);
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isSuccess = variant === "success";
        const isError = variant === "destructive";
        const isWarning = variant === "warning";
        const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : isWarning ? AlertTriangle : Info;
        const iconStyle = isSuccess
          ? "bg-emerald-100 text-emerald-700"
          : isError
            ? "bg-rose-100 text-rose-700"
            : isWarning
              ? "bg-amber-100 text-amber-800"
              : "bg-[#F8EBC7] text-[#0D2818]";

        return (
          <Toast key={id} {...props} variant={variant}>
            <div className="flex shrink-0 items-center gap-2">
              <KairaLogo width={74} className="rounded bg-white p-1" />
              <span className={"flex h-8 w-8 items-center justify-center rounded-full " + iconStyle}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <div className="grid min-w-0 flex-1 gap-1">
              {title && <ToastTitle>{safeToastContent(title, "Kaira Africa notice")}</ToastTitle>}
              {description && (
                <ToastDescription>
                  {safeToastContent(description, isError ? "Kaira Africa could not complete that action. Please try again." : "Please review this Kaira Africa notification.")}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
