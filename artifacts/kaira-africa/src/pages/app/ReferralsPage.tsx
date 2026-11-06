import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, Copy, Gift, Link2, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KairaLogo } from "@/components/common/KairaLogo";
import { apiRequestJson } from "@/lib/api-client";

type BusinessReferralSummary = {
  businessName: string;
  referralCode: string;
  referredBusinessCount: number;
};

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const referral = useQuery({
    queryKey: ["business-referral-link"],
    queryFn: () => apiRequestJson<BusinessReferralSummary>("/businesses/me/referral"),
  });

  const referralUrl = referral.data && typeof window !== "undefined"
    ? `${window.location.origin}/?ref=${encodeURIComponent(referral.data.referralCode)}`
    : "";

  const copyReferralLink = async () => {
    if (!referralUrl) return;
    setCopyError(null);
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(referralUrl);
        } catch {
          // Fall through to the selection-based fallback for browsers that
          // expose Clipboard API but deny permission in the current context.
          const textarea = document.createElement("textarea");
          textarea.value = referralUrl;
          textarea.setAttribute("readonly", "");
          textarea.setAttribute("aria-hidden", "true");
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          textarea.style.pointerEvents = "none";
          document.body.appendChild(textarea);
          textarea.select();
          const copied = document.execCommand("copy");
          textarea.remove();
          if (!copied) throw new Error("Clipboard fallback was denied");
        }
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = referralUrl;
        textarea.setAttribute("readonly", "");
        textarea.setAttribute("aria-hidden", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Clipboard fallback was denied");
      }
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyError("Kaira Africa could not copy automatically. Tap the link above to select it, then copy.");
    }
  };

  const shareReferralLink = async () => {
    if (!referralUrl || !referral.data) return;
    setCopyError(null);
    if (typeof navigator.share !== "function") {
      await copyReferralLink();
      return;
    }
    try {
      await navigator.share({
        title: "Kaira Africa",
        text: "Create your own separate business workspace with Kaira Africa.",
        url: referralUrl,
      });
      setCopied(false);
    } catch (error) {
      // Closing the native share sheet is an intentional user action.
      if (error instanceof Error && error.name === "AbortError") return;
      setCopyError("The share sheet could not be opened. You can still copy the link or use WhatsApp.");
    }
  };

  const shareOnWhatsApp = () => {
    if (!referralUrl || !referral.data) return;
    const message = `Hello! My business uses Kaira Africa to organise daily business work. You can create your own separate business workspace here: ${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl bg-[#0D2818] p-5 text-white shadow-sm sm:p-7">
        <div aria-hidden="true" className="absolute -right-12 -top-12 -z-10 h-48 w-48 rounded-full bg-[#D8B45A]/15 blur-3xl" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex rounded-lg bg-white p-2 shadow-sm">
              <KairaLogo width={132} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#E7B32B]">Grow with Kaira Africa</p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Refer a Business</h1>
            <p className="max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
              Share Kaira Africa with another business owner. They create their own business workspace, separate from your team and your business records.
            </p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center self-start rounded-2xl border border-[#E7B32B]/30 bg-white/10 text-[#E7B32B] sm:self-center">
            <Share2 className="h-8 w-8" />
          </div>
        </div>
      </section>

      {referral.isLoading ? (
        <Card><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" /> Loading your business referral link…</CardContent></Card>
      ) : referral.isError ? (
        <Card><CardContent className="space-y-3 p-6"><p className="text-sm text-destructive">Your referral link could not be loaded. Make sure you are signed in as the business owner, then try again.</p><Button variant="outline" onClick={() => void referral.refetch()}>Try again</Button></CardContent></Card>
      ) : referral.data ? (
        <>
          <Card className="border-primary/15">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><Link2 className="h-5 w-5 text-primary" /> Your unique business referral link</CardTitle>
              <CardDescription>This link belongs to {referral.data.businessName}. It remains the same when you sign in again.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input aria-label="Your unique Kaira Africa referral link" readOnly value={referralUrl} onFocus={(event) => event.currentTarget.select()} className="min-w-0 bg-muted/40 text-sm" />
                <Button onClick={() => void copyReferralLink()} className="shrink-0 gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
              {copyError && <p role="alert" className="text-sm text-destructive">{copyError}</p>}
              <p aria-live="polite" className="text-xs text-muted-foreground">{copied ? "Referral link copied to your clipboard." : ""}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => void shareReferralLink()} className="gap-2"><Share2 className="h-4 w-4" /> Share link</Button>
                <Button variant="outline" onClick={shareOnWhatsApp} className="gap-2"><Share2 className="h-4 w-4" /> Share through WhatsApp</Button>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Referral code</span>
                  <code className="break-all">{referral.data.referralCode}</code>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Businesses joined through your link</p>
                  <p className="text-2xl font-bold tabular-nums">{referral.data.referredBusinessCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E7B32B]/15 text-[#9A7415]"><Gift className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="font-semibold">Referral rewards</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">Bonus features and referral rewards are not active yet. This page currently shares and records business referrals only.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <Card className="bg-muted/30">
        <CardContent className="flex items-start gap-3 p-4 sm:p-5">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-semibold">For independent businesses—not team invitations</p>
            <p className="text-sm leading-6 text-muted-foreground">
              A business that follows this link signs up for its own Kaira Africa account. It does not become a member of your business, see your customers or records, or receive access through your team permissions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
