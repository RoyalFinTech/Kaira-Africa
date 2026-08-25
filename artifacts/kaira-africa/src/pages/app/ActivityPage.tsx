import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Filter, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PageTransition } from '@/components/common/PageTransition';
import { EmptyState } from '@/components/common/EmptyState';
import { useListActivity } from '@workspace/api-client-react';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import type { ActivityLog } from '@workspace/api-client-react';

const statusColors = {
  success: 'bg-green-500',
  info:    'bg-blue-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
};

const statusBadge = {
  success: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-950/20 dark:text-green-400',
  info:    'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400',
  warning: 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400',
  error:   'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/20 dark:text-red-400',
};

const entityColors: Record<string, string> = {
  Transaction: 'text-purple-600 bg-purple-50 border-purple-200',
  Customer:    'text-blue-600 bg-blue-50 border-blue-200',
  Team:        'text-green-600 bg-green-50 border-green-200',
  System:      'text-slate-600 bg-slate-50 border-slate-200',
  Business:    'text-amber-600 bg-amber-50 border-amber-200',
};

function ActivityItem({ log, isLast }: { log: ActivityLog; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${statusColors[log.status]}`} />
        {!isLast && <div className="w-px flex-1 bg-border mt-1.5" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {getInitials(log.userName.split(' ')[0], log.userName.split(' ')[1])}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">{log.userName}</span>
              <span className="text-sm text-muted-foreground">{log.description}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className={`text-xs ${entityColors[log.entityType] || entityColors.System}`}>
                {log.entityType}
              </Badge>
              <Badge variant="outline" className={`text-xs ${statusBadge[log.status]}`}>
                {log.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: activity = [], isLoading } = useListActivity({ limit: 100 });

  const filtered = activity.filter((log) => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (entityFilter !== 'all' && log.entityType !== entityFilter) return false;
    if (search && !log.userName.toLowerCase().includes(search.toLowerCase()) &&
        !log.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasFilters = statusFilter !== 'all' || entityFilter !== 'all' || search;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">
            Activity Log
          </h1>
          <p className="text-muted-foreground text-sm">
            Complete audit trail of all user and system actions.
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Input
                placeholder="Search activity…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="Transaction">Transaction</SelectItem>
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="Team">Team</SelectItem>
                  <SelectItem value="System">System</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                  onClick={() => { setStatusFilter('all'); setEntityFilter('all'); setSearch(''); }}>
                  <X className="h-3.5 w-3.5" /> Clear filters
                </Button>
              )}
              <div className="ml-auto">
                <Badge variant="outline" className="text-xs">
                  {filtered.length} event{filtered.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No activity found"
                description="No events match your current filters. Try adjusting the search criteria."
              />
            ) : (
              <div>
                {filtered.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <ActivityItem log={log} isLast={i === filtered.length - 1} />
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
