import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { KairaLogo } from '@/components/common/KairaLogo';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const StatusIcon = props.variant === 'destructive'
          ? AlertTriangle
          : props.variant === 'success'
            ? CheckCircle2
            : Info;
        const statusClass = props.variant === 'destructive'
          ? 'bg-rose-100 text-rose-700'
          : props.variant === 'success'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-sky-100 text-sky-700';
        return (
          <Toast key={id} {...props}>
            <KairaLogo width={34} className="mr-1 shrink-0 rounded bg-white p-0.5" />
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${statusClass}`} aria-hidden="true">
              <StatusIcon className="h-4 w-4" />
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
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
