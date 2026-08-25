import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/common/PageTransition';
import { useGetRevenueAnalytics, useGetCustomerAnalytics, useGetTransactionAnalytics } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/utils';
import { Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('month');
  const { data: revenueData } = useGetRevenueAnalytics({ period: period as any });
  const { data: customerData } = useGetCustomerAnalytics({ period: period as any });
  const { data: transactionData } = useGetTransactionAnalytics({ period: period as any });

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-1">Track your business performance</p>
          </div>
          <div className="flex gap-2">
            {['Week', 'Month', 'Quarter', 'Year'].map((p) => (
              <Button
                key={p}
                variant={period === p.toLowerCase() ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p.toLowerCase())}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-bold">{formatCurrency(revenueData?.total || 0)}</div>
              <p className="text-sm text-primary mt-2">+{revenueData?.changePercent}% vs previous period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-bold">{customerData?.total || 0}</div>
              <p className="text-sm text-primary mt-2">+{customerData?.changePercent}% vs previous period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transaction Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-bold">{formatCurrency(transactionData?.volume || 0)}</div>
              <p className="text-sm text-primary mt-2">+{transactionData?.changePercent}% vs previous period</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData?.data || []}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip content={({ active, payload }) => {
                  if (active && payload?.[0]) {
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-md">
                        <div className="font-semibold">{formatCurrency(payload[0].value as number)}</div>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#revGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Two charts side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction Volume by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Transactions by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={transactionData?.byType || []}>
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Customer Growth */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={customerData?.data || []}>
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Another row of charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transactions by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Transactions by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={transactionData?.byStatus || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {(transactionData?.byStatus || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue by Customer */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Customers by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData?.topCustomers.slice(0, 5).map(c => ({ name: `${c.firstName} ${c.lastName}`, value: c.totalSpend })) || []} layout="vertical">
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="value" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Geographic Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Customers by Country</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customerData && customerData.byCountry.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No customer location data yet.</p>
              )}
              {customerData?.byCountry.map((country, idx) => {
                const total = customerData.byCountry.reduce((sum, c) => sum + c.value, 0);
                const percentage = total > 0 ? ((country.value / total) * 100).toFixed(1) : '0.0';
                return (
                  <motion.div key={country.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{country.label}</span>
                      <span className="text-muted-foreground">{country.value} customers ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
