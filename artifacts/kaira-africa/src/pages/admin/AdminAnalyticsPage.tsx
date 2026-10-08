import { useQuery } from "@tanstack/react-query";
import { Pie, PieChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Users, Building2, ArrowLeftRight, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/common/PageTransition";
import { getAdminOverview } from "@/lib/platform-api";

const COLORS = ["hsl(var(--chart-1))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))","hsl(var(--chart-5))"];

const KPI_CARDS = [
  { key: "users", label: "Users", icon: Users },
  { key: "businesses", label: "Businesses", icon: Building2 },
  { key: "customers", label: "Customers", icon: Users },
  { key: "transactions", label: "Transactions", icon: ArrowLeftRight },
] as const;

export default function AdminAnalyticsPage() {
  const { data } = useQuery({ queryKey: ["admin-overview"], queryFn: getAdminOverview });
  const metrics = data?.metrics;

  return <PageTransition><div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold flex items-center gap-2"><TrendingUp className="h-7 w-7 text-amber-500"/>Platform Analytics</h1><p className="text-slate-500 text-sm">Platform-wide trends and distribution from live Kaira data.</p></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{KPI_CARDS.map((item) => { const Icon = item.icon; return <Card key={item.key}><CardContent className="p-5"><Icon className="h-4 w-4 text-amber-500"/><div className="text-2xl font-bold mt-2">{metrics?.[item.key] ?? 0}</div><div className="text-xs text-slate-500">{item.label}</div></CardContent></Card>; })}</div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card><CardHeader><CardTitle>Revenue trend · last 14 days</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><LineChart data={data?.revenueTrend || []}><XAxis dataKey="label" fontSize={11}/><YAxis fontSize={11}/><Tooltip/><Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2}/></LineChart></ResponsiveContainer></CardContent></Card>
      <Card><CardHeader><CardTitle>Transactions by status</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={data?.transactionsByStatus || []} dataKey="value" nameKey="label" outerRadius={95} label>{(data?.transactionsByStatus || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Businesses by country</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{(data?.businessesByCountry || []).map((c) => <div key={c.label} className="rounded-xl border p-4"><div className="font-semibold">{c.label}</div><div className="text-2xl font-bold mt-1">{c.value}</div><div className="text-xs text-slate-500">businesses</div></div>)}</div></CardContent></Card>
  </div></PageTransition>;
}
