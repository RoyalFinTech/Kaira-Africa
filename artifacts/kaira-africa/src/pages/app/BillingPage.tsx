import { CreditCard, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { PageTransition } from '@/components/common/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BillingPage() {
  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-foreground">Billing &amp; Plan</h1>
            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Coming soon</Badge>
          </div>
          <p className="max-w-2xl text-muted-foreground">
            Manage your Kaira Africa plan here in the future. For now, all currently available features are free to use.
          </p>
        </header>

        <Card className="overflow-hidden border-primary/20">
          <div className="bg-gradient-to-br from-[#0D3B2A] via-[#14583D] to-[#1B7651] p-6 text-white sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <Sparkles className="h-4 w-4" /> YOUR CURRENT ACCESS
                </div>
                <h2 className="font-display text-3xl font-bold">Free Access</h2>
                <p className="max-w-lg text-sm leading-6 text-white/85">
                  Enjoy the available business tools at no cost while we prepare future plan options. No payment is required today.
                </p>
              </div>
              <div className="flex h-24 w-36 shrink-0 items-center justify-center self-start rounded-xl border border-white/25 bg-white/10 shadow-lg sm:self-center">
                <CreditCard className="h-12 w-12 text-[#F0C75E]" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div><p className="font-semibold">Available features</p><p className="mt-1 text-sm text-muted-foreground">Use the features currently available in your account for free.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div><p className="font-semibold">No card required</p><p className="mt-1 text-sm text-muted-foreground">No debit card or payment details are collected on this page.</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Payment methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-xl border border-dashed p-5 sm:flex-row sm:items-center">
              <div className="flex h-14 w-20 items-center justify-center rounded-lg border bg-muted/40">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Debit card and other payment options</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Payment setup is not active yet. When billing launches, this area will explain available payment methods and any applicable prices before you choose to subscribe.
                </p>
              </div>
              <Badge variant="outline" className="w-fit shrink-0">Coming soon</Badge>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              This page is an informational preview only. It does not start a subscription, charge a card, or change your current access.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
