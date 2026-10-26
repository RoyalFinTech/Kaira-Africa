import { PiggyBank, ShieldCheck, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/common/PageTransition";

export default function SavingsPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-emerald-100">
              <PiggyBank className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            </div>
            <div>
              <Badge className="mb-3 bg-emerald-100 text-emerald-800">KAIRA • SAVE WITH PURPOSE</Badge>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Savings Tracker</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Plan a savings goal and keep a clear record of money you have saved. This feature is being prepared and is not available in this release yet.
              </p>
            </div>
          </div>
        </section>
        <Card className="rounded-2xl border-emerald-100 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-emerald-700" aria-hidden="true" />How Savings Tracker will work</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4"><h2 className="font-semibold text-slate-900">1. Set a goal</h2><p className="mt-1 text-sm leading-6 text-slate-600">Name what you are saving for, choose a target amount and currency, and optionally set a target date.</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><h2 className="font-semibold text-slate-900">2. Record activity</h2><p className="mt-1 text-sm leading-6 text-slate-600">Record deposits and withdrawals only after they happen. Each entry will be part of your personal record.</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><h2 className="font-semibold text-slate-900">3. Keep currencies separate</h2><p className="mt-1 text-sm leading-6 text-slate-600">GMD, NGN and USD balances will remain separate. Kaira will not combine currencies or imply an exchange rate.</p></div>
            <div className="rounded-xl bg-amber-50 p-4"><h2 className="font-semibold text-amber-900">4. Understand the limits</h2><p className="mt-1 text-sm leading-6 text-slate-700">Records will be user-entered. Kaira will not verify external bank or wallet balances or transfer money automatically.</p></div>
          </CardContent>
        </Card>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <p>Never enter a mobile-money PIN, bank password or one-time verification code into a savings note. The tracker will only be enabled after its API, database migration and access controls have passed review.</p>
        </div>
      </main>
    </PageTransition>
  );
}
