import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Search, Download, ArrowLeftRight, WalletCards, CheckCircle2, Clock3,
  AlertCircle, Banknote, ReceiptText, Upload, Camera, ExternalLink,
  PencilLine, LoaderCircle, X, Save, Trash2, CircleDollarSign, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageTransition } from "@/components/common/PageTransition";
import { EmptyState } from "@/components/common/EmptyState";
import { CameraCaptureDialog } from "@/components/common/CameraCaptureDialog";
import { PrintableBusinessDocument, printKairaDocument } from "@/components/common/PrintableBusinessDocument";
import {
  useListTransactions, useListCustomers, getListTransactionsQueryKey,
  getGetBusinessStatsQueryKey, getListCustomersQueryKey,
  getGetRevenueAnalyticsQueryKey, getGetTransactionAnalyticsQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient as useReactQueryClient } from "@tanstack/react-query";
import {
  createManagedTransaction, updateManagedTransaction, uploadManagedTransactionAttachment,
  removeManagedTransactionAttachment, getReceiptBranding, type ManagedTransaction, type TransactionCurrency,
  type TransactionPaymentMethod, type ManagedTransactionStatus,
} from "@/lib/platform-api";
import { formatDate } from "@/lib/utils";

const TRANSACTION_TYPES = ["payment", "refund", "transfer", "withdrawal", "deposit"] as const;
const CURRENCIES: { code: TransactionCurrency; label: string }[] = [
  { code: "GMD", label: "GMD — Gambian dalasi" },
  { code: "NGN", label: "NGN — Nigerian naira" },
  { code: "USD", label: "USD — US dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British pound" },
];
const PAYMENT_METHODS: { value: TransactionPaymentMethod; label: string }[] = [
  { value: "manual_entry", label: "Manual entry / bookkeeping" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "card", label: "Card / POS" },
  { value: "paypal", label: "PayPal" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];
const TYPE_LABELS: Record<typeof TRANSACTION_TYPES[number], string> = {
  payment: "Customer payment",
  refund: "Refund",
  transfer: "Transfer",
  withdrawal: "Withdrawal",
  deposit: "Deposit",
};
const TYPE_HELP: Record<typeof TRANSACTION_TYPES[number], string> = {
  payment: "Money received for a sale, service or invoice.",
  refund: "Money returned to a customer.",
  transfer: "Money moved between accounts or parties.",
  withdrawal: "Money taken out of an account or business wallet.",
  deposit: "Money added to an account, till or wallet.",
};
const METHOD_LABELS: Record<TransactionPaymentMethod, string> = {
  manual_entry: "Manual entry",
  cash: "Cash",
  bank_transfer: "Bank transfer",
  mobile_money: "Mobile money",
  card: "Card / POS",
  paypal: "PayPal",
  cheque: "Cheque",
  other: "Other",
};
const ALLOWED_RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return currency + " " + Number(amount || 0).toFixed(2);
  }
}
function readFileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The file could not be read."));
    reader.onerror = () => reject(new Error("The file could not be read. Please choose it again."));
    reader.readAsDataURL(file);
  });
}
function acceptReceipt(file: File | null): string | null {
  if (!file) return null;
  if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) return "Choose a JPEG, PNG, WebP image or PDF receipt.";
  if (file.size > 5 * 1024 * 1024) return "Receipt files must be 5 MB or smaller.";
  return null;
}

function NewTransactionDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean; onOpenChange: (open: boolean) => void;
  onCreated: (message: string, isError?: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<TransactionCurrency>("GMD");
  const [type, setType] = useState<typeof TRANSACTION_TYPES[number]>("payment");
  const [paymentMethod, setPaymentMethod] = useState<TransactionPaymentMethod>("manual_entry");
  const [customerId, setCustomerId] = useState("none");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const { data: customersData } = useListCustomers({ limit: 100 });

  const clearForm = () => {
    setAmount(""); setCurrency("GMD"); setType("payment"); setPaymentMethod("manual_entry");
    setCustomerId("none"); setDescription(""); setNotes(""); setReceipt(null); setError(null);
  };
  const selectReceipt = (file: File | null) => {
    const issue = file ? acceptReceipt(file) : null;
    if (issue) { setError(issue); return; }
    setError(null);
    setReceipt(file);
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (description.trim().length > 500 || notes.length > 4000) {
      setError("Keep the description under 500 characters and notes under 4,000 characters.");
      return;
    }
    setSaving(true);
    try {
      const created = await createManagedTransaction({
        amount: numericAmount, currency, type, paymentMethod,
        customerId: customerId === "none" ? undefined : customerId,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      let receiptError: string | null = null;
      if (receipt) {
        try { await uploadManagedTransactionAttachment(created.id, await readFileDataUrl(receipt)); }
        catch (uploadError) {
          receiptError = uploadError instanceof Error ? uploadError.message : "Receipt upload failed.";
        }
      }
      clearForm();
      onOpenChange(false);
      onCreated(
        receiptError
          ? "Transaction " + created.reference + " was saved, but its receipt failed to upload: " + receiptError
          : "Transaction " + created.reference + " was saved as pending. Review the details and update its status when appropriate.",
        Boolean(receiptError),
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The transaction could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record a transaction</DialogTitle>
            <DialogDescription>Record the movement, currency and payment method. New records start as pending until you confirm the outcome.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">Amount
                <Input aria-label="Transaction amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                <span className="block text-xs font-normal text-muted-foreground">Enter the amount in the selected currency only.</span>
              </label>
              <label className="space-y-1.5 text-sm font-medium">Currency
                <Select value={currency} onValueChange={(v) => setCurrency(v as TransactionCurrency)}>
                  <SelectTrigger aria-label="Transaction currency"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((item) => <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
                <span className="block text-xs font-normal text-muted-foreground">Different currencies are kept separate; the app does not add unlike currencies together.</span>
              </label>
              <label className="space-y-1.5 text-sm font-medium">Transaction type
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger aria-label="Transaction type"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRANSACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
                <span className="block text-xs font-normal text-muted-foreground">{TYPE_HELP[type]}</span>
              </label>
              <label className="space-y-1.5 text-sm font-medium">Payment method / source
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as TransactionPaymentMethod)}>
                  <SelectTrigger aria-label="Payment method"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map((method) => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}</SelectContent>
                </Select>
                <span className="block text-xs font-normal text-muted-foreground">This records how it was paid or how it was entered, not a live payment gateway charge.</span>
              </label>
            </div>
            <label className="block space-y-1.5 text-sm font-medium">Customer (optional)
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger aria-label="Transaction customer"><SelectValue placeholder="Choose a customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No customer linked</SelectItem>
                  {customersData?.customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">Description / reference
              <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="e.g. Invoice INV-204, supplier payment, daily sales…" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">Internal notes (optional)
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} rows={3} placeholder="Add reconciliation notes, who authorised it, or the next action." />
            </label>
            <div className="rounded-xl border border-dashed p-4">
              <div className="mb-2 flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><ReceiptText className="h-5 w-5" /></div>
                <div><p className="text-sm font-semibold">Receipt or proof (optional)</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Attach a receipt, transfer proof or scan. JPEG, PNG, WebP or PDF up to 5 MB; files are stored privately.</p></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => uploadRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload from device</Button>
                <Button type="button" variant="outline" onClick={() => setCameraOpen(true)}><Camera className="mr-2 h-4 w-4" />Take a photo</Button>
                <input ref={uploadRef} className="hidden" type="file" accept={ALLOWED_RECEIPT_TYPES.join(",")} onChange={(e) => { selectReceipt(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </div>
              {receipt && <p className="mt-2 text-xs text-muted-foreground">{receipt.name} · {(receipt.size / 1024).toFixed(0)} KB selected</p>}
            </div>
            {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Plus className="mr-2 h-4 w-4" />Record transaction</>}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <CameraCaptureDialog open={cameraOpen} onOpenChange={setCameraOpen} onCapture={selectReceipt} title="Capture transaction receipt" description="Use your device camera to photograph a receipt or transfer slip. The picture stays a private attachment to the transaction." />
    </>
  );
}

function TransactionDetailDialog({
  transaction, open, onOpenChange, onUpdated,
}: {
  transaction: ManagedTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (transaction: ManagedTransaction, message?: string) => void;
}) {
  const [status, setStatus] = useState<ManagedTransactionStatus>("pending");
  const [method, setMethod] = useState<TransactionPaymentMethod>("manual_entry");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!transaction) return;
    setStatus(transaction.status);
    setMethod((transaction.paymentMethod as TransactionPaymentMethod) || "manual_entry");
    setDescription(transaction.description || "");
    setNotes(transaction.notes || "");
    setError(null);
  }, [transaction?.id, transaction?.updatedAt, transaction?.status, transaction?.paymentMethod, transaction?.description, transaction?.notes]);

  const uploadReceipt = async (file: File | null) => {
    if (!transaction || !file) return;
    const issue = acceptReceipt(file);
    if (issue) { setError(issue); return; }
    setAttachmentBusy(true); setError(null);
    try {
      const updated = await uploadManagedTransactionAttachment(transaction.id, await readFileDataUrl(file));
      onUpdated(updated, "Receipt uploaded to private storage.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The receipt could not be uploaded.");
    } finally {
      setAttachmentBusy(false);
    }
  };

  const saveDetails = async () => {
    if (!transaction) return;
    setBusy(true); setError(null);
    try {
      const updated = await updateManagedTransaction(transaction.id, {
        status, paymentMethod: method, description: description.trim() || null, notes: notes.trim() || null,
      });
      onUpdated(updated, "Transaction details updated.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "The transaction could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  const removeReceipt = async () => {
    if (!transaction) return;
    setAttachmentBusy(true); setError(null);
    try {
      const updated = await removeManagedTransactionAttachment(transaction.id);
      onUpdated(updated, "Receipt removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "The receipt could not be removed.");
    } finally {
      setAttachmentBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          {transaction && <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />Transaction details</DialogTitle>
              <DialogDescription>{transaction.reference} · {TYPE_LABELS[transaction.type]}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Amount</p><p className="mt-1 text-lg font-bold">{money(transaction.amount, transaction.currency)}</p></div>
              <div><p className="text-xs text-muted-foreground">Customer</p><p className="mt-1 font-semibold">{transaction.customerName || "No customer linked"}</p></div>
              <div><p className="text-xs text-muted-foreground">Created</p><p className="mt-1 text-sm font-medium">{formatDate(transaction.createdAt, "MMM dd, yyyy HH:mm")}</p></div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">Status
                <Select value={status} onValueChange={(value) => setStatus(value as ManagedTransactionStatus)}>
                  <SelectTrigger aria-label="Update transaction status"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending — awaiting confirmation</SelectItem><SelectItem value="completed">Completed — confirmed</SelectItem><SelectItem value="failed">Failed — did not go through</SelectItem><SelectItem value="cancelled">Cancelled — stopped</SelectItem></SelectContent>
                </Select>
              </label>
              <label className="space-y-1.5 text-sm font-medium">Payment method
                <Select value={method} onValueChange={(value) => setMethod(value as TransactionPaymentMethod)}>
                  <SelectTrigger aria-label="Edit payment method"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </label>
            </div>
            <label className="block space-y-1.5 text-sm font-medium">Description / reference
              <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">Internal notes
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={4000} placeholder="Record reconciliation or follow-up notes." />
            </label>
            <div className="rounded-xl border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-semibold">Receipt / proof of transaction</p><p className="mt-1 text-xs text-muted-foreground">Private file · max 5 MB · JPEG, PNG, WebP or PDF</p></div>
                {transaction.attachmentUrl && <Button type="button" variant="outline" asChild><a href={transaction.attachmentUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />View receipt</a></Button>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={attachmentBusy} onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload receipt</Button>
                <Button type="button" variant="outline" disabled={attachmentBusy} onClick={() => setCameraOpen(true)}><Camera className="mr-2 h-4 w-4" />Take receipt photo</Button>
                {transaction.attachmentUrl && <Button type="button" variant="ghost" className="text-destructive" disabled={attachmentBusy} onClick={removeReceipt}><Trash2 className="mr-2 h-4 w-4" />Remove receipt</Button>}
                <input ref={fileRef} type="file" className="hidden" accept={ALLOWED_RECEIPT_TYPES.join(",")} onChange={(e) => { void uploadReceipt(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </div>
            </div>
            {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => printKairaDocument("transaction-receipt-print")}><ReceiptText className="mr-2 h-4 w-4" />Print receipt / record</Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button type="button" onClick={saveDetails} disabled={busy || attachmentBusy}><Save className="mr-2 h-4 w-4" />{busy ? "Saving updates…" : "Save transaction updates"}</Button>
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
      <CameraCaptureDialog open={cameraOpen} onOpenChange={setCameraOpen} onCapture={uploadReceipt} title="Capture receipt" description="Photograph the receipt or proof of transfer using your device camera." />
    </>
  );
}

export default function TransactionsPage() {
  const queryClient = useReactQueryClient();
  const { data: receiptBranding } = useQuery({ queryKey: ["receipt-branding"], queryFn: getReceiptBranding, staleTime: 60_000 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState<ManagedTransaction | null>(null);
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, refetch } = useListTransactions({
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter as ManagedTransactionStatus,
    type: typeFilter === "all" ? undefined : typeFilter as typeof TRANSACTION_TYPES[number],
  });
  const transactions = (data?.transactions ?? []) as ManagedTransaction[];

  const invalidateTransactions = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetBusinessStatsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetRevenueAnalyticsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetTransactionAnalyticsQueryKey() }),
    ]);
  };
  const handleCreated = (message: string, error = false) => {
    setNotice({ message, error });
    void invalidateTransactions();
  };
  const handleUpdated = (updated: ManagedTransaction, message?: string) => {
    setActiveTransaction(updated);
    setNotice({ message: message || "Transaction updated.", error: false });
    void invalidateTransactions();
  };

  const totalsByCurrency = transactions.filter((tx) => tx.status === "completed").reduce<Record<string, number>>((totals, tx) => {
    totals[tx.currency] = (totals[tx.currency] || 0) + tx.amount;
    return totals;
  }, {});
  const completedCount = transactions.filter((tx) => tx.status === "completed").length;
  const pendingCount = transactions.filter((tx) => tx.status === "pending").length;
  const failedCount = transactions.filter((tx) => tx.status === "failed").length;

  const exportCsv = () => {
    if (transactions.length === 0) return;
    const escape = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
    const rows: unknown[][] = [
      ["Reference", "Type", "Status", "Customer", "Amount", "Currency", "Payment method", "Description", "Notes", "Receipt attached", "Created at", "Updated at"],
      ...transactions.map((tx) => [
        tx.reference, tx.type, tx.status, tx.customerName || "", Number(tx.amount).toFixed(2),
        tx.currency, METHOD_LABELS[(tx.paymentMethod as TransactionPaymentMethod) || "manual_entry"],
        tx.description || "", tx.notes || "", tx.attachmentUrl ? "yes" : "no",
        new Date(tx.createdAt).toISOString(), tx.updatedAt ? new Date(tx.updatedAt).toISOString() : "",
      ]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "kaira-transactions-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary"><ArrowLeftRight className="h-3.5 w-3.5" /> Money movement workspace</div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Record money movement in its original currency, keep proof with the record, and update the outcome when it is verified.</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button type="button" variant="outline" onClick={exportCsv} disabled={isLoading || transactions.length === 0}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
            <Button type="button" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New transaction</Button>
          </div>
        </div>

        <section className="relative isolate overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-5 text-white shadow-sm sm:p-7">
          <div className="relative z-10 max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-emerald-50"><CircleDollarSign className="h-3.5 w-3.5" /> Clear records. Confident decisions.</div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Every transaction, properly documented.</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-emerald-50/80">Choose currency and payment method, attach a receipt, link a customer, and keep a clear history of status updates. Currency totals always remain separate.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2"><WalletCards className="h-3.5 w-3.5" /> Multi-currency</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2"><ReceiptText className="h-3.5 w-3.5" /> Private receipts</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2"><CheckCircle2 className="h-3.5 w-3.5" /> Track outcome</span>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-6 bottom-0 top-0 hidden w-[39%] items-center justify-center sm:flex">
            <img src="/kaira-transactions-premium-card.svg" alt="" className="h-[94%] max-w-full rounded-xl object-contain opacity-90 drop-shadow-2xl" />
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
        </section>

        {notice && <div role={notice.error ? "alert" : "status"} className={"flex items-start justify-between gap-3 rounded-xl border p-3 text-sm " + (notice.error ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-primary/20 bg-primary/5 text-foreground")}><span>{notice.message}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)} className="shrink-0 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button></div>}

        <NewTransactionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><TrendingUp className="h-4 w-4" /> Completed volume by currency</CardTitle></CardHeader><CardContent className="space-y-2">
            {Object.keys(totalsByCurrency).length ? Object.entries(totalsByCurrency).sort(([a],[b]) => a.localeCompare(b)).map(([currency,total]) => <div key={currency} className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{currency}</span><span className="font-display text-sm font-bold">{money(total,currency)}</span></div>) : <p className="text-sm text-muted-foreground">No completed volume in the current result set.</p>}
            <p className="pt-1 text-[11px] leading-4 text-muted-foreground">Current results only; currencies are never added together.</p>
          </CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> Completed</CardTitle></CardHeader><CardContent><p className="font-display text-3xl font-bold text-emerald-700">{completedCount}</p><p className="mt-1 text-xs text-muted-foreground">Confirmed outcomes</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Clock3 className="h-4 w-4" /> Pending</CardTitle></CardHeader><CardContent><p className="font-display text-3xl font-bold text-amber-600">{pendingCount}</p><p className="mt-1 text-xs text-muted-foreground">Awaiting confirmation</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><AlertCircle className="h-4 w-4" /> Failed</CardTitle></CardHeader><CardContent><p className="font-display text-3xl font-bold text-destructive">{failedCount}</p><p className="mt-1 text-xs text-muted-foreground">Needs review</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction register</CardTitle>
            <p className="text-sm text-muted-foreground">Search references and descriptions. Open a record to edit notes, update its status or manage its receipt.</p>
            <div className="flex flex-col gap-3 pt-3 sm:flex-row">
              <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search transactions" placeholder="Search reference or description…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger aria-label="Filter transaction status" className="w-full sm:w-48"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger aria-label="Filter transaction type" className="w-full sm:w-48"><SelectValue placeholder="All types" /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{TRANSACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}</SelectContent></Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? <div className="space-y-3 p-5">{[1,2,3,4].map((n) => <div key={n} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
              : isError ? <div className="p-8 text-center"><p className="font-semibold">Transactions could not be loaded</p><p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p><Button className="mt-3" variant="outline" onClick={() => void refetch()}>Retry</Button></div>
              : transactions.length === 0 ? <div className="p-8"><EmptyState icon={ArrowLeftRight} title="No transactions found" description={search || statusFilter !== "all" || typeFilter !== "all" ? "Try changing your search or filters." : "Record your first transaction to start a traceable money movement history."} /></div>
              : <div className="divide-y divide-border">
                {transactions.map((tx,index) => (
                  <motion.div key={tx.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:Math.min(index,8)*0.025}} className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-primary/5 text-primary"><Banknote className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{TYPE_LABELS[tx.type] || tx.type}</p><Badge variant="outline">{tx.currency}</Badge>{tx.attachmentUrl && <Badge variant="secondary" className="gap-1"><ReceiptText className="h-3 w-3" />Receipt</Badge>}</div>
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{tx.reference}</p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{tx.customerName || "No customer linked"}{tx.description ? " · " + tx.description : ""}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{METHOD_LABELS[(tx.paymentMethod as TransactionPaymentMethod) || "manual_entry"]}</span><span>·</span><span>{formatDate(tx.createdAt,"MMM dd, yyyy HH:mm")}</span>{tx.updatedAt && tx.updatedAt !== tx.createdAt && <span>· Updated {formatDate(tx.updatedAt,"MMM dd, HH:mm")}</span>}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="text-left sm:text-right"><p className="font-display text-lg font-bold">{money(tx.amount,tx.currency)}</p><StatusBadge status={tx.status as any} /></div>
                      <Button type="button" size="sm" variant="outline" onClick={() => setActiveTransaction(tx)}><PencilLine className="mr-2 h-4 w-4" />Details</Button>
                    </div>
                  </motion.div>
                ))}
              </div>}
          </CardContent>
        </Card>

        <TransactionDetailDialog
          transaction={activeTransaction}
          open={Boolean(activeTransaction)}
          onOpenChange={(next) => { if (!next) setActiveTransaction(null); }}
          onUpdated={handleUpdated}
        />
        {activeTransaction && (
          <PrintableBusinessDocument
            id="transaction-receipt-print"
            title={activeTransaction.status === "completed" ? "Transaction Receipt" : "Transaction Record"}
            documentNumber={activeTransaction.reference}
            issuedAt={formatDate(activeTransaction.createdAt, "MMM dd, yyyy HH:mm")}
            status={activeTransaction.status.toUpperCase()}
          >
            {receiptBranding?.showCustomerDetails !== false && <div className="grid grid-cols-2 gap-4">
              <div><p><strong>Customer</strong></p><p>{activeTransaction.customerName || "No customer linked"}</p></div>
              <div><p><strong>Payment method</strong></p><p>{METHOD_LABELS[(activeTransaction.paymentMethod as TransactionPaymentMethod) || "manual_entry"]}</p></div>
            </div>}
            <table className="mt-5">
              <thead><tr><th>Transaction type</th><th>Description / reference</th><th>Amount</th></tr></thead>
              <tbody><tr><td>{TYPE_LABELS[activeTransaction.type] || activeTransaction.type}</td><td>{activeTransaction.description || "—"}</td><td>{money(activeTransaction.amount, activeTransaction.currency)}</td></tr></tbody>
            </table>
            {activeTransaction.notes && <div className="mt-4"><h3>Notes</h3><p className="whitespace-pre-wrap">{activeTransaction.notes}</p></div>}
            <div className="kaira-print-total flex items-center justify-between"><strong>Recorded amount · {activeTransaction.currency}</strong><strong>{money(activeTransaction.amount, activeTransaction.currency)}</strong></div>
            <p className="mt-3 text-xs">This document reflects the transaction status shown above. It is not confirmation from a bank or external payment gateway.</p>
            {activeTransaction.attachmentUrl && <p className="mt-2 text-xs">Supporting receipt/proof: attachment saved in Kaira Africa.</p>}
          </PrintableBusinessDocument>
        )}
      </div>
    </PageTransition>
  );
}
