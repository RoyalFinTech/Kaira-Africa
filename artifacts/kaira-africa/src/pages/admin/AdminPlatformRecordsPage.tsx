import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Building2, UserRound, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KairaLogo } from "@/components/common/KairaLogo";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PageTransition } from "@/components/common/PageTransition";
import { getAdminPlatformRecords } from "@/lib/platform-api";
import { formatCurrency } from "@/lib/utils";

function LoadError({ message }: { message: string }) {
  return <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert"><KairaLogo width={30} className="shrink-0 rounded bg-white p-0.5"/><span>{message}</span></div>;
}

export default function AdminPlatformRecordsPage() {
  const [usersPage, setUsersPage] = useState(1);
  const [businessesPage, setBusinessesPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-platform-records", usersPage, businessesPage, customersPage, transactionsPage],
    queryFn: () => getAdminPlatformRecords({ usersPage, businessesPage, customersPage, transactionsPage, pageSize: 50 }),
  });
  const emptyPage = { page: 1, pageSize: 50, total: 0, totalPages: 1 };
  const d = data ?? {
    users: [], businesses: [], customers: [], transactions: [],
    pagination: { users: emptyPage, businesses: emptyPage, customers: emptyPage, transactions: emptyPage },
  };
  const summaries = [
    { name: "Users", value: data?.pagination.users.total ?? 0, Icon: Users },
    { name: "Businesses", value: data?.pagination.businesses.total ?? 0, Icon: Building2 },
    { name: "Customers", value: data?.pagination.customers.total ?? 0, Icon: UserRound },
    { name: "Transactions", value: data?.pagination.transactions.total ?? 0, Icon: ArrowLeftRight },
  ];

  return <PageTransition><div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold text-slate-900">Platform Records</h1><p className="mt-1 text-sm text-slate-500">Read-only cross-business records for platform administration. Use the page controls to browse the full dataset.</p></div>
    {isError && <LoadError message={error instanceof Error ? error.message : "Could not load platform records."}/>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{summaries.map(({name,value,Icon})=><Card key={name}><CardContent className="p-5"><Icon className="h-5 w-5 text-amber-500"/><p className="mt-2 text-xs text-slate-500">Recent {name.toLowerCase()}</p><p className="text-2xl font-bold">{isLoading ? "—" : value}</p></CardContent></Card>)}</div>

    <Card><CardHeader><CardTitle>Registered users</CardTitle></CardHeader><CardContent>
      {isLoading ? <div className="h-32 animate-pulse rounded-xl bg-slate-100"/> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-3 pr-3">Name</th><th className="py-3 pr-3">Phone</th><th className="py-3 pr-3">Email</th><th className="py-3 pr-3">Business</th><th className="py-3 pr-3">Role</th><th className="py-3">Status</th></tr></thead><tbody>{d.users.map((u)=><tr key={u.id} className="border-b last:border-0"><td className="py-3 pr-3 font-semibold">{u.name}</td><td className="py-3 pr-3 whitespace-nowrap">{u.phone}</td><td className="py-3 pr-3">{u.email || "—"}</td><td className="py-3 pr-3">{u.businessName || "No business linked"}</td><td className="py-3 pr-3"><Badge variant="outline">{u.role}</Badge></td><td className="py-3"><Badge variant={u.status === "active" ? "default" : "destructive"}>{u.status}</Badge></td></tr>)}</tbody></table>{!d.users.length && <p className="py-6 text-center text-sm text-slate-500">No registered users to show.</p>}</div>}
      {!isLoading && data && <PaginationControls pagination={data.pagination.users} onPageChange={setUsersPage} itemLabel="users" />}
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Registered businesses</CardTitle></CardHeader><CardContent>
      {isLoading ? <div className="h-32 animate-pulse rounded-xl bg-slate-100"/> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-3 pr-3">Business</th><th className="py-3 pr-3">Type</th><th className="py-3 pr-3">Industry</th><th className="py-3 pr-3">Location</th><th className="py-3 pr-3">Contact</th><th className="py-3">Status</th></tr></thead><tbody>{d.businesses.map((b)=><tr key={b.id} className="border-b last:border-0"><td className="py-3 pr-3 font-semibold">{b.name}</td><td className="py-3 pr-3">{b.type}</td><td className="py-3 pr-3">{b.industry}</td><td className="py-3 pr-3">{b.city}, {b.country}</td><td className="py-3 pr-3">{b.phone || b.email || "—"}</td><td className="py-3"><Badge variant={b.status === "active" ? "default" : "destructive"}>{b.status}</Badge></td></tr>)}</tbody></table>{!d.businesses.length && <p className="py-6 text-center text-sm text-slate-500">No registered businesses to show.</p>}</div>}
      {!isLoading && data && <PaginationControls pagination={data.pagination.businesses} onPageChange={setBusinessesPage} itemLabel="businesses" />}
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Customers across businesses</CardTitle></CardHeader><CardContent>
      {isLoading ? <div className="h-32 animate-pulse rounded-xl bg-slate-100"/> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-3 pr-3">Customer</th><th className="py-3 pr-3">Business</th><th className="py-3 pr-3">Company</th><th className="py-3 pr-3">Phone</th><th className="py-3 pr-3">Email</th><th className="py-3">Status</th></tr></thead><tbody>{d.customers.map((r)=><tr key={r.id} className="border-b last:border-0"><td className="py-3 pr-3 font-semibold">{r.name}</td><td className="py-3 pr-3">{r.businessName}</td><td className="py-3 pr-3">{r.company || "—"}</td><td className="py-3 pr-3">{r.phone || "—"}</td><td className="py-3 pr-3">{r.email || "—"}</td><td className="py-3"><Badge variant="outline">{r.status}</Badge></td></tr>)}</tbody></table>{!d.customers.length && <p className="py-6 text-center text-sm text-slate-500">No customer records to show.</p>}</div>}
      {!isLoading && data && <PaginationControls pagination={data.pagination.customers} onPageChange={setCustomersPage} itemLabel="customers" />}
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Transactions across businesses</CardTitle></CardHeader><CardContent>
      {isLoading ? <div className="h-32 animate-pulse rounded-xl bg-slate-100"/> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-3 pr-3">Reference</th><th className="py-3 pr-3">Business</th><th className="py-3 pr-3">Type</th><th className="py-3 pr-3">Date</th><th className="py-3 pr-3">Status</th><th className="py-3 text-right">Amount</th></tr></thead><tbody>{d.transactions.map((t)=><tr key={t.id} className="border-b last:border-0"><td className="py-3 pr-3 font-mono text-xs">{t.reference}</td><td className="py-3 pr-3 font-semibold">{t.businessName}</td><td className="py-3 pr-3 capitalize">{t.type}</td><td className="py-3 pr-3">{t.createdAt.slice(0,10)}</td><td className="py-3 pr-3"><Badge variant={t.status === "completed" ? "default" : "outline"}>{t.status}</Badge></td><td className="py-3 text-right font-semibold whitespace-nowrap">{formatCurrency(t.amount,t.currency)}</td></tr>)}</tbody></table>{!d.transactions.length && <p className="py-6 text-center text-sm text-slate-500">No transactions to show.</p>}</div>}
      {!isLoading && data && <PaginationControls pagination={data.pagination.transactions} onPageChange={setTransactionsPage} itemLabel="transactions" />}
    </CardContent></Card>
  </div></PageTransition>;
}
