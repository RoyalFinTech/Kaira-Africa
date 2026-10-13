import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Users,
  DollarSign,
  ArrowLeftRight,
  UserPlus,
  Plus,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/common/PageTransition';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useGetMe, useGetMyBusiness, useGetBusinessStats, useGetRevenueAnalytics } from '@workspace/api-client-react';
import { formatCurrency, formatDate, formatRelativeTime, getGreeting, getInitials, cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getDailyLedger } from '@/lib/platform-api';

export default function DashboardPage() {
  const { data: user } = useGetMe();
  const { data: business } = useGetMyBusiness();
  const { data: stats, isLoading: statsLoading } = useGetBusinessStats();
  const [revenuePeriod, setRevenuePeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const { data: revenueAnalytics, isLoading: revenueLoading } = useGetRevenueAnalytics({ period: revenuePeriod });
  const todayDate = new Date().toISOString().slice(0, 10);
  const { data: todayLedger } = useQuery({
    queryKey: ['daily-ledger', todayDate, todayDate],
    queryFn: () => getDailyLedger(todayDate, todayDate),
  });

  const greeting = useMemo(() => getGreeting(), []);
  const currentDate = useMemo(() => formatDate(new Date(), 'EEEE, MMMM dd, yyyy'), []);

  // Real data points from the backend's revenue aggregation — see
  // GET /analytics/revenue. Each label is a date (YYYY-MM-DD, bucketed
  // by day/week/month depending on period — see the backend's
  // resolveRange()). No fabricated points: an empty array here means
  // the business genuinely has no completed payments in this window,
  // and the chart renders its own empty state for that (see below).
  const revenueData = revenueAnalytics?.data ?? [];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              {greeting}, {user?.firstName}.
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with {business?.name} today.
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            {currentDate}
          </div>
        </div>

        {/* Welcome hero — generated artwork, backed by the existing daily-ledger workflow. */}
        <section className="relative isolate min-h-[225px] overflow-hidden rounded-2xl border border-primary/10 bg-[#0B2A1B] shadow-sm sm:min-h-[245px]">
          <img
            src="/kaira-dashboard-hero.webp"
            alt="A small business owner reviewing work on a laptop in her shop"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_42%]"
            loading="eager"
          />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#062317]/95 via-[#062317]/78 to-[#062317]/10 sm:to-[#062317]/25" />
          <div className="relative flex min-h-[225px] items-center p-5 sm:min-h-[245px] sm:p-8 lg:p-10">
            <div className="max-w-xl">
              <span className="inline-flex rounded-full border border-[#E9CA78]/50 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#F4D985] sm:text-xs">
                Built for Gambian businesses
              </span>
              <h2 className="mt-3 max-w-lg font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                Every sale. Every detail. One clearer picture.
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/85 sm:text-base">
                Keep sales, expenses, customers and stock in one place — so you can focus on the next step for your business.
              </p>
              <Link href="/daily-ledger">
                <Button className="mt-4 gap-2 bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/90">
                  Record today's activity <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stats?.revenueChange}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Transactions
                </CardTitle>
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {stats?.totalTransactions || 0}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stats?.transactionsChange}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Customers
                </CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {stats?.totalCustomers || 0}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stats?.customersChange}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Team Members
                </CardTitle>
                <UserPlus className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold text-foreground">
                  {stats?.teamMembers || 0}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    {stats?.teamChange} new
                  </Badge>
                  <span className="text-xs text-muted-foreground">this month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Daily ledger glance — backed by the same persisted entries used by the ledger and AI reports. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4 text-primary" />Today's Daily Ledger</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Your recorded cash sales, expenses and customer debt for today.</p>
            </div>
            <Link href="/daily-ledger"><Button variant="outline" size="sm">Open ledger <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Sales recorded</p><p className="mt-1 text-xl font-bold">{formatCurrency(todayLedger?.summary.sales || 0, 'GMD')}</p></div>
              <div className="rounded-lg bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Expenses recorded</p><p className="mt-1 text-xl font-bold">{formatCurrency(todayLedger?.summary.expenses || 0, 'GMD')}</p></div>
              <div className="rounded-lg bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Unpaid debtor balance</p><p className="mt-1 text-xl font-bold">{formatCurrency(todayLedger?.summary.outstandingDebt || 0, 'GMD')}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Overview</CardTitle>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Revenue chart period">
                {[
                  { label: 'Week', value: 'week' },
                  { label: 'Month', value: 'month' },
                  { label: 'Quarter', value: 'quarter' },
                  { label: 'Year', value: 'year' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={revenuePeriod === option.value ? 'default' : 'outline'}
                    aria-pressed={revenuePeriod === option.value}
                    onClick={() => setRevenuePeriod(option.value as typeof revenuePeriod)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <div className="h-[300px] bg-muted rounded-lg animate-pulse" />
            ) : revenueData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                No revenue recorded yet this period.
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `GMD ${(value / 1000).toFixed(1)}k`} />
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-md">
                        <div className="text-xs text-muted-foreground">{payload[0].payload.label}</div>
                        <div className="font-semibold text-foreground">{formatCurrency(payload[0].value as number)}</div>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Link href="/transactions">
                  <Button variant="ghost" size="sm">
                    View all <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats && stats.recentTransactions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No transactions yet.</p>
                )}
                {stats?.recentTransactions.map((txn, idx) => (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 bg-muted">
                        <AvatarFallback className="text-xs font-mono">
                          {txn.reference.slice(-4)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {txn.customerName || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {txn.reference}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className="font-display font-semibold text-foreground">
                          {formatCurrency(txn.amount)}
                        </p>
                        <StatusBadge status={txn.status as any} className="text-xs" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Link href="/activity">
                  <Button variant="ghost" size="sm">
                    View all <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats && stats.recentActivity.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>
                )}
                {stats?.recentActivity.map((activity, idx) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex gap-3"
                  >
                    <Avatar className="h-9 w-9 bg-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(activity.userName.split(' ')[0], activity.userName.split(' ')[1])}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{activity.userName}</span>{' '}
                        <span className="text-muted-foreground">{activity.description.toLowerCase()}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(activity.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/customers">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <Plus className="h-4 w-4" />
                  Add Customer
                </Button>
              </Link>
              <Link href="/team">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <UserPlus className="h-4 w-4" />
                  Add Team Member
                </Button>
              </Link>
              <Link href="/transactions">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <Plus className="h-4 w-4" />
                  New Transaction
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <FileText className="h-4 w-4" />
                  View Reports
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
