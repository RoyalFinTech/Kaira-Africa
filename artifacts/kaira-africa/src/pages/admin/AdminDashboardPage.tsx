import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Shield, Users, Building2, ArrowLeftRight, TrendingUp, UserCheck,
  ClipboardList, LogOut, Globe, Menu, X, Package, AlertTriangle,
} from "lucide-react";
import {
  CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KairaLogo } from "@/components/common/KairaLogo";
import { useLogout } from "@workspace/api-client-react";
import { clearToken, clearAdminInfo, getAdminInfo } from "@/lib/api-client";
import { getAdminOverview } from "@/lib/platform-api";
import { formatCurrency, getInitials } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/admin/dashboard", icon: Shield },
  { label: "Platform Records", href: "/admin/records", icon: Users },
  { label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
  { label: "CRM / Customers", href: "/admin/crm", icon: UserCheck },
  { label: "Inventory", href: "/admin/inventory", icon: Building2 },
  { label: "Daily Ledger", href: "/admin/daily-ledger", icon: ClipboardList },
] as const;

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const numberFormat = new Intl.NumberFormat("en");

export default function AdminDashboardPage() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const adminData = getAdminInfo();
  const logout = useLogout();

  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getAdminOverview,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const metrics = data?.metrics;

  const growthTrend = useMemo(() => {
    const userCounts = new Map((data?.userGrowthTrend ?? []).map((row) => [row.label, row.value]));
    const customerCounts = new Map((data?.customerGrowthTrend ?? []).map((row) => [row.label, row.value]));
    const labels = [...new Set([...userCounts.keys(), ...customerCounts.keys()])].sort();
    return labels.map((label) => ({
      label: label.slice(5),
      users: userCounts.get(label) ?? 0,
      customers: customerCounts.get(label) ?? 0,
    }));
  }, [data?.userGrowthTrend, data?.customerGrowthTrend]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        clearToken();
        clearAdminInfo();
        setLocation("/admin");
      },
    });
  };

  useEffect(() => {
    let cancelled = false;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
    fetch(`${apiBaseUrl.replace(/\/$/, "")}/health`)
      .then((response) => {
        if (!cancelled) setApiHealthy(response.ok);
      })
      .catch(() => {
        if (!cancelled) setApiHealthy(false);
      });
    return () => { cancelled = true; };
  }, []);

  const kpis = [
    { label: "Registered users", value: metrics?.users, icon: Users, href: "/admin/records", accent: "text-emerald-700 bg-emerald-50" },
    { label: "Businesses", value: metrics?.businesses, icon: Building2, href: "/admin/records", accent: "text-amber-700 bg-amber-50" },
    { label: "Customers", value: metrics?.customers, icon: UserCheck, href: "/admin/crm", accent: "text-sky-700 bg-sky-50" },
    { label: "Transactions", value: metrics?.transactions, icon: ArrowLeftRight, href: "/admin/records", accent: "text-violet-700 bg-violet-50" },
    { label: "Tracked products", value: metrics?.products, icon: Package, href: "/admin/inventory", accent: "text-cyan-800 bg-cyan-50" },
    { label: "Low-stock products", value: metrics?.lowStockProducts, icon: AlertTriangle, href: "/admin/inventory", accent: "text-rose-700 bg-rose-50" },
  ] as const;

  const stockHasData = (data?.productsByStockStatus ?? []).some((row) => row.value > 0);
  const hasTransactionStatus = (data?.transactionsByStatus ?? []).some((row) => row.value > 0);

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 lg:flex">
      <aside className="hidden h-screen w-[250px] shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 lg:sticky lg:top-0 lg:flex">
        <div className="p-5 pb-4">
          <div className="mb-4 w-fit rounded-xl bg-white p-2 shadow-sm"><KairaLogo width={136} /></div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2">
            <Shield className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-extrabold tracking-[0.14em] text-amber-200">ADMIN PORTAL</span>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <Avatar className="h-10 w-10 border border-amber-300/30">
              <AvatarFallback className="bg-amber-300 text-sm font-bold text-slate-950">
                {adminData ? getInitials(adminData.firstName, adminData.lastName) : "KA"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{adminData ? `${adminData.firstName} ${adminData.lastName}` : "Administrator"}</p>
              <p className="truncate text-xs text-slate-400">{adminData?.email ?? "Secure platform access"}</p>
            </div>
          </div>
        </div>
        <div className="mx-4 border-t border-white/10" />
        <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/admin/dashboard";
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex cursor-pointer items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors ${active ? "border-amber-300 bg-amber-300/10 font-semibold text-amber-200" : "border-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Button variant="ghost" onClick={handleLogout} disabled={logout.isPending} className="w-full justify-start gap-3 text-slate-300 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />{logout.isPending ? "Signing out…" : "Sign out"}
          </Button>
          <p className="px-3 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">Kaira Africa · Administration</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-amber-300 lg:hidden"><KairaLogo width={29} /></div>
            <div>
              <p className="text-sm font-bold text-slate-900">Administration overview</p>
              <p className="text-xs text-slate-500">Live platform activity and service health</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="outline" className={apiHealthy === null ? "border-slate-200 bg-slate-50 text-slate-500" : apiHealthy ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}>
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              {apiHealthy === null ? "Checking API" : apiHealthy ? "API online" : "API unreachable"}
            </Badge>
            <Button variant="outline" size="icon" aria-label={mobileMenuOpen ? "Close admin navigation" : "Open admin navigation"} className="lg:hidden" onClick={() => setMobileMenuOpen((value) => !value)}>
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleLogout} disabled={logout.isPending} className="hidden text-slate-500 hover:text-slate-900 sm:inline-flex">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
            <nav aria-label="Admin navigation mobile" className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <div onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-amber-300 hover:bg-amber-50">
                      <Icon className="h-4 w-4 shrink-0 text-amber-700" /><span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
              <Button variant="outline" onClick={handleLogout} className="min-h-11 justify-start gap-2">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </nav>
          </div>
        )}

        <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 xl:p-8">
          <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 shadow-sm sm:p-7">
            <img src="/kaira-dashboard-hero.webp" alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-20" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-900/85 to-emerald-950/65" />
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-amber-200">
                  <Shield className="h-3.5 w-3.5" /> Restricted administration
                </span>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Platform pulse</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Monitor registrations, businesses, customer growth, transaction status and inventory signals. Charts update automatically from saved platform records.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-xs text-slate-400">{dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for live data"}</p>
                <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isLoading} className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                  {isLoading ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
            </div>
          </section>

          {isError && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div><p className="font-bold">Platform overview could not be refreshed</p><p className="mt-1 text-rose-800">Check the admin session and API connection, then refresh the dashboard.</p></div>
            </div>
          )}

          <section aria-label="Platform totals" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {kpis.map((item) => {
              const Icon = item.icon;
              const value = item.value;
              return (
                <Link key={item.label} href={item.href}>
                  <Card className="h-full border-slate-200 transition-colors hover:border-amber-300 hover:shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.accent}`}><Icon className="h-5 w-5" /></div>
                        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Live</span>
                      </div>
                      <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950">{value === undefined ? "—" : numberFormat.format(value)}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{item.label}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card className="min-w-0 border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">User and customer growth</CardTitle>
                <p className="text-xs leading-5 text-slate-500">Daily new registrations over the last 14 days.</p>
              </CardHeader>
              <CardContent>
                {isLoading ? <div className="h-[280px] animate-pulse rounded-xl bg-slate-100" /> : growthTrend.length === 0 ? (
                  <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500">No new user or customer registrations in this period yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={growthTrend} margin={{ top: 12, right: 8, left: -18, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="users" name="New users" stroke="#047857" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="customers" name="New customers" stroke="#d97706" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Inventory health</CardTitle>
                <p className="text-xs leading-5 text-slate-500">Current product counts grouped by stock level.</p>
              </CardHeader>
              <CardContent>
                {!stockHasData ? (
                  <div className="flex h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center">
                    <Package className="h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">No inventory recorded</p>
                    <p className="mt-1 text-xs text-slate-500">The chart will populate when businesses add products.</p>
                    <Link href="/admin/inventory"><Button variant="outline" size="sm" className="mt-3">Open inventory</Button></Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_0.8fr]">
                    <ResponsiveContainer width="100%" height={245}>
                      <PieChart>
                        <Pie data={data?.productsByStockStatus ?? []} dataKey="value" nameKey="label" innerRadius={56} outerRadius={88} paddingAngle={3} label={({ value }) => value}>
                          {(data?.productsByStockStatus ?? []).map((row, index) => <Cell key={row.label} fill={row.label === "Out of stock" ? "#e11d48" : row.label === "Low stock" ? "#d97706" : CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {(data?.productsByStockStatus ?? []).map((row, index) => (
                        <div key={row.label} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                          <span className="flex min-w-0 items-center gap-2 text-xs text-slate-600"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.label === "Out of stock" ? "#e11d48" : row.label === "Low stock" ? "#d97706" : CHART_COLORS[index % CHART_COLORS.length] }} /><span className="truncate">{row.label}</span></span>
                          <span className="font-bold tabular-nums text-slate-900">{numberFormat.format(row.value)}</span>
                        </div>
                      ))}
                      <Link href="/admin/inventory"><Button variant="outline" className="w-full">Review stock levels</Button></Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card className="min-w-0 border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Transaction status mix</CardTitle>
                <p className="text-xs leading-5 text-slate-500">Actual transaction counts by status.</p>
              </CardHeader>
              <CardContent>
                {!hasTransactionStatus ? (
                  <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-500">No transactions have been recorded yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={data?.transactionsByStatus ?? []} dataKey="value" nameKey="label" outerRadius={82} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                        {(data?.transactionsByStatus ?? []).map((row, index) => <Cell key={row.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Platform revenue · 14 days</CardTitle>
                <p className="text-xs leading-5 text-slate-500">Completed payments, aggregated in the transaction currency model.</p>
              </CardHeader>
              <CardContent>
                {(data?.revenueTrend ?? []).length === 0 ? (
                  <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500">No completed payment revenue in this period.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={data?.revenueTrend ?? []} margin={{ top: 8, right: 8, left: 4, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Line type="monotone" dataKey="value" name="Revenue" stroke="#047857" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { href: "/admin/records", icon: Users, title: "Platform records", detail: "Review registered users, businesses and transactions." },
              { href: "/admin/analytics", icon: TrendingUp, title: "Platform analytics", detail: "Inspect trends and country distribution." },
              { href: "/admin/inventory", icon: Package, title: "Inventory monitoring", detail: "Find low-stock and out-of-stock products." },
            ].map((item) => {
              const Icon = item.icon;
              return <Link key={item.href} href={item.href}><Card className="h-full border-slate-200 transition-colors hover:border-amber-300"><CardContent className="flex gap-3 p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Icon className="h-5 w-5" /></div><div><p className="text-sm font-bold text-slate-900">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p></div></CardContent></Card></Link>;
            })}
          </section>

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2"><Shield className="h-4 w-4 text-amber-600" /> Administrator actions are authorized on the server; access is logged and monitored.</p>
            <p>Live refresh · every 30 seconds</p>
          </div>
        </main>
      </div>
    </div>
  );
}
