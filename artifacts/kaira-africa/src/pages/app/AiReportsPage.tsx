import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, RefreshCw, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/common/PageTransition";
import { getAiInsights, generateAiInsights } from "@/lib/platform-api";
import { useGetRevenueAnalytics, useGetCustomerAnalytics, useGetTransactionAnalytics } from "@workspace/api-client-react";
import { Area, AreaChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["hsl(var(--chart-1))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))"];

export default function AiReportsPage() {
  const qc = useQueryClient();
  const { data: insights = [], isLoading } = useQuery({ queryKey: ["ai-insights"], queryFn: getAiInsights });
  const { data: revenue } = useGetRevenueAnalytics({ period: "month" });
  const { data: customers } = useGetCustomerAnalytics({ period: "month" });
  const { data: transactions } = useGetTransactionAnalytics({ period: "month" });
  const generate = async () => { await generateAiInsights(); await qc.invalidateQueries({ queryKey: ["ai-insights"] }); };
  return <PageTransition><div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="font-display text-3xl font-bold flex items-center gap-2"><BrainCircuit className="h-7 w-7 text-primary" />AI Reports & Insights</h1><p className="text-muted-foreground text-sm">Business intelligence generated from your real Kaira data.</p></div><Button className="gap-2" onClick={generate}><RefreshCw className="h-4 w-4" />Generate insights</Button></div>
    {insights.length > 0 && (
      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
        {insights[0]?.payload?.source === "openai"
          ? "Model-generated summaries are enabled. Only aggregate revenue, customer counts, transaction totals and inventory totals are sent for narrative generation."
          : "Rule-based insights are active. To enable model-generated report narratives, configure OPENAI_API_KEY and OPENAI_MODEL in the API service environment. No customer names, emails, phone numbers or individual transaction records are sent to the model."}
      </div>
    )}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card><CardHeader><CardTitle>Sales trend</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={260}><AreaChart data={revenue?.data || []}><XAxis dataKey="label" fontSize={11}/><YAxis fontSize={11}/><Tooltip/><Area dataKey="value" type="monotone" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.12)"/></AreaChart></ResponsiveContainer><div className="mt-3 font-semibold">{formatCurrency(revenue?.total || 0)} revenue</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Transaction mix</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={transactions?.byType || []} dataKey="value" nameKey="label" outerRadius={90} label>{(transactions?.byType || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="mt-3 font-semibold">{customers?.total || 0} new customers in period</div></CardContent></Card>
    </div>
    {isLoading ? <div className="h-40 animate-pulse bg-muted rounded-xl"/> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{insights.slice(0, 8).map((i) => <Card key={i.id}><CardContent className="p-5"><div className="flex items-center gap-2 mb-2"><Lightbulb className="h-4 w-4 text-secondary"/><Badge variant="outline">{i.kind}</Badge></div><h3 className="font-semibold">{i.title}</h3><p className="text-sm text-muted-foreground mt-2 leading-relaxed">{i.summary}</p></CardContent></Card>)}</div>}
    {!insights.length && <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Generate your first AI insight set from the real business data.</CardContent></Card>}
  </div></PageTransition>;
}
