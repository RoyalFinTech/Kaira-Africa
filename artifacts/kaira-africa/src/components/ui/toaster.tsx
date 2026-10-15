import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { KairaLogo } from '@/components/common/KairaLogo';
import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant = 'default', ...props }) {
        const StatusIcon = variant === 'success' ? CheckCircle2 : variant === 'destructive' ? AlertTriangle : Info;
        const statusIconClass = variant === 'success'
          ? 'text-emerald-700'
          : variant === 'destructive'
            ? 'text-red-100'
            : 'text-amber-700';
        return (
          <Toast key={id} {...props} variant={variant}>
            <KairaLogo width={34} className="mr-1 shrink-0 rounded bg-white p-0.5" />
            <StatusIcon aria-hidden="true" className={'h-5 w-5 shrink-0 ' + statusIconClass} strokeWidth={2.5} />
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
