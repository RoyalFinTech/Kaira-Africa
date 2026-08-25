import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status = 'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'success' | 'warning' | 'error' | 'info';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  active: { label: 'Active', variant: 'default', className: 'bg-primary/10 text-primary border-primary/20' },
  inactive: { label: 'Inactive', variant: 'secondary', className: 'bg-muted text-muted-foreground' },
  pending: { label: 'Pending', variant: 'secondary', className: 'bg-secondary/10 text-secondary border-secondary/20' },
  completed: { label: 'Completed', variant: 'default', className: 'bg-primary/10 text-primary border-primary/20' },
  failed: { label: 'Failed', variant: 'destructive', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  cancelled: { label: 'Cancelled', variant: 'secondary', className: 'bg-muted text-muted-foreground' },
  success: { label: 'Success', variant: 'default', className: 'bg-primary/10 text-primary border-primary/20' },
  warning: { label: 'Warning', variant: 'secondary', className: 'bg-secondary/10 text-secondary border-secondary/20' },
  error: { label: 'Error', variant: 'destructive', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  info: { label: 'Info', variant: 'outline', className: 'bg-accent/10 text-accent-foreground border-accent/20' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
