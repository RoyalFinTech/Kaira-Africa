import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, DollarSign, Users, Shield, Settings,
  FileText, CheckCheck, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageTransition } from '@/components/common/PageTransition';
import { EmptyState } from '@/components/common/EmptyState';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
} from '@workspace/api-client-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Notification } from '@workspace/api-client-react';

const typeIcon: Record<string, typeof Bell> = {
  transaction: DollarSign,
  team: Users,
  security: Shield,
  system: Settings,
  report: FileText,
  customer: Users,
};

const typeBg: Record<string, string> = {
  transaction: 'bg-green-100 dark:bg-green-950/30 text-green-600',
  team: 'bg-blue-100 dark:bg-blue-950/30 text-blue-600',
  security: 'bg-red-100 dark:bg-red-950/30 text-red-600',
  system: 'bg-slate-100 dark:bg-slate-800 text-slate-600',
  report: 'bg-purple-100 dark:bg-purple-950/30 text-purple-600',
  customer: 'bg-amber-100 dark:bg-amber-950/30 text-amber-600',
};

function groupByDate(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ];

  notifications.forEach((n) => {
    const d = new Date(n.createdAt);
    if (d >= today) groups[0].items.push(n);
    else if (d >= yesterday) groups[1].items.push(n);
    else groups[2].items.push(n);
  });

  return groups.filter((g) => g.items.length > 0);
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const Icon = typeIcon[notification.type] || Bell;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={[
        'flex items-start gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group',
        !notification.isRead ? 'bg-primary/[0.02]' : '',
      ].join(' ')}
      onClick={() => onRead(notification.id)}
    >
      {/* Unread dot */}
      <div className="mt-1 flex-shrink-0 w-2">
        {!notification.isRead && (
          <div className="w-2 h-2 rounded-full bg-secondary" />
        )}
      </div>

      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${typeBg[notification.type] || typeBg.system}`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm mb-0.5 ${!notification.isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1.5">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Dismiss */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useListNotifications();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });

  const markReadMutation = useMarkNotificationRead({
    mutation: { onSuccess: invalidate },
  });
  const markAllReadMutation = useMarkAllNotificationsRead({
    mutation: { onSuccess: invalidate },
  });

  const markRead = (id: string) => markReadMutation.mutate({ id });
  const markAllRead = () => markAllReadMutation.mutate();

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);
  const unreadCount = unread.length;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-1">
              🔔 Notifications
            </h1>
            <p className="text-muted-foreground text-sm">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2 text-xs">{notifications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge className="ml-2 text-xs bg-secondary text-sidebar-primary-foreground">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {isLoading ? (
                <div className="p-5 space-y-3 animate-pulse">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
                </div>
              ) : (
              <AnimatePresence>
                {groupByDate(notifications).map((group) => (
                  <div key={group.label}>
                    <div className="px-5 py-2.5 bg-muted/50 border-b border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {group.label}
                      </p>
                    </div>
                    {group.items.map((n) => (
                      <NotificationItem key={n.id} notification={n} onRead={markRead} />
                    ))}
                  </div>
                ))}
              </AnimatePresence>
              )}
              {!isLoading && notifications.length === 0 && (
                <div className="py-16">
                  <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="unread">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {unread.length === 0 ? (
                <div className="py-16">
                  <EmptyState icon={CheckCheck} title="All caught up" description="No unread notifications." />
                </div>
              ) : (
                <AnimatePresence>
                  {unread.map((n) => (
                    <NotificationItem key={n.id} notification={n} onRead={markRead} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>

          <TabsContent value="read">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {read.length === 0 ? (
                <div className="py-16">
                  <EmptyState icon={Bell} title="No read notifications" description="Notifications you've seen will appear here." />
                </div>
              ) : (
                read.map((n) => (
                  <NotificationItem key={n.id} notification={n} onRead={markRead} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
