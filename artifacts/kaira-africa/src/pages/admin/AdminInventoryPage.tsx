import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/common/PageTransition";
import { PaginationControls } from "@/components/common/PaginationControls";
import { getAdminInventory } from "@/lib/platform-api";
import { formatCurrency } from "@/lib/utils";

export default function AdminInventoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-inventory", page],
    queryFn: () => getAdminInventory(page, 50),
  });
  const rows = data?.data ?? [];
  const summary = data?.summary;
  return <PageTransition><div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold flex items-center gap-2"><Package className="h-7 w-7 text-amber-500"/>Platform Inventory</h1><p className="text-slate-500 text-sm">Global inventory health and low-stock monitoring.</p></div>
    {isError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error instanceof Error ? error.message : "Could not load platform inventory."}</div>}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><CardContent className="p-5"><div className="text-xs text-slate-500">Tracked products</div><div className="text-2xl font-bold">{isLoading ? "—" : summary?.totalProducts ?? 0}</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-xs text-slate-500">Low stock</div><div className="text-2xl font-bold">{isLoading ? "—" : summary?.lowStockProducts ?? 0}</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-xs text-slate-500">Total tracked value</div><div className="text-2xl font-bold">{formatCurrency(summary?.totalValue ?? 0)}</div></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Inventory watchlist</CardTitle></CardHeader><CardContent>
      {isLoading ? <div className="h-56 animate-pulse bg-slate-100 rounded-xl"/> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b text-left"><th className="py-3">Product</th><th className="py-3">Business</th><th className="py-3">SKU</th><th className="py-3">Stock</th><th className="py-3">Value</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id} className="border-b last:border-0"><td className="py-3 font-semibold">{r.name}{r.quantity <= r.reorderLevel && <AlertTriangle className="inline h-3.5 w-3.5 ml-2 text-amber-500"/>}</td><td className="py-3">{r.businessName}</td><td className="py-3 font-mono text-xs">{r.sku}</td><td className="py-3">{r.quantity} / reorder {r.reorderLevel}</td><td className="py-3">{formatCurrency(r.inventoryValue)}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No inventory products to show.</p>}</div>}
      {!isLoading && data && <PaginationControls pagination={data.pagination} onPageChange={setPage} itemLabel="products"/>}
    </CardContent></Card>
  </div></PageTransition>;
}
