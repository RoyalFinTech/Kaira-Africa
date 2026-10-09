import { KairaLogo } from '@/components/common/KairaLogo';
import { useState } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Mail, Phone, MapPin, Calendar, DollarSign,
  ArrowLeftRight, Building2, UserCheck, Pencil
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageTransition } from '@/components/common/PageTransition';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  useGetCustomer,
  useListTransactions,
  useUpdateCustomer,
  getGetCustomerQueryKey,
  getListCustomersQueryKey,
  ApiError,
  type Customer,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate, formatRelativeTime, getInitials } from '@/lib/utils';

function EditCustomerDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: Customer;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email || '',
    phone: customer.phone || '',
    company: customer.company || '',
    country: customer.country || '',
    city: customer.city || '',
  });
  const [error, setError] = useState<string | null>(null);

  const updateCustomer = useUpdateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customer.id) });
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        onOpenChange(false);
      },
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to update customer'),
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    updateCustomer.mutate({
      id: customer.id,
      data: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        company: form.company || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName">First name</Label>
              <Input id="edit-firstName" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName">Last name</Label>
              <Input id="edit-lastName" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-company">Company</Label>
              <Input id="edit-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-country">Country</Label>
              <Input id="edit-country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-city">City</Label>
              <Input id="edit-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          {error && <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><KairaLogo width={26} className="shrink-0 rounded bg-white p-0.5" /><span>{error}</span></div>}
          <DialogFooter>
            <Button type="submit" disabled={updateCustomer.isPending}>
              {updateCustomer.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerDetailPage() {
  const [, params] = useRoute('/customers/:id');
  const [, navigate] = useLocation();
  const id = params?.id || '';
  const [editOpen, setEditOpen] = useState(false);

  const { data: customer, isLoading } = useGetCustomer(id);
  const { data: transactions = [] } = useListTransactions({ customerId: id });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-32" />
        <div className="h-40 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <EmptyState
        icon={UserCheck}
        title="Customer not found"
        description="This customer doesn't exist or was removed."
        action={{ label: 'Back to Customers', onClick: () => navigate('/customers') }}
      />
    );
  }

  const txns = Array.isArray(transactions) ? transactions : (transactions as any).transactions || [];

  return (
    <PageTransition>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/customers">
            <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
              <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Customers
            </div>
          </Link>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        <EditCustomerDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Customer Info Card ── */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                {/* Avatar + name */}
                <div className="flex flex-col items-center text-center mb-5">
                  <Avatar className="h-16 w-16 mb-3">
                    <AvatarFallback className="bg-secondary text-sidebar-primary-foreground text-xl font-bold">
                      {getInitials(customer.firstName, customer.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {customer.firstName} {customer.lastName}
                  </h2>
                  {customer.company && (
                    <p className="text-sm text-muted-foreground">{customer.company}</p>
                  )}
                  <div className="mt-2">
                    <StatusBadge status={customer.status} />
                  </div>
                </div>

                <Separator className="mb-4" />

                {/* Details */}
                <div className="space-y-3">
                  {[
                    { icon: Mail, label: 'Email', value: customer.email },
                    { icon: Phone, label: 'Phone', value: customer.phone },
                    { icon: MapPin, label: 'Location', value: [customer.city, customer.country].filter(Boolean).join(', ') },
                    { icon: Calendar, label: 'Customer since', value: formatDate(customer.createdAt, 'MMM dd, yyyy') },
                  ].map(({ icon: Icon, label, value }) => value && (
                    <div key={label} className="flex items-start gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium text-foreground">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold font-display text-foreground">
                      {formatCurrency(customer.totalSpend)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Spend</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-lg font-bold font-display text-foreground">
                      {customer.transactionCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Transactions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full gap-2" asChild>
              <Link href="/transactions">
                <ArrowLeftRight className="h-4 w-4" />
                View All Transactions
              </Link>
            </Button>
          </div>

          {/* ── Transaction History ── */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {txns.length === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      icon={ArrowLeftRight}
                      title="No transactions yet"
                      description="Transactions with this customer will appear here."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {txns.slice(0, 10).map((txn: any, i: number) => (
                      <motion.div
                        key={txn.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground font-mono">
                            {txn.reference}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {txn.description || txn.type} · {formatRelativeTime(txn.createdAt)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-foreground">
                            {formatCurrency(txn.amount, txn.currency)}
                          </p>
                          <StatusBadge status={txn.status} className="text-xs mt-0.5" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
