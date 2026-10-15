import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageTransition } from "@/components/common/PageTransition";
import { KairaFeedbackCard } from "@/components/common/KairaFeedbackCard";
import { PrintableBusinessDocument, printKairaDocument } from "@/components/common/PrintableBusinessDocument";
import { useGetMe, useGetMyBusiness } from "@workspace/api-client-react";
import {
  getReceiptBranding, updateReceiptBranding, uploadReceiptLogo, removeReceiptLogo,
  type ReceiptBrandingInput, type ReceiptBrandingSettings,
} from "@/lib/platform-api";
import { FileImage, Printer, Save, Trash2, UploadCloud } from "lucide-react";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];
type BrandForm = Required<Pick<ReceiptBrandingSettings,
  "companyName" | "address" | "phone" | "email" | "website" | "footerNote" | "showReceiptNumber" | "showCustomerDetails"
>>;

function initialForm(branding?: ReceiptBrandingSettings, businessName?: string): BrandForm {
  return {
    companyName: branding?.companyName || businessName || "",
    address: branding?.address || "",
    phone: branding?.phone || "",
    email: branding?.email || "",
    website: branding?.website || "",
    footerNote: branding?.footerNote || "Thank you for your business.",
    showReceiptNumber: branding?.showReceiptNumber ?? true,
    showCustomerDetails: branding?.showCustomerDetails ?? true,
  };
}
function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The logo could not be read."));
    reader.onerror = () => reject(new Error("The logo could not be read. Please try another image."));
    reader.readAsDataURL(file);
  });
}

export default function ReceiptBrandingPage() {
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const { data: business } = useGetMyBusiness();
  const { data: branding, isLoading, isError, refetch } = useQuery({
    queryKey: ["receipt-branding"],
    queryFn: getReceiptBranding,
    staleTime: 60_000,
  });
  const [form, setForm] = useState<BrandForm>(() => initialForm());
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState("Action could not be completed");
  const [errorAction, setErrorAction] = useState<{ label: string; onClick: () => void } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [successTitle, setSuccessTitle] = useState("Saved successfully");
  const [successVariant, setSuccessVariant] = useState<"success" | "warning">("success");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const canEdit = me?.role === "owner";

  useEffect(() => {
    if (branding || business) setForm(initialForm(branding, business?.name));
  }, [branding, business?.name]);

  const updateField = <K extends keyof BrandForm>(key: K, value: BrandForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const clearFeedback = () => {
    setError(null);
    setErrorAction(null);
    setSuccess(null);
  };

  const save = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setSaving(true);
    clearFeedback();
    try {
      const payload: ReceiptBrandingInput = {
        companyName: form.companyName.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        footerNote: form.footerNote.trim(),
        showReceiptNumber: form.showReceiptNumber,
        showCustomerDetails: form.showCustomerDetails,
      };
      const saved = await updateReceiptBranding(payload);
      queryClient.setQueryData(["receipt-branding"], saved);
      setForm(initialForm(saved, business?.name));
      setSuccessTitle("Branding saved");
      setSuccessVariant("success");
      setSuccess("Your business details and print options are saved. The next receipt, CRM card and ledger print will use these settings.");
    } catch (err) {
      setErrorTitle("Branding could not be saved");
      setError(err instanceof Error ? err.message : "Kaira Africa could not save your branding settings.");
      setErrorAction({ label: "Retry saving", onClick: () => { void save(); } });
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    clearFeedback();
    if (!LOGO_TYPES.includes(file.type)) {
      setErrorTitle("Logo format not supported");
      setError("Choose a JPEG, PNG or WebP image. Your saved logo has not been changed.");
      setErrorAction({ label: "Choose another logo", onClick: () => logoInputRef.current?.click() });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setErrorTitle("Logo file is too large");
      setError("Choose an image no larger than 2 MB. Your saved logo has not been changed.");
      setErrorAction({ label: "Choose another logo", onClick: () => logoInputRef.current?.click() });
      return;
    }
    setLogoBusy(true);
    try {
      const dataUrl = await fileAsDataUrl(file);
      setLogoPreview(dataUrl);
      const saved = await uploadReceiptLogo(dataUrl);
      if (!saved.hasLogo) throw new Error("The server did not confirm that the logo was saved. Please try again.");
      queryClient.setQueryData(["receipt-branding"], saved);
      setLogoPreview(null);
      if (saved.logoUrl) {
        setSuccessTitle("Logo saved successfully");
        setSuccessVariant("success");
        setSuccess("Your logo is stored privately and linked to this business. It will appear on the next receipt, customer card and ledger printout.");
      } else {
        setSuccessTitle("Logo saved, preview link needs a refresh");
        setSuccessVariant("warning");
        setSuccess("The server confirmed the logo was saved, but its secure preview link could not be loaded. Reload saved settings before printing.");
        setErrorAction(null);
      }
    } catch (err) {
      // Never leave the just-selected file pretending to be a saved logo after upload failure.
      setLogoPreview(null);
      await queryClient.invalidateQueries({ queryKey: ["receipt-branding"] });
      setErrorTitle("Logo was not saved");
      setError(err instanceof Error ? err.message : "Kaira Africa could not upload your logo.");
      setErrorAction({ label: "Choose logo again", onClick: () => logoInputRef.current?.click() });
    } finally {
      setLogoBusy(false);
    }
  };

  const deleteLogo = async () => {
    setRemovingLogo(true);
    clearFeedback();
    try {
      const saved = await removeReceiptLogo();
      queryClient.setQueryData(["receipt-branding"], saved);
      setLogoPreview(null);
      setSuccessTitle("Logo removed");
      setSuccessVariant("success");
      setSuccess("The saved logo was removed. Kaira Africa will use the printed company name instead.");
    } catch (err) {
      setErrorTitle("Logo could not be removed");
      setError(err instanceof Error ? err.message : "Kaira Africa could not remove the saved logo.");
      setErrorAction({ label: "Retry removal", onClick: () => { void deleteLogo(); } });
    } finally {
      setRemovingLogo(false);
    }
  };

  const logoUrl = logoPreview || branding?.logoUrl || null;
  const printableBranding: ReceiptBrandingSettings = {
    companyName: form.companyName.trim() || business?.name || "Your business",
    address: form.address.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    website: form.website.trim(),
    footerNote: form.footerNote.trim() || "Thank you for your business.",
    showReceiptNumber: form.showReceiptNumber,
    showCustomerDetails: form.showCustomerDetails,
    logoUrl,
    hasLogo: Boolean(logoUrl),
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary"><FileImage className="h-3.5 w-3.5"/> Brand your business documents</div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Receipt & Print Branding</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Design a consistent, professional printout for transactions, customer records and the daily ledger. Your logo and business details are saved for the whole workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Free during early access</Badge>
            <Button type="button" variant="outline" disabled={isLoading || isError || saving || logoBusy || removingLogo} onClick={() => printKairaDocument("receipt-preview-print")}><Printer className="mr-2 h-4 w-4"/>Print sample / Save PDF</Button>
          </div>
        </div>

        <section className="relative isolate overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-5 text-white shadow-sm sm:p-7">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">A consistent brand at every touchpoint</p>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Every record should look like your business.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">A polished print template for customer receipts, CRM customer cards and daily cashbook reports. Use it now at no charge; this custom branding option is planned as a future premium feature and is not paywalled today.</p>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl"/>
          <div className="pointer-events-none absolute bottom-0 right-8 hidden h-24 w-24 rotate-12 rounded-2xl border border-white/15 bg-white/5 sm:block"/>
        </section>

        {isError && <KairaFeedbackCard
          variant="error"
          title="Saved receipt settings could not be loaded"
          description="Kaira Africa couldn't read your saved business print settings. Your existing records haven't been changed."
          actionLabel="Retry loading settings"
          onAction={() => void refetch()}
        />}
        {error && <KairaFeedbackCard
          variant="error"
          title={errorTitle}
          description={error}
          actionLabel={errorAction?.label}
          onAction={errorAction?.onClick}
          onDismiss={() => { setError(null); setErrorAction(null); }}
        />}
        {success && <KairaFeedbackCard
          variant={successVariant}
          title={successTitle}
          description={success}
          actionLabel={successVariant === "warning" ? "Reload saved settings" : undefined}
          onAction={successVariant === "warning" ? () => void refetch() : undefined}
          onDismiss={() => setSuccess(null)}
        />}
        {branding?.hasLogo && !branding.logoUrl && !logoPreview && !error && <KairaFeedbackCard
          variant="warning"
          title="A saved logo is not available to preview yet"
          description="Kaira Africa has a saved logo reference, but couldn't create a secure preview link. Reload settings and confirm storage access before printing."
          actionLabel="Reload saved settings"
          onAction={() => void refetch()}
        />}

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Company details and logo</CardTitle>
              <CardDescription>These details appear in the branded header of printable business documents. Only the business owner can change the saved branding.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="space-y-3"><div className="h-10 animate-pulse rounded-lg bg-muted"/><div className="h-10 animate-pulse rounded-lg bg-muted"/><div className="h-24 animate-pulse rounded-lg bg-muted"/></div> : (
                <form className="space-y-5" onSubmit={save}>
                  <fieldset disabled={!canEdit || saving || logoBusy || removingLogo} className="space-y-5">
                    <div className="rounded-xl border border-dashed p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex h-24 w-36 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 p-2">
                          {logoUrl ? <img src={logoUrl} alt="Receipt logo preview" className="max-h-full max-w-full object-contain"/> : <div className="text-center"><FileImage className="mx-auto h-7 w-7 text-muted-foreground"/><p className="mt-1 text-xs text-muted-foreground">Business logo</p></div>}
                        </div>
                        <div className="min-w-0 flex-1"><p className="font-semibold">Company logo</p><p className="mt-1 text-xs leading-5 text-muted-foreground">JPEG, PNG or WebP. Recommended landscape logo with a transparent or white background. Maximum file size 2 MB.</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button type="button" variant="outline" disabled={!canEdit || logoBusy} onClick={() => logoInputRef.current?.click()}><UploadCloud className="mr-2 h-4 w-4"/>{logoBusy ? "Uploading…" : "Upload logo"}</Button>
                            {branding?.hasLogo && <Button type="button" variant="ghost" disabled={!canEdit || removingLogo} onClick={() => void deleteLogo()}><Trash2 className="mr-2 h-4 w-4"/>{removingLogo ? "Removing…" : "Remove logo"}</Button>}
                            <input ref={logoInputRef} className="hidden" type="file" accept={LOGO_TYPES.join(",")} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void uploadLogo(file); }}/>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5"><Label htmlFor="receipt-company-name">Printed company name</Label><Input id="receipt-company-name" required maxLength={160} value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} placeholder={business?.name || "Your business name"}/><p className="text-xs text-muted-foreground">May differ from your legal/workspace name.</p></div>
                      <div className="space-y-1.5"><Label htmlFor="receipt-phone">Business phone</Label><Input id="receipt-phone" maxLength={80} value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+220…"/></div>
                      <div className="space-y-1.5"><Label htmlFor="receipt-email">Business email</Label><Input id="receipt-email" type="email" maxLength={160} value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="accounts@example.com"/></div>
                      <div className="space-y-1.5"><Label htmlFor="receipt-website">Website</Label><Input id="receipt-website" maxLength={200} value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://example.com"/></div>
                    </div>
                    <div className="space-y-1.5"><Label htmlFor="receipt-address">Business address</Label><Textarea id="receipt-address" rows={2} maxLength={300} value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Street, town/city, country"/></div>
                    <div className="space-y-1.5"><Label htmlFor="receipt-footer">Receipt footer message</Label><Textarea id="receipt-footer" rows={2} maxLength={600} value={form.footerNote} onChange={(e) => updateField("footerNote", e.target.value)} placeholder="Thank you for your business."/></div>
                    <div className="space-y-3 rounded-xl bg-muted/40 p-4">
                      <p className="text-sm font-semibold">Document options</p>
                      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={form.showReceiptNumber} onChange={(e) => updateField("showReceiptNumber", e.target.checked)}/><span><span className="font-medium">Show receipt or document reference</span><span className="block text-xs leading-5 text-muted-foreground">Keeps transaction references visible for matching and filing.</span></span></label>
                      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={form.showCustomerDetails} onChange={(e) => updateField("showCustomerDetails", e.target.checked)}/><span><span className="font-medium">Show linked customer details on transaction receipts</span><span className="block text-xs leading-5 text-muted-foreground">Controls whether customer name and payment method appear on transaction receipt printouts.</span></span></label>
                    </div>
                  </fieldset>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    {!canEdit && <p className="text-xs text-muted-foreground">Only the business owner can edit these settings.</p>}
                    <Button type="submit" disabled={!canEdit || saving || isLoading} className="ml-auto"><Save className="mr-2 h-4 w-4"/>{saving ? "Saving…" : "Save branding settings"}</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Live receipt preview</CardTitle><CardDescription>A sample of the layout that will be sent to your printer or saved as PDF.</CardDescription></CardHeader>
              <CardContent>
                <div className="mx-auto max-w-md rounded-xl border bg-white p-5 text-slate-800 shadow-sm">
                  <div className="flex items-start gap-3 border-b-2 border-emerald-800 pb-4">
                    {logoUrl && <img src={logoUrl} alt="" className="max-h-14 max-w-24 object-contain"/>}
                    <div className="min-w-0 flex-1"><p className="text-[9px] font-bold tracking-[0.18em] text-emerald-700">BUSINESS RECEIPT</p><h3 className="mt-1 break-words text-lg font-bold text-emerald-950">{form.companyName || business?.name || "Your business"}</h3><p className="mt-1 whitespace-pre-wrap text-[10px] leading-4 text-slate-500">{[form.address, form.phone, form.email, form.website].filter(Boolean).join("\n")}</p></div>
                  </div>
                  <div className={"flex justify-between gap-3 py-4 " + (form.showReceiptNumber ? "" : "justify-end")}>{form.showReceiptNumber && <div><p className="text-xs text-slate-500">Receipt reference</p><p className="text-sm font-semibold">SAMPLE-0001</p></div>}<div className="text-right"><p className="text-xs text-slate-500">Date</p><p className="text-sm font-semibold">{new Date().toLocaleDateString()}</p></div></div>
                  <div className="border-y border-slate-200 py-4 text-sm"><div className="flex justify-between gap-3"><span>Consultation / service</span><span>GMD 1,250.00</span></div><div className="mt-2 flex justify-between gap-3 text-slate-500"><span>Payment method</span><span>Bank transfer</span></div>{form.showCustomerDetails && <div className="mt-3 border-t border-dashed pt-3 text-xs text-slate-500">Customer: Sample customer</div>}</div>
                  <div className="my-4 flex justify-between rounded-lg bg-emerald-50 p-3 font-semibold text-emerald-950"><span>Total</span><span>GMD 1,250.00</span></div>
                  <p className="text-center text-xs text-slate-500">{form.footerNote || "Thank you for your business."}</p>
                  <p className="mt-2 text-center text-[9px] font-medium text-slate-400">Prepared by Kaira Africa</p>
                </div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Where the template is used</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div><p className="font-semibold">Transactions</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Print a transaction receipt or record with amount, currency, status, payment method and reference.</p></div><div><p className="font-semibold">Customer CRM</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Print a clean customer profile card using the same business header and saved footer.</p></div><div><p className="font-semibold">Daily ledger</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Print the selected register period, summary and entries with a consistent branded heading.</p></div></CardContent></Card>
          </div>
        </div>
        <PrintableBusinessDocument id="receipt-preview-print" title="Sample transaction receipt" documentNumber="SAMPLE-0001" issuedAt={new Date().toLocaleString()} status="COMPLETED" brandingOverride={printableBranding}>
          {form.showCustomerDetails && <div className="grid grid-cols-2 gap-4"><div><p><strong>Customer</strong></p><p>Sample customer</p></div><div><p><strong>Payment method</strong></p><p>Bank transfer</p></div></div>}
          <table className="mt-5"><thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead><tbody><tr><td>Consultation / service</td><td>1</td><td>GMD 1,250.00</td></tr></tbody></table>
          <div className="kaira-print-total flex items-center justify-between"><strong>Total paid</strong><strong>GMD 1,250.00</strong></div>
        </PrintableBusinessDocument>
      </div>
    </PageTransition>
  );
}
