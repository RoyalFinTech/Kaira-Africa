import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  ClipboardList,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminOverview } from "@/lib/platform-api";

const numberFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

const metrics = [
  { key: "users", label: "Registered users", description: "Accounts on Kaira Africa", icon: Users },
  { key: "businesses", label: "Businesses", description: "Business workspaces", icon: Building2 },
  { key: "customers", label: "Customers", description: "Customer profiles managed", icon: UserRound },
  { key: "transactions", label: "Transactions", description: "Recorded payment activity", icon: ArrowLeftRight },
] as const;

const quickLinks = [
  { label: "Platform records", description: "Browse registered users, businesses, customers and transactions.", href: "/admin/records", icon: ClipboardList },
  { label: "Platform analytics", description: "Review activity trends and transaction distribution.", href: "/admin/analytics", icon: TrendingUp },
  { label: "CRM & customers", description: "Review customer relationships and CRM activity.", href: "/admin/crm", icon: UserRound },
  { label: "Inventory", description: "Monitor product stock and low-stock signals.", href: "/admin/inventory", icon: Building2 },
  { label: "Daily ledger", description: "Review sales, expenses and debtor entries across businesses.", href: "/admin/daily-ledger", icon: Activity },
];

export default function AdminPortalOverviewPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getAdminOverview,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(118deg,#102d2a_0%,#123c32_48%,#1c4650_100%)] px-5 py-7 text-white shadow-xl shadow-emerald-950/10 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border-[28px] border-white/[0.05]" />
        <div className="pointer-events-none absolute -bottom-28 right-24 h-56 w-56 rounded-full bg-amber-300/[0.08] blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-100/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-100">
              <ShieldCheck className="h-3.5 w-3.5" /> Authorized access
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Platform overview</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/75">
              Monitor Kaira Africa activity, business growth and operational records from one secure workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-4 text-xs font-semibold text-white transition hover:bg-white/15 disabled:opacity-60 sm:self-auto"
          >
            <Activity className={["h-4 w-4", isFetching ? "animate-pulse" : ""].join(" ")} />
            {isFetching ? "Refreshing…" : "Refresh overview"}
          </button>
        </div>
      </section>

      {isError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error instanceof Error ? error.message : "The platform overview could not be loaded. Check your admin session and try again."}
        </div>
      )}

      <section aria-label="Platform metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const value = data?.metrics?.[metric.key];
          return (
            <Card key={metric.key} className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.025]">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                      {isLoading ? "—" : numberFormat.format(Number(value ?? 0))}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">{metric.description}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-5 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,#16845a,#d6a93d)]" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">Administration</p>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-900">Workspace tools</h2>
            </div>
            <span className="text-[11px] text-slate-500">Select a section to continue</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link href={item.href} key={item.href}>
                  <a className="group flex min-h-[118px] items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.02] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition group-hover:bg-emerald-800 group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-emerald-700" />
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
                    </span>
                  </a>
                </Link>
              );
            })}
          </div>
        </div>

        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.025]">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Platform snapshot</h2>
                <p className="text-[11px] text-slate-500">Current API overview response</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <span className="text-xs text-slate-500">Platform revenue total</span>
                <span className="text-sm font-bold text-slate-900">{isLoading ? "—" : numberFormat.format(Number(data?.metrics?.revenue ?? 0))}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <span className="text-xs text-slate-500">Countries represented</span>
                <span className="text-sm font-bold text-slate-900">{isLoading ? "—" : (data?.businessesByCountry?.length ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Revenue trend points</span>
                <span className="text-sm font-bold text-slate-900">{isLoading ? "—" : (data?.revenueTrend?.length ?? 0)}</span>
              </div>
            </div>
            <p className="mt-6 rounded-xl bg-slate-50 px-3 py-3 text-[11px] leading-5 text-slate-500">
              Totals are shown as returned by the administration API. This panel does not change customer or business records.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
