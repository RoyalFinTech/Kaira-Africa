import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, CheckCircle2, CalendarDays, WalletCards, TrendingUp, TrendingDown, HandCoins } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KairaLogo } from "@/components/common/KairaLogo";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PageTransition } from "@/components/common/PageTransition";
import { createDailyLedgerEntry, getDailyLedger, getInventoryProducts, updateDailyLedgerStatus, type DailyLedgerType } from "@/lib/platform-api";
import { formatCurrency } from "@/lib/utils";

const TYPE_LABELS: Record<DailyLedgerType, string> = {
  sale: "Sale / sales received",
  expense: "Business expense",
  debt: "Credit sale / amount owed",
  debt_payment: "Debt payment received",
  other_income: "Other income",
};
const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonth() {
  return todayDate().slice(0, 7) + "-01";
}

export default function DailyLedgerPage() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(todayDate());
  const [entryPage, setEntryPage] = useState(1);
  const [entryType, setEntryType] = useState<DailyLedgerType>("sale");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recordedDate, setRecordedDate] = useState(todayDate());
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const ledgerQuery = useQuery({
    queryKey: ["daily-ledger", startDate, endDate, entryPage],
    queryFn: () => getDailyLedger(startDate, endDate, entryPage, 50),
    enabled: Boolean(startDate && endDate && startDate <= endDate),
  });
  const { data: inventoryProducts = [] } = useQuery({
    queryKey: ["inventory-products"],
    queryFn: getInventoryProducts,
  });
  const selectedProduct = inventoryProducts.find((product) => product.id === productId);
  const stockLinkedSale = entryType === "sale" && Boolean(selectedProduct);
  const productSaleTotal = selectedProduct ? selectedProduct.salePrice * Number(quantity || 0) : 0;
  const response = ledgerQuery.data;
  const summary = response?.summary;
  const pieData = useMemo(() => [
    { name: "Sales received", value: summary?.sales ?? 0 },
    { name: "Expenses", value: summary?.expenses ?? 0 },
    { name: "Unpaid debts", value: summary?.outstandingDebt ?? 0 },
  ].filter((row) => row.value > 0), [summary]);

  const resetForm = () => {
    setEntryType("sale");
    setDescription("");
    setCategory("");
    setAmount("");
    setProductId("");
    setQuantity("1");
    setCustomerName("");
    setDueDate("");
    setRecordedDate(todayDate());
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    if (entryType === "debt" && !customerName.trim()) {
      setFormError("Enter the customer's or debtor's name for a credit sale.");
      return;
    }
    if (startDate > endDate) {
      setFormError("The report start date must be on or before its end date.");
      return;
    }
    setSaving(true);
    try {
      await createDailyLedgerEntry({
        entryType,
        description: description.trim(),
        category: category.trim() || undefined,
        amount: numericAmount,
        currency: "GMD",
        customerName: customerName.trim() || undefined,
        productId: entryType === "sale" && productId ? productId : undefined,
        quantity: entryType === "sale" && productId ? Number(quantity) : undefined,
        dueDate: dueDate || undefined,
        recordedDate,
      });
      setEntryPage(1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["daily-ledger"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-products"] }),
      ]);
      setNotice(entryType === "sale" && productId ? "Sale recorded and inventory stock updated together." : "Daily record saved to your business ledger.");
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save this record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const markDebtPaid = async (id: string) => {
    setUpdatingId(id);
    setFormError(null);
    setNotice(null);
    try {
      await updateDailyLedgerStatus(id, "paid");
      setEntryPage(1);
      await queryClient.invalidateQueries({ queryKey: ["daily-ledger"] });
      setNotice("Debtor record marked as paid.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not update the debtor record.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display flex items-center gap-2 text-3xl font-bold"><BookOpen className="h-7 w-7 text-primary" />Daily Sales & Expense Book</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Record each day's sales, business expenses, credit sales and debt repayments. These are private to your business and feed your reports.</p>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> GMD ledger</Badge>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Add a daily record</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1.5 text-sm font-medium">Record type
                  <select value={entryType} onChange={(e) => {
                    const nextType = e.target.value as DailyLedgerType;
                    setEntryType(nextType);
                    if (nextType !== "sale") { setProductId(""); setQuantity("1"); }
                  }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium">Amount (GMD)
                  <Input value={stockLinkedSale ? productSaleTotal.toFixed(2) : amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="e.g. 250.00" disabled={stockLinkedSale} required />
                  {stockLinkedSale && <span className="block text-xs font-normal text-muted-foreground">Calculated from the product price and quantity.</span>}
                </label>
                <label className="space-y-1.5 text-sm font-medium">Record date
                  <Input type="date" value={recordedDate} onChange={(e) => setRecordedDate(e.target.value)} required />
                </label>
                <label className="space-y-1.5 text-sm font-medium">Category
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={entryType === "expense" ? "e.g. transport, rent" : "e.g. groceries, sales"} />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {entryType === "sale" && (
                  <>
                    <label className="space-y-1.5 text-sm font-medium">Inventory product (optional)
                      <select value={productId} onChange={(e) => {
                        const id = e.target.value;
                        setProductId(id);
                        const product = inventoryProducts.find((p) => p.id === id);
                        if (product) setAmount((product.salePrice * Number(quantity || 0)).toFixed(2));
                      }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">Manual sale (no stock adjustment)</option>
                        {inventoryProducts.filter((p) => p.active && p.quantity > 0 && p.salePrice > 0).map((product) => (
                          <option key={product.id} value={product.id}>{product.name} · {product.quantity} {product.unit} in stock · {formatCurrency(product.salePrice, "GMD")}</option>
                        ))}
                      </select>
                      <span className="block text-xs font-normal text-muted-foreground">Choose a stocked product to calculate the sale and reduce inventory in the same database transaction.</span>
                    </label>
                    {productId && selectedProduct && (
                      <label className="space-y-1.5 text-sm font-medium">Quantity sold
                        <Input type="number" min="1" max={selectedProduct.quantity} step="1" value={quantity} onChange={(e) => {
                          const nextQuantity = e.target.value;
                          setQuantity(nextQuantity);
                          setAmount((selectedProduct.salePrice * Number(nextQuantity || 0)).toFixed(2));
                        }} required />
                        <span className="block text-xs font-normal text-muted-foreground">Available: {selectedProduct.quantity} {selectedProduct.unit}. Stock is checked again by the server when you save.</span>
                      </label>
                    )}
                  </>
                )}
                <label className="space-y-1.5 text-sm font-medium">Description
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={entryType === "sale" ? "e.g. Daily shop sales" : entryType === "expense" ? "e.g. Market supplies" : "Describe this record"} minLength={2} maxLength={200} required />
                </label>
                {(entryType === "debt" || entryType === "debt_payment") && (
                  <label className="space-y-1.5 text-sm font-medium">{entryType === "debt" ? "Debtor / customer name" : "Customer paying debt"}
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer's full name" required={entryType === "debt"} />
                  </label>
                )}
                {entryType === "debt" && (
                  <label className="space-y-1.5 text-sm font-medium">Payment due date (optional)
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={recordedDate} />
                  </label>
                )}
              </div>
              {formError && <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><KairaLogo width={28} className="shrink-0 rounded bg-white p-0.5" /><span>{formError}</span></div>}
              {notice && <p className="text-sm font-medium text-primary" role="status">{notice}</p>}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">Records are saved to your account. For a credit sale, mark it as debt so it appears in your outstanding-debt total.</p>
                <Button type="submit" disabled={saving} className="gap-2"><Plus className="h-4 w-4" />{saving ? "Saving…" : "Save daily record"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Report period</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 space-y-1.5 text-sm font-medium">From<Input type="date" value={startDate} max={endDate} onChange={(e) => { setEntryPage(1); setStartDate(e.target.value); }} /></label>
            <label className="flex-1 space-y-1.5 text-sm font-medium">To<Input type="date" value={endDate} min={startDate} max={todayDate()} onChange={(e) => { setEntryPage(1); setEndDate(e.target.value); }} /></label>
            <Button type="button" variant="outline" onClick={() => { setEntryPage(1); setStartDate(todayDate()); setEndDate(todayDate()); }}>Today</Button>
            <Button type="button" variant="outline" onClick={() => { setEntryPage(1); setStartDate(firstOfMonth()); setEndDate(todayDate()); }}>This month</Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground">Sales received <TrendingUp className="h-4 w-4 text-primary" /></div><div className="mt-2 text-2xl font-bold">{formatCurrency(summary?.sales ?? 0, "GMD")}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground">Business expenses <TrendingDown className="h-4 w-4 text-destructive" /></div><div className="mt-2 text-2xl font-bold">{formatCurrency(summary?.expenses ?? 0, "GMD")}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground">Outstanding debts <HandCoins className="h-4 w-4 text-amber-600" /></div><div className="mt-2 text-2xl font-bold">{formatCurrency(summary?.outstandingDebt ?? 0, "GMD")}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground">Sales less expenses <WalletCards className="h-4 w-4 text-primary" /></div><div className="mt-2 text-2xl font-bold">{formatCurrency(summary?.salesLessExpenses ?? 0, "GMD")}</div><p className="mt-1 text-xs text-muted-foreground">Before stock cost, tax and other adjustments</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">Daily sales vs expenses</CardTitle></CardHeader><CardContent>
            {ledgerQuery.isLoading ? <div className="h-[260px] animate-pulse rounded-xl bg-muted" /> : (response?.dailyTrend.length ?? 0) === 0 ? <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No records for this period yet.</div> : (
              <ResponsiveContainer width="100%" height={260}><BarChart data={response?.dailyTrend ?? []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={11} /><Tooltip formatter={(value) => formatCurrency(Number(value), "GMD")} /><Legend /><Bar dataKey="sales" name="Sales" fill="hsl(var(--chart-1))" radius={[4,4,0,0]} /><Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
            )}
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Sales, expenses and debt mix</CardTitle></CardHeader><CardContent>
            {pieData.length === 0 ? <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Record sales, expenses or debts to see the chart.</div> : (
              <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" outerRadius={85} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>{pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value), "GMD")} /></PieChart></ResponsiveContainer>
            )}
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Ledger entries ({summary?.totalRecords ?? 0})</CardTitle></CardHeader>
          <CardContent>
            {ledgerQuery.isError && <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><KairaLogo width={28} className="shrink-0 rounded bg-white p-0.5" /><span>{ledgerQuery.error instanceof Error ? ledgerQuery.error.message : "Could not load daily ledger records."}</span></div>}
            {ledgerQuery.isLoading ? <div className="h-52 animate-pulse rounded-xl bg-muted" /> : !response?.entries.length ? <div className="py-12 text-center text-sm text-muted-foreground">No daily records in this period. Start by adding your first sale or expense above.</div> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-3 pr-3">Date</th><th className="py-3 pr-3">Type</th><th className="py-3 pr-3">Details</th><th className="py-3 pr-3">Customer / debtor</th><th className="py-3 pr-3">Status</th><th className="py-3 pr-3 text-right">Amount</th><th className="py-3 text-right">Action</th></tr></thead>
                <tbody>{response.entries.map((entry) => <tr key={entry.id} className="border-b last:border-0 align-top">
                  <td className="py-3 pr-3 whitespace-nowrap">{entry.recordedDate}</td>
                  <td className="py-3 pr-3"><Badge variant="outline">{TYPE_LABELS[entry.entryType]}</Badge></td>
                  <td className="py-3 pr-3"><div className="font-medium">{entry.description}</div>{entry.category && <div className="mt-0.5 text-xs text-muted-foreground">{entry.category}</div>}</td>
                  <td className="py-3 pr-3">{entry.customerName || "—"}{entry.dueDate && <div className="text-xs text-muted-foreground">Due {entry.dueDate}</div>}</td>
                  <td className="py-3 pr-3">{entry.entryType === "debt" ? <Badge variant={entry.status === "paid" ? "default" : "destructive"}>{entry.status === "paid" ? "Paid" : "Unpaid"}</Badge> : <span className="text-xs text-muted-foreground">Recorded</span>}</td>
                  <td className="py-3 pr-3 text-right font-semibold whitespace-nowrap">{formatCurrency(entry.amount, entry.currency)}</td>
                  <td className="py-3 text-right">{entry.entryType === "debt" && entry.status !== "paid" ? <Button type="button" size="sm" variant="outline" disabled={updatingId === entry.id} onClick={() => void markDebtPaid(entry.id)} className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{updatingId === entry.id ? "Saving…" : "Mark paid"}</Button> : <span className="text-xs text-muted-foreground">—</span>}</td>
                </tr>)}</tbody>
              </table></div>
            )}
            {!ledgerQuery.isLoading && response && (
              <PaginationControls
                pagination={response.pagination}
                onPageChange={setEntryPage}
                itemLabel="ledger entries"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
