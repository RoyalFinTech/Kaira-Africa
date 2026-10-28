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
  Package,
  BookOpen,
  Sparkles,
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

        {/* Practical first steps: a real guide to the main tools, not just shortcuts. */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="relative overflow-hidden rounded-2xl border-emerald-100 shadow-sm">
            <CardContent className="relative p-5 sm:p-6">
              <svg aria-hidden="true" viewBox="0 0 180 120" className="pointer-events-none absolute right-2 top-2 h-24 w-36 opacity-90 sm:h-28 sm:w-44">
                <path d="M88 7C126 0 171 22 171 57s-28 57-64 56S24 97 30 62 51 13 88 7Z" fill="#D1FAE5"/>
                <path d="M76 27h55a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8H76a8 8 0 0 1-8-8V35a8 8 0 0 1 8-8Z" fill="#0D3B2A"/>
                <path d="m83 45 8 8-8 8m15 0h21" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="42" cy="28" r="6" fill="#E7B32B"/><circle cx="148" cy="98" r="5" fill="#B45309"/>
              </svg>
              <Badge className="mb-2 bg-emerald-100 text-emerald-900">A SIMPLE WAY TO START</Badge>
              <h2 className="max-w-md text-xl font-bold text-slate-900 sm:text-2xl">Build a clear daily routine</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">You do not need to fill every tool at once. Start with accurate records, review them, then plan your next action.</p>
              <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <li className="rounded-xl border border-slate-100 bg-slate-50 p-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-900 text-xs font-bold text-white">1</span><p className="mt-2 text-sm font-semibold text-slate-900">Record</p><p className="mt-1 text-xs leading-5 text-slate-600">Enter real sales, expenses or stock changes.</p></li>
                <li className="rounded-xl border border-slate-100 bg-slate-50 p-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-900 text-xs font-bold text-white">2</span><p className="mt-2 text-sm font-semibold text-slate-900">Review</p><p className="mt-1 text-xs leading-5 text-slate-600">Check dates, currency and saved totals.</p></li>
                <li className="rounded-xl border border-slate-100 bg-slate-50 p-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-900 text-xs font-bold text-white">3</span><p className="mt-2 text-sm font-semibold text-slate-900">Plan</p><p className="mt-1 text-xs leading-5 text-slate-600">Use tasks or savings goals for next steps.</p></li>
              </ol>
              <Link href="/tutorials"><Button variant="outline" className="mt-4 gap-2"><BookOpen className="h-4 w-4"/>Open tutorials <ArrowRight className="h-4 w-4"/></Button></Link>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 shadow-sm">
            <CardContent className="flex h-full flex-col items-start p-5 sm:p-6">
              <span className="rounded-xl bg-emerald-900 p-3 text-white"><Sparkles className="h-5 w-5"/></span>
              <h2 className="mt-3 text-lg font-bold text-slate-900">Need help using Kaira?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Ask the Visual Assistant for written step-by-step guidance, such as how to record a sale or organise tasks. This version is text-only and cannot view your screen or analyse images.</p>
              <p className="mt-3 text-xs leading-5 text-slate-600">Never enter passwords, PINs, one-time codes or confidential customer details. Verify important figures against your saved records.</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-4"><Link href="/visual-assistant"><Button className="gap-2 bg-[#0D3B2A] hover:bg-emerald-900"><Sparkles className="h-4 w-4"/>Ask assistant</Button></Link><Link href="/tutorials"><Button variant="outline">Learn the tools</Button></Link></div>
            </CardContent>
          </Card>
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

        {/* Feature shortcuts — consistent Kaira green surfaces, retaining the custom SVG artwork. */}
        <section aria-label="Business tools" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/inventory" className="group min-w-0">
            <Card className="h-full overflow-hidden border-emerald-900/10 bg-[#0D3B2A] text-white transition-shadow hover:shadow-lg hover:shadow-emerald-950/15">
              <div className="relative flex h-36 items-center justify-center overflow-hidden bg-emerald-950 p-2">
                <img src="https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=900&q=80" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-emerald-900/35 to-emerald-950/70" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-emerald-950/35 text-white shadow-lg backdrop-blur-sm"><Package aria-hidden="true" className="h-10 w-10" strokeWidth={1.5} /></div>
              </div>
              <CardContent className="p-4"><p className="font-semibold text-white">Inventory</p><p className="mt-1 text-sm leading-5 text-emerald-50/85">Track products, stock levels, costs and low-stock items.</p><span className="mt-3 inline-flex items-center text-sm font-semibold text-emerald-200">Manage stock <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span></CardContent>
            </Card>
          </Link>
          <Link href="/crm" className="group min-w-0">
            <Card className="h-full overflow-hidden border-emerald-900/10 bg-[#0D3B2A] text-white transition-shadow hover:shadow-lg hover:shadow-emerald-950/15">
              <div className="relative flex h-36 items-center justify-center overflow-hidden bg-emerald-950 p-2">
                <img src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-emerald-950/75 via-emerald-900/40 to-emerald-950/70" />
                <img src="/kaira-crm-premium-card.svg" alt="Customer relationship management workspace" className="relative z-10 h-full w-full object-contain drop-shadow-lg" loading="lazy" />
              </div>
              <CardContent className="p-4"><p className="font-semibold text-white">Customer CRM</p><p className="mt-1 text-sm leading-5 text-emerald-50/85">Manage customer profiles, notes, photos and follow-ups.</p><span className="mt-3 inline-flex items-center text-sm font-semibold text-emerald-200">Open CRM <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span></CardContent>
            </Card>
          </Link>
          <Link href="/investments" className="group min-w-0">
            <Card className="h-full overflow-hidden border-emerald-900/10 bg-[#0D3B2A] text-white transition-shadow hover:shadow-lg hover:shadow-emerald-950/15">
              <div className="relative flex h-36 items-center justify-center overflow-hidden bg-emerald-950 p-2">
                <img src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=900&q=80" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-emerald-950/75 via-emerald-900/40 to-emerald-950/70" />
                <img src="/images/investment-business-illustration.svg" alt="Small business investment planning" className="relative z-10 h-full w-full object-contain drop-shadow-lg" loading="lazy" />
              </div>
              <CardContent className="p-4"><p className="font-semibold text-white">Investment Planner</p><p className="mt-1 text-sm leading-5 text-emerald-50/85">Plan business costs, expected profit and daily results.</p><span className="mt-3 inline-flex items-center text-sm font-semibold text-emerald-200">Open planner <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span></CardContent>
            </Card>
          </Link>
          <Link href="/savings" className="group min-w-0">
            <Card className="h-full overflow-hidden border-emerald-900/10 bg-[#0D3B2A] text-white transition-shadow hover:shadow-lg hover:shadow-emerald-950/15">
              <div className="relative flex h-36 items-center justify-center overflow-hidden bg-emerald-950 p-2">
                <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=900&q=80" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-emerald-950/75 via-emerald-900/40 to-emerald-950/70" />
                <img src="/images/savings-wallet-illustration.svg" alt="Savings wallet and savings progress" className="relative z-10 h-full w-full object-contain drop-shadow-lg" loading="lazy" />
              </div>
              <CardContent className="p-4"><p className="font-semibold text-white">Savings Tracker</p><p className="mt-1 text-sm leading-5 text-emerald-50/85">Track deposits, withdrawals, goals and where money is kept.</p><span className="mt-3 inline-flex items-center text-sm font-semibold text-emerald-200">Track savings <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span></CardContent>
            </Card>
          </Link>
        </section>

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
