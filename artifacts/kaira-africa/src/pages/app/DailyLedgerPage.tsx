import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, CheckCircle2, CalendarDays, WalletCards, TrendingUp, TrendingDown, HandCoins, Printer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KairaLogo } from "@/components/common/KairaLogo";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PageTransition } from "@/components/common/PageTransition";
import { PrintableBusinessDocument, printKairaDocument } from "@/components/common/PrintableBusinessDocument";
import { createDailyLedgerEntry, getDailyLedger, getInventoryProducts, updateDailyLedgerStatus, type DailyLedgerEntry, type DailyLedgerResponse, type DailyLedgerType, type DailyLedgerCurrency } from "@/lib/platform-api";
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
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}
function currentTime() {
  const now = new Date();
  return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
}
function firstOfMonth() {
  return todayDate().slice(0, 7) + "-01";
}

export default function DailyLedgerPage() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(todayDate());
  const [entryPage, setEntryPage] = useState(1);
  const [currency, setCurrency] = useState<DailyLedgerCurrency>("GMD");
  const [entryType, setEntryType] = useState<DailyLedgerType>("sale");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recordedDate, setRecordedDate] = useState(todayDate());
  const [recordedTime, setRecordedTime] = useState(currentTime());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [remarks, setRemarks] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [printingPeriod, setPrintingPeriod] = useState(false);
  const [printPending, setPrintPending] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printSnapshot, setPrintSnapshot] = useState<{
    startDate: string;
    endDate: string;
    entries: DailyLedgerEntry[];
    response: DailyLedgerResponse;
  } | null>(null);

  const ledgerQuery = useQuery({
    queryKey: ["daily-ledger", startDate, endDate, entryPage, currency],
    queryFn: () => getDailyLedger(startDate, endDate, entryPage, 50, currency),
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
  const activeCurrency = response?.currency ?? currency;

  useEffect(() => {
    if (!printPending || !printSnapshot) return;
    const frame = window.requestAnimationFrame(() => {
      printKairaDocument("daily-ledger-print");
      setPrintPending(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [printPending, printSnapshot]);

  const printFullPeriod = async () => {
    setPrintError(null);
    if (!startDate || !endDate || startDate > endDate) {
      setPrintError("Choose a valid reporting date range before printing.");
      return;
    }

    setPrintingPeriod(true);
    try {
      const firstPage = await getDailyLedger(startDate, endDate, 1, 100, currency);
      const allEntries = [...firstPage.entries];
      const pageBatchSize = 5;

      for (let pageNumber = 2; pageNumber <= firstPage.pagination.totalPages; pageNumber += pageBatchSize) {
        const pageNumbers = Array.from(
          { length: Math.min(pageBatchSize, firstPage.pagination.totalPages - pageNumber + 1) },
          (_, index) => pageNumber + index,
        );
        const nextPages = await Promise.all(
          pageNumbers.map((nextPage) => getDailyLedger(startDate, endDate, nextPage, 100, currency)),
        );
        for (const result of nextPages) allEntries.push(...result.entries);
      }

      if (allEntries.length !== firstPage.pagination.total) {
        throw new Error("The ledger changed while the report was being prepared. Please try printing again.");
      }

      setPrintSnapshot({ startDate, endDate, entries: allEntries, response: firstPage });
      setPrintPending(true);
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : "Could not prepare the full ledger for printing.");
    } finally {
      setPrintingPeriod(false);
    }
  };

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
    setRecordedTime(currentTime());
    setPaymentMethod("cash");
    setRemarks("");
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
        currency,
        customerName: customerName.trim() || undefined,
        productId: entryType === "sale" && productId ? productId : undefined,
        quantity: entryType === "sale" && productId ? Number(quantity) : undefined,
        dueDate: dueDate || undefined,
        recordedDate,
        recordedTime,
        paymentMethod: paymentMethod as "cash" | "bank_transfer" | "mobile_money" | "card" | "credit" | "other",
        remarks: remarks.trim() || undefined,
      });
      setEntryPage(1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["daily-ledger"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-products"] }),
      ]);
      setNotice(entryType === "sale" && productId ? "Sale recorded and inventory stock updated together." : entryType === "debt_payment" ? "Debt payment saved and applied to this customer’s oldest outstanding debt." : "Daily record saved to your business ledger.");
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save this record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = response?.entries ?? [];
    const header = ["Date", "Time", "Entry type", "Description", "Category", "Customer", "Payment method", "Remarks", "Status", "Amount (" + currency + ")", "Balance (" + currency + ")"];
    const escapeCell = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
    const csv = [header, ...rows.map((entry) => [entry.recordedDate, entry.recordedTime, TYPE_LABELS[entry.entryType], entry.description, entry.category, entry.customerName, entry.paymentMethod, entry.remarks, entry.status, entry.amount, entry.balance])].map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "kaira-ledger-" + startDate + "-to-" + endDate + ".csv";
    link.click();
    URL.revokeObjectURL(url);
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
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Your everyday business book: record each sale, expense, credit and repayment with its date, time, person, payment method and remarks. Entries feed your reports automatically.</p>
          </div>
          <label className="w-full space-y-1.5 text-sm font-medium sm:w-44">Ledger currency
            <select value={currency} onChange={(e) => { const next = e.target.value as DailyLedgerCurrency; setCurrency(next); setEntryPage(1); setProductId(""); setAmount(""); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="GMD">GMD · Dalasi</option><option value="NGN">NGN · Naira</option><option value="USD">USD · US Dollar</option>
            </select>
            <span className="block text-xs font-normal text-muted-foreground">The form, summaries, charts and exports use this currency only.</span>
          </label>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Write a new entry</CardTitle><p className="text-sm text-muted-foreground">Like a paper cashbook, every row tells you what happened, when it happened and how it was paid.</p></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1.5 text-sm font-medium">Record type
                  <select value={entryType} onChange={(e) => {
                    const nextType = e.target.value as DailyLedgerType;
                    setEntryType(nextType);
                    if (nextType !== "sale") { setProductId(""); setQuantity("1"); }
                    if (nextType === "debt") setPaymentMethod("credit");
                    else if (paymentMethod === "credit") setPaymentMethod("cash");
                  }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium">Amount ({currency})
                  <Input value={stockLinkedSale ? productSaleTotal.toFixed(2) : amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="e.g. 250.00" disabled={stockLinkedSale} required />
                  {stockLinkedSale && <span className="block text-xs font-normal text-muted-foreground">Calculated from the product price and quantity.</span>}
                </label>
                <label className="space-y-1.5 text-sm font-medium">Record date
                  <Input type="date" value={recordedDate} onChange={(e) => setRecordedDate(e.target.value)} required />
                </label>
                <label className="space-y-1.5 text-sm font-medium">Category
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={entryType === "expense" ? "e.g. transport, rent" : "e.g. groceries, sales"} />
                </label>
                <label className="space-y-1.5 text-sm font-medium">Time of record
                  <Input type="time" value={recordedTime} onChange={(e) => setRecordedTime(e.target.value)} required />
                </label>
                <label className="space-y-1.5 text-sm font-medium">Payment method
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="card">Card / POS</option><option value="credit">Credit / unpaid</option><option value="other">Other</option>
                  </select>
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
                        {inventoryProducts.filter((p) => p.active && p.currency === currency && p.quantity > 0 && p.salePrice > 0).map((product) => (
                          <option key={product.id} value={product.id}>{product.name} · {product.quantity} {product.unit} in stock · {formatCurrency(product.salePrice, currency)}</option>
                        ))}
                      </select>
                      <span className="block text-xs font-normal text-muted-foreground">Choose a {currency}-priced stocked product to calculate the sale and reduce inventory in the same database transaction. Only products in the selected currency are listed.</span>
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
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer's full name" required={entryType === "debt" || entryType === "debt_payment"} />
                    {entryType === "debt_payment" && <span className="block text-xs font-normal leading-relaxed text-muted-foreground">Use the same spelling as the original unpaid debt. The payment is applied to this customer's oldest debt first and reduces the remaining balance.</span>}
                  </label>
                )}
                {entryType === "debt" && (
                  <label className="space-y-1.5 text-sm font-medium">Payment due date (optional)
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={recordedDate} />
                  </label>
                )}
              </div>
              <label className="block space-y-1.5 text-sm font-medium">Remarks / receipt reference (optional)
                <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} placeholder="e.g. receipt number, reason for expense, who approved it" />
              </label>
              {formError && <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><KairaLogo width={28} className="shrink-0 rounded bg-white p-0.5" /><span>{formError}</span></div>}
              {notice && <p className="text-sm font-medium text-primary" role="status">{notice}</p>}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">Entries are saved to your business book. For a sale you have not collected payment for, choose “Credit sale / amount owed” and add the customer name.</p>
                <Button type="submit" disabled={saving} className="gap-2"><Plus className="h-4 w-4" />{saving ? "Saving…" : "Save daily record"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Choose your book period</CardTitle><p className="text-sm text-muted-foreground">Filter the register by date to review a day, week or month.</p></CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 space-y-1.5 text-sm font-medium">From<Input type="date" value={startDate} max={endDate} onChange={(e) => { setEntryPage(1); setStartDate(e.target.value); }} /></label>
            <label className="flex-1 space-y-1.5 text-sm font-medium">To<Input type="date" value={endDate} min={startDate} max={todayDate()} onChange={(e) => { setEntryPage(1); setEndDate(e.target.value); }} /></label>
            <Button type="button" variant="outline" onClick={() => { setEntryPage(1); setStartDate(todayDate()); setEndDate(todayDate()); }}>Today</Button>
            <Button type="button" variant="outline" onClick={() => { setEntryPage(1); setStartDate(firstOfMonth()); setEndDate(todayDate()); }}>This month</Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/15 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white">
          <CardContent className="grid gap-5 p-5 sm:grid-cols-[1.2fr_0.8fr] sm:items-center sm:p-7">
            <div className="space-y-3">
              <Badge className="w-fit border border-white/20 bg-white/10 text-white hover:bg-white/10">KAIRA SMART BOOKKEEPING</Badge>
              <h2 className="font-display text-xl font-bold sm:text-2xl">Your numbers, easier to understand.</h2>
              <p className="max-w-xl text-sm leading-relaxed text-emerald-50/80">Turn your recorded sales, expenses and unpaid credit into a clear business picture. Review trends and get AI-assisted insights without doing the sums by hand.</p>
              <Button type="button" onClick={() => { window.location.assign("/ai-reports"); }} className="w-fit gap-2 bg-white text-emerald-900 hover:bg-emerald-50">Explore business insights <TrendingUp className="h-4 w-4" /></Button>
            </div>
            <div className="hidden sm:block"><img src="/images/daily-ledger-insights.svg" alt="Illustrated business spreadsheet with sales, expense, transaction register and AI insights" className="mx-auto w-full max-w-[360px] rounded-2xl shadow-xl" loading="lazy" /></div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground">Sales received <TrendingUp className="h-4 w-4 text-primary" /></div><div className="mt-2 text-2xl font-bold">{formatCurrency(summary?.sales ?? 0, activeCurrency)}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground">Business expenses <TrendingDown className="h-4 w-4 text-destructive" /></div><div className="mt-2 text-2xl font-bold">{formatCurrency(summary?.expenses ?? 0, activeCurrency)}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground">Outstanding debts <HandCoins className="h-4 w-4 text-amber-600" /></div><div className="mt-2 text-2xl font-bold">{formatCurrency(summary?.outstandingDebt ?? 0, activeCurrency)}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground">Sales less expenses <WalletCards className="h-4 w-4 text-primary" /></div><div className="mt-2 text-2xl font-bold">{formatCurrency(summary?.salesLessExpenses ?? 0, activeCurrency)}</div><p className="mt-1 text-xs text-muted-foreground">Before stock cost, tax and other adjustments</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-base">Daily sales vs expenses</CardTitle></CardHeader><CardContent>
            {ledgerQuery.isLoading ? <div className="h-[260px] animate-pulse rounded-xl bg-muted" /> : (response?.dailyTrend.length ?? 0) === 0 ? <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No records for this period yet.</div> : (
              <ResponsiveContainer width="100%" height={260}><BarChart data={response?.dailyTrend ?? []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={11} /><Tooltip formatter={(value) => formatCurrency(Number(value), activeCurrency)} /><Legend /><Bar dataKey="sales" name="Sales" fill="hsl(var(--chart-1))" radius={[4,4,0,0]} /><Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
            )}
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Sales, expenses and debt mix</CardTitle></CardHeader><CardContent>
            {pieData.length === 0 ? <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Record sales, expenses or debts to see the chart.</div> : (
              <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" outerRadius={85} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>{pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value), "GMD")} /></PieChart></ResponsiveContainer>
            )}
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-lg">Your business book</CardTitle><p className="mt-1 text-sm text-muted-foreground">A spreadsheet-style register of every recorded transaction. Scroll sideways on smaller screens.</p></div><div className="flex flex-wrap gap-2 print:hidden"><Button type="button" size="sm" variant="outline" onClick={() => void printFullPeriod()} disabled={printingPeriod || ledgerQuery.isLoading || (response?.pagination.total ?? 0) === 0}><Printer className="mr-1 h-4 w-4" />{printingPeriod ? "Preparing report…" : "Print / PDF"}</Button><Button type="button" size="sm" variant="outline" onClick={exportCsv} disabled={!response?.entries.length}><CalendarDays className="mr-1 h-4 w-4" />Export current page</Button></div></div></CardHeader>
          <CardContent>
            {printError && <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{printError}</div>}
            {ledgerQuery.isError && <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><KairaLogo width={28} className="shrink-0 rounded bg-white p-0.5" /><span>{ledgerQuery.error instanceof Error ? ledgerQuery.error.message : "Could not load daily ledger records."}</span></div>}
            {ledgerQuery.isLoading ? <div className="h-52 animate-pulse rounded-xl bg-muted" /> : !response?.entries.length ? <div className="py-12 text-center text-sm text-muted-foreground">No daily records in this period. Start by adding your first sale or expense above.</div> : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[1320px] border-collapse text-sm">
                  <thead className="bg-muted/70"><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3">Date</th><th className="px-3 py-3">Time</th><th className="px-3 py-3">Entry type</th><th className="px-3 py-3">Particulars / description</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Customer / name</th><th className="px-3 py-3">Payment method</th><th className="px-3 py-3">Remarks / reference</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Amount</th><th className="px-3 py-3 text-right">Balance left</th><th className="px-3 py-3 text-right">Action</th>
                  </tr></thead>
                  <tbody>{response.entries.map((entry, index) => <tr key={entry.id} className={`border-b last:border-0 align-top transition-colors hover:bg-muted/40 ${index % 2 ? "bg-muted/15" : "bg-background"}`}>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums">{entry.recordedDate}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted-foreground">{entry.recordedTime || "—"}</td>
                    <td className="px-3 py-3"><Badge variant="outline" className="whitespace-nowrap">{TYPE_LABELS[entry.entryType]}</Badge></td>
                    <td className="max-w-[240px] px-3 py-3"><div className="font-medium text-foreground">{entry.description}</div>{entry.dueDate && <div className="mt-1 text-xs text-muted-foreground">Due {entry.dueDate}</div>}</td>
                    <td className="px-3 py-3 text-muted-foreground">{entry.category || "—"}</td><td className="px-3 py-3">{entry.customerName || "—"}</td>
                    <td className="px-3 py-3 capitalize text-muted-foreground">{(entry.paymentMethod || "—").replace("_", " ")}</td><td className="max-w-[200px] whitespace-normal px-3 py-3 text-muted-foreground">{entry.remarks || "—"}</td>
                    <td className="px-3 py-3">{entry.entryType === "debt" ? <Badge variant={entry.status === "paid" ? "default" : "destructive"}>{entry.status === "paid" ? "Paid" : "Unpaid"}</Badge> : <span className="text-xs text-muted-foreground">Recorded</span>}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(entry.amount, entry.currency)}</td><td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{entry.entryType === "debt" ? formatCurrency(entry.balance ?? entry.amount, entry.currency) : "—"}</td>
                    <td className="px-3 py-3 text-right">{entry.entryType === "debt" && entry.status !== "paid" ? <Button type="button" size="sm" variant="outline" disabled={updatingId === entry.id} onClick={() => void markDebtPaid(entry.id)} className="gap-1 whitespace-nowrap"><CheckCircle2 className="h-3.5 w-3.5" />{updatingId === entry.id ? "Saving…" : "Mark paid"}</Button> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  </tr>)}</tbody>
                </table>
              </div>
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
        <PrintableBusinessDocument id="daily-ledger-print" title="Daily Ledger Report" documentNumber={(printSnapshot?.startDate ?? startDate) + " to " + (printSnapshot?.endDate ?? endDate)} issuedAt={new Date().toLocaleString()}>
          <p><strong>Reporting period:</strong> {printSnapshot?.startDate ?? startDate} through {printSnapshot?.endDate ?? endDate}</p>
          <p><strong>Entries included:</strong> {printSnapshot?.entries.length ?? response?.entries.length ?? 0} of {printSnapshot?.response.pagination.total ?? response?.pagination.total ?? 0} records in the period.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="kaira-print-total"><p>Sales received</p><strong>{formatCurrency(printSnapshot?.response.summary.sales ?? summary?.sales ?? 0, printSnapshot?.response.currency ?? activeCurrency)}</strong></div>
            <div className="kaira-print-total"><p>Expenses</p><strong>{formatCurrency(printSnapshot?.response.summary.expenses ?? summary?.expenses ?? 0, printSnapshot?.response.currency ?? activeCurrency)}</strong></div>
            <div className="kaira-print-total"><p>Outstanding debt</p><strong>{formatCurrency(printSnapshot?.response.summary.outstandingDebt ?? summary?.outstandingDebt ?? 0, printSnapshot?.response.currency ?? activeCurrency)}</strong></div>
            <div className="kaira-print-total"><p>Debt payments received</p><strong>{formatCurrency(printSnapshot?.response.summary.debtPayments ?? summary?.debtPayments ?? 0, printSnapshot?.response.currency ?? activeCurrency)}</strong></div>
            <div className="kaira-print-total"><p>Other income</p><strong>{formatCurrency(printSnapshot?.response.summary.otherIncome ?? summary?.otherIncome ?? 0, printSnapshot?.response.currency ?? activeCurrency)}</strong></div>
            <div className="kaira-print-total"><p>Sales less expenses</p><strong>{formatCurrency(printSnapshot?.response.summary.salesLessExpenses ?? summary?.salesLessExpenses ?? 0, printSnapshot?.response.currency ?? activeCurrency)}</strong></div>
          </div>
          <table className="mt-5">
            <thead><tr><th>Date / time</th><th>Type / description</th><th>Customer</th><th>Payment method</th><th>Status / remarks</th><th>Amount</th><th>Balance left</th></tr></thead>
            <tbody>{(printSnapshot?.entries ?? response?.entries ?? []).map((entry) => <tr key={entry.id}>
              <td>{entry.recordedDate}{entry.recordedTime ? " " + entry.recordedTime : ""}</td>
              <td><strong>{TYPE_LABELS[entry.entryType]}</strong><br/>{entry.description}{entry.category ? " · " + entry.category : ""}</td>
              <td>{entry.customerName || "—"}</td>
              <td>{(entry.paymentMethod || "—").replace(/_/g, " ")}</td>
              <td>{entry.entryType === "debt" ? (entry.status === "paid" ? "Paid" : "Unpaid") : "Recorded"}{entry.remarks ? " · " + entry.remarks : ""}</td>
              <td>{formatCurrency(entry.amount, entry.currency)}</td>
              <td>{entry.entryType === "debt" ? formatCurrency(entry.balance ?? entry.amount, entry.currency) : "—"}</td>
            </tr>)}</tbody>
          </table>
        </PrintableBusinessDocument>
              </div>
    </PageTransition>
  );
}
