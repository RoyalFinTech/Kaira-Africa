import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, Plus, Phone, Mail, MessageSquare, CalendarCheck2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/common/PageTransition";
import { getCrmOverview, createCrmInteraction, completeCrmInteraction } from "@/lib/platform-api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function CrmPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["crm-overview"], queryFn: getCrmOverview });
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const customers = (data?.customers ?? []).filter((c) =>
    (c.firstName + " " + c.lastName).toLowerCase().includes(search.toLowerCase()) ||
    (c.company || "").toLowerCase().includes(search.toLowerCase())
  );
  const addNote = async () => {
    if (!customerId || !title || !note) return;
    setSaving(true);
    try {
      await createCrmInteraction({ customerId, type: "note", title, note, nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : undefined });
      setTitle(""); setNote(""); setNextActionAt(""); setCustomerId("");
      await qc.invalidateQueries({ queryKey: ["crm-overview"] });
    } finally { setSaving(false); }
  };

  return <PageTransition><div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="font-display text-3xl font-bold">CRM</h1><p className="text-muted-foreground text-sm">Manage customer relationships, notes, follow-ups and sales context.</p></div><Link href="/customers"><Button variant="outline" className="gap-2"><Users className="h-4 w-4" />Customer directory</Button></Link></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground">Customers</div><div className="text-2xl font-bold mt-1">{data?.metrics.totalCustomers ?? 0}</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-bold mt-1">{data?.metrics.activeCustomers ?? 0}</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground">Open follow-ups</div><div className="text-2xl font-bold mt-1">{data?.metrics.openFollowUps ?? 0}</div></CardContent></Card>
    </div>
    {isError && <Card><CardContent className="p-5 text-sm text-destructive">CRM data could not be loaded. Complete business onboarding and sign in again if this persists.</CardContent></Card>}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="xl:col-span-2"><CardHeader><CardTitle>Customer CRM</CardTitle><Input placeholder="Search customers or companies…" value={search} onChange={(e) => setSearch(e.target.value)} /></CardHeader><CardContent>
        {isLoading ? <div className="h-48 animate-pulse bg-muted rounded-xl" /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-3">Customer</th><th className="py-3">Contact</th><th className="py-3">Sales</th><th className="py-3">Status</th></tr></thead><tbody>
          {customers.map((c) => <tr key={c.id} className="border-b last:border-0"><td className="py-3"><Link href={"/customers/" + c.id} className="font-semibold hover:underline">{c.firstName} {c.lastName}</Link><div className="text-xs text-muted-foreground">{c.company || "—"}</div></td><td className="py-3 text-muted-foreground"><div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.phone || "—"}</div><div className="flex items-center gap-2 mt-1"><Mail className="h-3.5 w-3.5" />{c.email || "—"}</div></td><td className="py-3"><div className="font-semibold">{formatCurrency(c.totalSpend)}</div><div className="text-xs text-muted-foreground">{c.transactionCount} transactions</div></td><td className="py-3"><Badge variant="outline">{c.status}</Badge></td></tr>)}
        </tbody></table></div>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Log a CRM activity</CardTitle></CardHeader><CardContent className="space-y-3">
        <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Select customer</option>{data?.customers.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select>
        <Input placeholder="Activity title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="What happened? Next steps?…" value={note} onChange={(e) => setNote(e.target.value)} rows={5} />
        <Input type="datetime-local" value={nextActionAt} onChange={(e) => setNextActionAt(e.target.value)} />
        <Button onClick={addNote} disabled={saving || !customerId || !title || !note} className="w-full gap-2"><Plus className="h-4 w-4" />{saving ? "Saving…" : "Save CRM activity"}</Button>
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Recent interactions</CardTitle></CardHeader><CardContent className="space-y-3">
      {(data?.interactions ?? []).map((i) => <div key={i.id} className="p-3 rounded-lg border flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">{i.title}</span>{i.completedAt ? <Badge variant="secondary">Done</Badge> : i.nextActionAt ? <Badge variant="outline"><CalendarCheck2 className="h-3 w-3 mr-1" />Follow-up</Badge> : null}</div><p className="text-xs text-muted-foreground mt-1">{i.customerName} · {i.userName}</p><p className="text-sm mt-2">{i.note}</p><p className="text-xs text-muted-foreground mt-2">{formatDate(new Date(i.createdAt), "MMM d, yyyy HH:mm")}</p></div>{!i.completedAt && <Button size="icon" variant="ghost" onClick={async () => { await completeCrmInteraction(i.id); await qc.invalidateQueries({ queryKey: ["crm-overview"] }); }}><CheckCircle2 className="h-4 w-4" /></Button>}</div>)}
      {!data?.interactions?.length && <div className="text-sm text-muted-foreground text-center py-10">No CRM interactions yet.</div>}
    </CardContent></Card>
  </div></PageTransition>;
}
