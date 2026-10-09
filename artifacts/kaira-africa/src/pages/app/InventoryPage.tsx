import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowDown, ArrowUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/common/PageTransition";
import { getInventoryProducts, createInventoryProduct, adjustInventory } from "@/lib/platform-api";
import { formatCurrency } from "@/lib/utils";
import { KairaLogo } from "@/components/common/KairaLogo";

export default function InventoryPage() {
  const qc = useQueryClient();
  const { data = [], isLoading, isError } = useQuery({ queryKey: ["inventory-products"], queryFn: getInventoryProducts });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "", quantity: 0, reorderLevel: 5, unitCost: 0, salePrice: 0 });
  const [saving, setSaving] = useState(false);
  const low = data.filter((p) => p.quantity <= p.reorderLevel).length;
  const value = data.reduce((s, p) => s + p.quantity * p.unitCost, 0);
  const add = async () => {
    setSaving(true);
    try { await createInventoryProduct(form); setForm({ name: "", sku: "", category: "", quantity: 0, reorderLevel: 5, unitCost: 0, salePrice: 0 }); setOpen(false); await qc.invalidateQueries({ queryKey: ["inventory-products"] }); }
    finally { setSaving(false); }
  };
  return <PageTransition><div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="font-display text-3xl font-bold">Inventory</h1><p className="text-muted-foreground text-sm">Track products, stock movements, reorder levels and inventory value.</p></div><Button className="gap-2" onClick={() => setOpen(!open)}><Plus className="h-4 w-4" />Add Product</Button></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground">Products</div><div className="text-2xl font-bold mt-1">{data.length}</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground">Inventory value</div><div className="text-2xl font-bold mt-1">{formatCurrency(value)}</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-xs text-muted-foreground">Low stock</div><div className="text-2xl font-bold mt-1">{low}</div></CardContent></Card>
    </div>
    {isError && <Card><CardContent className="p-5"><div className="flex items-center gap-3 text-sm text-destructive" role="alert"><KairaLogo width={36} className="shrink-0 rounded bg-white p-0.5" /><span>Inventory data could not be loaded.</span></div></CardContent></Card>}
    {open && <Card><CardHeader><CardTitle>New inventory product</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <Input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
      <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
      <Input type="number" placeholder="Opening stock" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
      <Input type="number" placeholder="Reorder level" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
      <Input type="number" step="0.01" placeholder="Unit cost" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })} />
      <Input type="number" step="0.01" placeholder="Sale price" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} />
      <Button onClick={add} disabled={saving || !form.name || !form.sku}>{saving ? "Saving…" : "Create product"}</Button>
    </CardContent></Card>}
    <Card><CardHeader><CardTitle>Stock ledger</CardTitle></CardHeader><CardContent>{isLoading ? <div className="h-56 animate-pulse bg-muted rounded-xl" /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-3">Product</th><th className="py-3">SKU</th><th className="py-3">Stock</th><th className="py-3">Price</th><th className="py-3">Action</th></tr></thead><tbody>{data.map((p) => <tr key={p.id} className="border-b last:border-0"><td className="py-3 font-semibold">{p.name}<div className="text-xs text-muted-foreground">{p.category || "Uncategorised"}</div></td><td className="py-3 font-mono text-xs">{p.sku}</td><td className="py-3"><Badge variant="outline" className={p.quantity <= p.reorderLevel ? "border-amber-300 text-amber-700" : ""}>{p.quantity} {p.unit}{p.quantity <= p.reorderLevel && <AlertTriangle className="inline h-3 w-3 ml-1" />}</Badge></td><td className="py-3">{formatCurrency(p.salePrice)}</td><td className="py-3"><div className="flex gap-1"><Button size="icon" variant="outline" onClick={async () => { await adjustInventory(p.id, { quantityDelta: 1, type: "purchase" }); await qc.invalidateQueries({ queryKey: ["inventory-products"] }); }}><ArrowUp className="h-3.5 w-3.5" /></Button><Button size="icon" variant="outline" disabled={!p.quantity} onClick={async () => { await adjustInventory(p.id, { quantityDelta: -1, type: "sale" }); await qc.invalidateQueries({ queryKey: ["inventory-products"] }); }}><ArrowDown className="h-3.5 w-3.5" /></Button></div></td></tr>)}</tbody></table></div>}</CardContent></Card>
  </div></PageTransition>;
}
