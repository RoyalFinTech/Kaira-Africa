import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/common/PageTransition";
import { PaginationControls } from "@/components/common/PaginationControls";
import { getAdminCrm } from "@/lib/platform-api";

export default function AdminCrmPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-crm", page],
    queryFn: () => getAdminCrm(page, 50),
  });
  const rows = data?.data ?? [];
  return <PageTransition><div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold flex items-center gap-2"><UsersRound className="h-7 w-7 text-amber-500"/>Platform CRM</h1><p className="text-slate-500 text-sm">Administrative visibility into customer relationships across Kaira businesses.</p></div>
    {isError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error instanceof Error ? error.message : "Could not load platform CRM records."}</div>}
    <Card><CardHeader><CardTitle>Customers across the platform ({data?.pagination.total ?? 0})</CardTitle></CardHeader><CardContent>
      {isLoading ? <div className="h-56 animate-pulse bg-slate-100 rounded-xl"/> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b text-left"><th className="py-3">Customer</th><th className="py-3">Business</th><th className="py-3">Contact</th><th className="py-3">CRM activity</th><th className="py-3">Status</th></tr></thead><tbody>{rows.map((r) => <tr key={r.customerId} className="border-b last:border-0"><td className="py-3 font-semibold">{r.customerName}</td><td className="py-3">{r.businessName}</td><td className="py-3 text-slate-500">{r.phone || r.email || "—"}</td><td className="py-3">{r.interactionCount}</td><td className="py-3"><Badge variant="outline">{r.customerStatus}</Badge></td></tr>)}</tbody></table>{rows.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No customer records to show.</p>}</div>}
      {!isLoading && data && <PaginationControls pagination={data.pagination} onPageChange={setPage} itemLabel="customers"/>}
    </CardContent></Card>
  </div></PageTransition>;
}
