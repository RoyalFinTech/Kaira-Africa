import { KairaLogo } from '@/components/common/KairaLogo';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Download, ArrowLeftRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageTransition } from '@/components/common/PageTransition';
import { EmptyState } from '@/components/common/EmptyState';
import {
  useListTransactions,
  useCreateTransaction,
  useListCustomers,
  getListTransactionsQueryKey,
  getGetBusinessStatsQueryKey,
  getListCustomersQueryKey,
  getGetRevenueAnalyticsQueryKey,
  getGetTransactionAnalyticsQueryKey,
  ApiError,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';

const TRANSACTION_TYPES = ['payment', 'refund', 'transfer', 'withdrawal', 'deposit'] as const;

function NewTransactionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<typeof TRANSACTION_TYPES[number]>('payment');
  const [customerId, setCustomerId] = useState<string>('none');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // A simple picker list — good enough for choosing among a business's
  // existing customers without building a full search-autocomplete
  // component for this pass.
  const { data: customersData } = useListCustomers({ limit: 50 });

  const createTransaction = useCreateTransaction({
    mutation: {
      onSuccess: () => {
        // Money affects more than just the transaction list: customer
        // totalSpend is derived from this ledger, and business/revenue
        // analytics aggregate it too — all of it needs refetching so
        // nothing shows stale numbers after a new transaction.
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBusinessStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRevenueAnalyticsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTransactionAnalyticsQueryKey() });
        setAmount('');
        setDescription('');
        setCustomerId('none');
        onOpenChange(false);
      },
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to create transaction'),
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter an amount greater than zero');
      return;
    }
    createTransaction.mutate({
      data: {
        amount: numericAmount,
        currency: 'GMD',
        type,
        customerId: customerId === 'none' ? undefined : customerId,
        description: description || undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (GMD)</Label>
              <Input id="amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer">Customer (optional)</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger id="customer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No customer</SelectItem>
                {customersData?.customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Invoice #204" />
          </div>
          {error && <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><KairaLogo width={26} className="shrink-0 rounded bg-white p-0.5" /><span>{error}</span></div>}
          <DialogFooter>
            <Button type="submit" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? 'Recording…' : 'Record Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useListTransactions({
    search: debouncedSearch || undefined,
    // "all" is a UI-only sentinel — the backend rejects it as an
    // invalid enum value, same fix as CustomersPage.
    status: statusFilter === 'all' ? undefined : (statusFilter as 'completed' | 'pending' | 'failed' | 'cancelled'),
    type: typeFilter === 'all' ? undefined : (typeFilter as typeof TRANSACTION_TYPES[number]),
  });

  const transactions = data?.transactions || [];
  // Derived from whatever page of results is currently loaded, same
  // caveat as CustomersPage — a true business-wide total would need a
  // dedicated aggregate endpoint.
  const totalVolume = transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
  const completedCount = transactions.filter(t => t.status === 'completed').length;
  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const failedCount = transactions.filter(t => t.status === 'failed').length;

  const typeBadgeColors: Record<string, string> = {
    payment: 'bg-primary/10 text-primary border-primary/20',
    deposit: 'bg-secondary/10 text-secondary border-secondary/20',
    transfer: 'bg-accent/10 text-accent-foreground border-accent/20',
    withdrawal: 'bg-muted text-muted-foreground',
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground mt-1">View and manage all transactions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled title="CSV/PDF export isn't built yet">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </div>
        </div>

        <NewTransactionDialog open={createOpen} onOpenChange={setCreateOpen} />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold">{formatCurrency(totalVolume)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold text-primary">{completedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold text-secondary">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold text-destructive">{failedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transaction List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}
              </div>
            ) : transactions.length > 0 ? (
              <div className="divide-y divide-border">
                {transactions.map((txn, idx) => (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">
                        {txn.customerName || 'Unknown Customer'}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono truncate">
                        {txn.reference}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <Badge variant="outline" className={typeBadgeColors[txn.type]}>
                        {txn.type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-semibold text-foreground">
                        {formatCurrency(txn.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(txn.createdAt, 'MMM dd, HH:mm')}
                      </p>
                    </div>
                    <StatusBadge status={txn.status as any} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-8">
                <EmptyState
                  icon={ArrowLeftRight}
                  title="No transactions found"
                  description="Try adjusting your search or filters"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
