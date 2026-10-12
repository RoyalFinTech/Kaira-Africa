import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, HandCoins, TrendingDown, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KairaLogo } from "@/components/common/KairaLogo";
import { PageTransition } from "@/components/common/PageTransition";
import { PaginationControls } from "@/components/common/PaginationControls";
import { getAdminDailyLedger } from "@/lib/platform-api";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#197442", "#C23B52", "#D8B45A", "#3B82A0", "#7C6BB1"];
const label = (type: string) => ({
  sale: "Sale", expense: "Expense", debt: "Debt", debt_payment: "Debt payment", other_income: "Other income",
}[type] ?? type);

export default function AdminDailyLedgerPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-daily-ledger", page],
    queryFn: () => getAdminDailyLedger(page, 50),
  });
  const rows = data?.data ?? [];
  const summary = data?.summary;
  const mix = [
    { name: "Sales", value: summary?.sales ?? 0 },
    { name: "Expenses", value: summary?.expenses ?? 0 },
    { name: "Unpaid debts", value: summary?.unpaidDebt ?? 0 },
  ].filter((x) => x.value > 0);

  return <PageTransition><div className="space-y-6">
    <div><h1 className="flex items-center gap-2 font-display text-3xl font-bold"><BookOpen className="h-7 w-7 text-amber-500"/>Platform Daily Ledger</h1><p className="mt-1 text-sm text-slate-500">Read-only view of daily sales, expenses and debtor entries across Kaira Africa businesses.</p></div>
    {isError && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert"><KairaLogo width={32} className="shrink-0 rounded bg-white p-0.5"/><span>{error instanceof Error ? error.message : "Could not load platform ledger."}</span></div>}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-slate-500"><TrendingUp className="h-4 w-4 text-green-600"/>All recorded sales</p><p className="mt-2 text-2xl font-bold">{formatCurrency(summary?.sales ?? 0,"GMD")}</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-slate-500"><TrendingDown className="h-4 w-4 text-red-600"/>All recorded expenses</p><p className="mt-2 text-2xl font-bold">{formatCurrency(summary?.expenses ?? 0,"GMD")}</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-slate-500"><HandCoins className="h-4 w-4 text-amber-600"/>Unpaid debt entries</p><p className="mt-2 text-2xl font-bold">{formatCurrency(summary?.unpaidDebt ?? 0,"GMD")}</p></CardContent></Card>
    </div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-1"><CardHeader><CardTitle>Record mix</CardTitle></CardHeader><CardContent>
        {mix.length === 0 ? <div className="flex h-56 items-center justify-center text-sm text-slate-500">No daily ledger records yet.</div> : <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={mix} dataKey="value" nameKey="name" outerRadius={85} label>{mix.map((item, i) => <Cell key={item.name} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip formatter={(v) => formatCurrency(Number(v),"GMD")}/></PieChart></ResponsiveContainer>}
      </CardContent></Card>
      <Card className="xl:col-span-2"><CardHeader><CardTitle>Daily ledger entries ({data?.pagination.total ?? 0})</CardTitle></CardHeader><CardContent>
        {isLoading ? <div className="h-48 animate-pulse rounded-xl bg-slate-100"/> : rows.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">No business ledger entries have been recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-3 pr-3">Date</th><th className="py-3 pr-3">Business</th><th className="py-3 pr-3">Type</th><th className="py-3 pr-3">Description</th><th className="py-3 pr-3">Customer / debtor</th><th className="py-3 pr-3">Status</th><th className="py-3 text-right">Amount</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id} className="border-b last:border-0 align-top"><td className="py-3 pr-3 whitespace-nowrap">{r.recordedDate}</td><td className="py-3 pr-3 font-semibold">{r.businessName}</td><td className="py-3 pr-3"><Badge variant="outline">{label(r.entryType)}</Badge></td><td className="py-3 pr-3">{r.description}{r.category && <div className="text-xs text-slate-500">{r.category}</div>}</td><td className="py-3 pr-3">{r.customerName || "—"}{r.dueDate && <div className="text-xs text-slate-500">Due {r.dueDate}</div>}</td><td className="py-3 pr-3">{r.entryType === "debt" ? <Badge variant={r.status === "paid" ? "default" : "destructive"}>{r.status}</Badge> : <span className="text-xs text-slate-500">Recorded</span>}</td><td className="py-3 text-right whitespace-nowrap font-semibold">{formatCurrency(r.amount,r.currency)}</td></tr>)}</tbody></table></div>}
        {!isLoading && data && <PaginationControls pagination={data.pagination} onPageChange={setPage} itemLabel="ledger entries"/>}
      </CardContent></Card>
    </div>
    <p className="text-xs text-slate-500">For privacy and audit safety this page is read-only. Business owners manage individual entries from their own Daily Ledger page.</p>
  </div></PageTransition>;
}
