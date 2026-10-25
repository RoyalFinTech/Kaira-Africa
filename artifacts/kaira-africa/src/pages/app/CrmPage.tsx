import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Phone, Mail, CalendarDays, MessageSquare, CheckCircle2, UserRound, Camera, Upload, Trash2, Pencil, Download, Printer, X, Save, Users, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/common/PageTransition";
import { CameraCaptureDialog } from "@/components/common/CameraCaptureDialog";
import { PrintableBusinessDocument, printKairaDocument } from "@/components/common/PrintableBusinessDocument";
import { getCrmOverview, createCrmInteraction, completeCrmInteraction, searchCrmCustomers, createManagedCrmCustomer, updateManagedCrmCustomer, uploadCrmCustomerPhoto, removeCrmCustomerPhoto, type ManagedCrmCustomer, type CrmProfileData } from "@/lib/platform-api";
import { formatDate } from "@/lib/utils";

type CustomerDraft = {
  firstName: string; lastName: string; email: string; phone: string; company: string;
  country: string; city: string; status: "active" | "inactive";
  dateOfBirth: string; preferredName: string; gender: string; maritalStatus: string;
  occupation: string; customerType: string; preferredContactMethod: string;
  preferredLanguage: string; addressLine1: string; addressLine2: string;
  postalCode: string; region: string; source: string; tags: string;
  interests: string; preferences: string; consentNotes: string; internalNotes: string;
  emergencyContactName: string; emergencyContactPhone: string;
};
const blankDraft = (): CustomerDraft => ({
  firstName: "", lastName: "", email: "", phone: "", company: "", country: "", city: "", status: "active",
  dateOfBirth: "", preferredName: "", gender: "", maritalStatus: "", occupation: "", customerType: "",
  preferredContactMethod: "", preferredLanguage: "", addressLine1: "", addressLine2: "", postalCode: "",
  region: "", source: "", tags: "", interests: "", preferences: "", consentNotes: "", internalNotes: "",
  emergencyContactName: "", emergencyContactPhone: "",
});
const fromCustomer = (c: ManagedCrmCustomer): CustomerDraft => {
  const p = c.profileData ?? {};
  return {
    ...blankDraft(), firstName: c.firstName, lastName: c.lastName, email: c.email ?? "", phone: c.phone ?? "",
    company: c.company ?? "", country: c.country ?? "", city: c.city ?? "", status: c.status === "inactive" ? "inactive" : "active",
    dateOfBirth: p.dateOfBirth ?? "", preferredName: p.preferredName ?? "", gender: p.gender ?? "",
    maritalStatus: p.maritalStatus ?? "", occupation: p.occupation ?? "", customerType: p.customerType ?? "",
    preferredContactMethod: p.preferredContactMethod ?? "", preferredLanguage: p.preferredLanguage ?? "",
    addressLine1: p.addressLine1 ?? "", addressLine2: p.addressLine2 ?? "", postalCode: p.postalCode ?? "",
    region: p.region ?? "", source: p.source ?? "", tags: (p.tags ?? []).join(", "),
    interests: p.interests ?? "", preferences: p.preferences ?? "", consentNotes: p.consentNotes ?? "",
    internalNotes: p.internalNotes ?? "", emergencyContactName: p.emergencyContactName ?? "",
    emergencyContactPhone: p.emergencyContactPhone ?? "",
  };
};
const toInput = (d: CustomerDraft) => {
  const profileData: CrmProfileData = {};
  (["dateOfBirth","preferredName","gender","maritalStatus","occupation","customerType","preferredContactMethod","preferredLanguage","addressLine1","addressLine2","postalCode","region","source","interests","preferences","consentNotes","internalNotes","emergencyContactName","emergencyContactPhone"] as const).forEach((key) => {
    const value = d[key].trim();
    Object.assign(profileData, { [key]: value });
  });
  const tags = d.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 30);
  profileData.tags = tags;
  return {
    firstName: d.firstName.trim(), lastName: d.lastName.trim(), email: d.email.trim(),
    phone: d.phone.trim(), company: d.company.trim(),
    country: d.country.trim(), city: d.city.trim(), status: d.status, profileData,
  };
};
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read this image."));
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });
}
function CustomerForm({ initial, saving, error, onCancel, onSave }: {
  initial: CustomerDraft; saving: boolean; error: string | null;
  onCancel: () => void; onSave: (draft: CustomerDraft, photo: File | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const uploadPhotoRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const choosePhoto = (next: File | null) => {
    setPhotoError("");
    if (next && !["image/jpeg", "image/png", "image/webp"].includes(next.type)) { setPhotoError("Choose a JPEG, PNG or WebP image."); return; }
    if (next && next.size > 2 * 1024 * 1024) { setPhotoError("The photo must be 2 MB or smaller."); return; }
    setPhoto(next);
    if (!next) { setPhotoPreview(null); return; }
    void readImage(next).then(setPhotoPreview).catch(() => { setPhotoPreview(null); setPhotoError("Photo preview failed. Please choose the image again."); });
  };
  const update = (key: keyof CustomerDraft, value: string) => setDraft((old) => ({ ...old, [key]: value } as CustomerDraft));
  const field = (key: keyof CustomerDraft, label: string, hint?: string, type = "text") => (
    <label className="block space-y-1.5 text-sm font-medium" key={key}>
      <span>{label}</span>
      <Input type={type} value={draft[key]} onChange={(e) => update(key, e.target.value)} />
      {hint && <span className="block text-xs font-normal leading-5 text-muted-foreground">{hint}</span>}
    </label>
  );
  return <form className="space-y-5" onSubmit={async (e) => { e.preventDefault(); await onSave(draft, photo); }}>
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="font-semibold">Customer identity</p><p className="mb-4 mt-1 text-xs leading-5 text-muted-foreground">Only the customer's first and last names are required. Add other information when it is relevant and appropriate.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {field("firstName","First name *")}{field("lastName","Last name *")}
        {field("preferredName","Preferred name","What the customer likes to be called.")}{field("dateOfBirth","Date of birth","Optional. Collect only when needed.","date")}
        {field("phone","Phone number")}{field("email","Email address","","email")}
        {field("customerType","Customer type","For example, walk-in, returning, referral or VIP.")}{field("company","Company / organisation")}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-medium">Gender (optional)<select className="h-10 w-full rounded-md border bg-background px-3" value={draft.gender} onChange={(e) => update("gender",e.target.value)}><option value="">Not specified</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option><option>Self-described</option></select></label>
        <label className="block space-y-1.5 text-sm font-medium">Marital status (optional)<select className="h-10 w-full rounded-md border bg-background px-3" value={draft.maritalStatus} onChange={(e) => update("maritalStatus",e.target.value)}><option value="">Not provided</option><option>Single</option><option>Married</option><option>Separated</option><option>Divorced</option><option>Widowed</option><option>Prefer not to say</option></select></label>
        {field("occupation","Occupation")}{field("preferredLanguage","Preferred language")}
      </div>
    </div>
    <div className="rounded-xl border p-4">
      <p className="font-semibold">Contact and location</p><p className="mb-4 mt-1 text-xs leading-5 text-muted-foreground">Use these details to contact the customer or deliver a service. Leave any unknown field blank.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {field("addressLine1","Address line 1")}{field("addressLine2","Address line 2")}
        {field("city","Town / city")}{field("region","Region / state")}
        {field("postalCode","Postal code")}{field("country","Country")}
        {field("preferredContactMethod","Preferred contact method","Phone, SMS, email or WhatsApp.")}
        {field("source","How they found you","Referral, social media, walk-in, campaign…")}
        {field("emergencyContactName","Emergency contact name","Only where relevant to your service.")}{field("emergencyContactPhone","Emergency contact phone")}
      </div>
    </div>
    <div className="rounded-xl border p-4">
      <p className="font-semibold">Relationship notes</p><p className="mb-4 mt-1 text-xs leading-5 text-muted-foreground">Keep notes respectful, factual and relevant. Avoid recording sensitive details without a clear need and appropriate permission.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {field("tags","Tags","Separate tags with commas, e.g. returning, referral.")}{field("interests","Interests")}
        {field("preferences","Service or communication preferences")}<label className="block space-y-1.5 text-sm font-medium">Status<select className="h-10 w-full rounded-md border bg-background px-3" value={draft.status} onChange={(e) => update("status",e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-medium">Consent / permissions notes<Textarea rows={3} value={draft.consentNotes} onChange={(e) => update("consentNotes",e.target.value)} placeholder="Record relevant consent, purpose and date. Avoid storing unnecessary sensitive details."/></label>
        <label className="block space-y-1.5 text-sm font-medium">Internal customer notes<Textarea rows={3} value={draft.internalNotes} onChange={(e) => update("internalNotes",e.target.value)} placeholder="Useful context for the next staff member…"/></label>
      </div>
    </div>
    <div className="rounded-xl border p-4">
      <p className="font-semibold">Customer photo</p><p className="mb-3 mt-1 text-xs leading-5 text-muted-foreground">Choose a face photo from your device or take one using your camera. JPEG, PNG or WebP, up to 2 MB.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => uploadPhotoRef.current?.click()}><Upload className="mr-2 h-4 w-4"/>Upload from device</Button>
        <Button type="button" variant="outline" onClick={() => setCameraOpen(true)}><Camera className="mr-2 h-4 w-4"/>Take photo</Button>
        <input ref={uploadPhotoRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { choosePhoto(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      </div>
      {photo && <p className="mt-2 text-xs text-muted-foreground">Selected: {photo.name} · {(photo.size / 1024).toFixed(0)} KB</p>}
      {photo && <img src={photoPreview || undefined} alt="Selected customer photo preview" className="mt-3 h-20 w-20 rounded-xl border object-cover" />}
      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={choosePhoto}
        title="Take customer photo"
        description="Capture a clear face photo with your device camera. Upload from device remains a separate option."
      />
      {photoError && <p role="alert" className="mt-2 text-sm text-destructive">{photoError}</p>}
    </div>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving || !draft.firstName.trim() || !draft.lastName.trim()}><Save className="mr-2 h-4 w-4"/>{saving ? "Saving customer…" : "Save customer"}</Button></div>
  </form>;
}

export default function CrmPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [directoryPage, setDirectoryPage] = useState(0);
  const [activityCustomerSearch, setActivityCustomerSearch] = useState("");
  const [debouncedActivityCustomerSearch, setDebouncedActivityCustomerSearch] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedSearch(search), 250); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => { setDirectoryPage(0); }, [debouncedSearch]);
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedActivityCustomerSearch(activityCustomerSearch), 250); return () => window.clearTimeout(timer); }, [activityCustomerSearch]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedCrmCustomer | null>(null);
  const [selected, setSelected] = useState<ManagedCrmCustomer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [printCustomers, setPrintCustomers] = useState<ManagedCrmCustomer[]>([]);
  const [printAllRequested, setPrintAllRequested] = useState(false);
  useEffect(() => {
    if (!printAllRequested) return;
    setPrintAllRequested(false);
    window.setTimeout(() => printKairaDocument("crm-directory-print"), 0);
  }, [printAllRequested, printCustomers]);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [activityError, setActivityError] = useState("");
  const [activitySaving, setActivitySaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoTargetRef = useRef<ManagedCrmCustomer | null>(null);
  const [photoCameraOpen, setPhotoCameraOpen] = useState(false);
  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useQuery({ queryKey: ["crm-overview"], queryFn: getCrmOverview });
  const { data: crmData, isLoading, isError } = useQuery({ queryKey: ["crm-customers", debouncedSearch, directoryPage], queryFn: () => searchCrmCustomers(debouncedSearch, directoryPage * 200, 200) });
  const customers = crmData?.customers ?? [];
  const { data: activityCustomerData } = useQuery({ queryKey: ["crm-activity-customer-search", debouncedActivityCustomerSearch], queryFn: () => searchCrmCustomers(debouncedActivityCustomerSearch, 0, 50) });
  const activityCustomers = activityCustomerData?.customers ?? [];
  const directoryTotal = crmData?.total ?? 0;
  const directoryPageCount = Math.max(1, Math.ceil(directoryTotal / 200));
  const metrics = overview?.metrics;
  const openForm = (customer?: ManagedCrmCustomer) => { setEditing(customer ?? null); setSelected(null); setFormError(null); setFormOpen(true); };
  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["crm-customers"] }); await qc.invalidateQueries({ queryKey: ["crm-overview"] }); };
  const saveQuickPhoto = async (file: File | undefined) => {
    const target = photoTargetRef.current;
    if (!file || !target) return;
    setFormError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setFormError("Choose a JPEG, PNG or WebP customer photo up to 2 MB.");
      return;
    }
    try {
      const updated = await uploadCrmCustomerPhoto(target.id, await readImage(file));
      if (selected?.id === target.id) setSelected(updated);
      photoTargetRef.current = updated;
      await refresh();
      setFormError(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Photo upload failed.");
    }
  };
  const saveCustomer = async (draft: CustomerDraft, photo: File | null) => {
    setSaving(true); setFormError(null);
    try {
      const payload = toInput(draft);
      let saved = editing ? await updateManagedCrmCustomer(editing.id, payload) : await createManagedCrmCustomer(payload);
      let photoFailed = false;
      if (photo) {
        try { saved = await uploadCrmCustomerPhoto(saved.id, await readImage(photo)); }
        catch (error) {
          photoFailed = true;
          setEditing(saved);
          setFormError("Customer details were saved, but the photo upload failed: " + (error instanceof Error ? error.message : "Please retry the photo upload."));
        }
      }
      await refresh();
      if (!photoFailed) { setFormOpen(false); setEditing(null); setSelected(saved); }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The customer could not be saved. Please try again.");
    } finally { setSaving(false); }
  };
  const addNote = async () => {
    if (!customerId || !title.trim() || !note.trim()) return;
    setActivitySaving(true); setActivityError("");
    try {
      await createCrmInteraction({ customerId, type: "note", title: title.trim(), note: note.trim(), nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : undefined });
      setTitle(""); setNote(""); setNextActionAt(""); await qc.invalidateQueries({ queryKey: ["crm-overview"] });
    } catch (error) { setActivityError(error instanceof Error ? error.message : "Could not save this activity."); }
    finally { setActivitySaving(false); }
  };
  const fetchAllMatchingCustomers = async (searchTerm = debouncedSearch) => {
    const allCustomers: ManagedCrmCustomer[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;
    while (offset < total) {
      const page = await searchCrmCustomers(searchTerm, offset, 200);
      allCustomers.push(...page.customers);
      total = page.total;
      if (page.customers.length === 0) break;
      offset += page.customers.length;
    }
    return allCustomers;
  };
  const exportCsv = async () => {
    try {
      const allCustomers = await fetchAllMatchingCustomers(search.trim());
      const headers = ["First name","Last name","Phone","Email","Company","Date of birth","Marital status","Occupation","City","Country","Status","Notes"];
      const rows = allCustomers.map((c) => [c.firstName,c.lastName,c.phone ?? "",c.email ?? "",c.company ?? "",c.profileData?.dateOfBirth ?? "",c.profileData?.maritalStatus ?? "",c.profileData?.occupation ?? "",c.city ?? "",c.country ?? "",c.status,c.profileData?.internalNotes ?? ""]);
      const escape = (value: unknown) => '"' + String(value ?? "").replace(/"/g,'""') + '"';
      const csv = [headers,...rows].map((row) => row.map(escape).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = "kaira-crm-customers.csv"; a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not export the complete customer list. Please try again.");
    }
  };
  const printCompleteDirectory = async () => {
    setFormError(null);
    try {
      setPrintCustomers(await fetchAllMatchingCustomers(search.trim()));
      setPrintAllRequested(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not load the complete customer directory for printing.");
    }
  };
  const filteredCount = crmData?.total ?? 0;

  return <PageTransition><div className="mx-auto max-w-7xl space-y-6 print:max-w-none">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary"><Users className="h-3.5 w-3.5"/> Customer relationship workspace</div><h1 className="font-display text-3xl font-bold tracking-tight">Customer CRM</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Keep customer details, preferences, conversations and next steps together. Start with the basics and add optional information only when it helps serve the customer.</p></div>
      <div className="flex flex-wrap gap-2 print:hidden"><Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4"/>Export CSV</Button><Button variant="outline" onClick={printCompleteDirectory}><Printer className="mr-2 h-4 w-4"/>Print / PDF</Button><Button onClick={() => openForm()}><Plus className="mr-2 h-4 w-4"/>Add customer</Button></div>
    </div>
    <section className="relative isolate overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 shadow-sm sm:p-7">
      <div className="relative z-10 max-w-xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-800/10 bg-white/85 px-3 py-1 text-xs font-medium text-emerald-800"><Users className="h-3.5 w-3.5"/> Relationships, not just records</div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">Know your customers. Serve them better.</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-emerald-950/70">Keep contact details, customer notes, preferences and follow-ups in one place. Add optional personal details only when your organisation genuinely needs them.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-emerald-900"><span className="rounded-full bg-white px-3 py-2 shadow-sm">Flexible profiles</span><span className="rounded-full bg-white px-3 py-2 shadow-sm">Customer history</span><span className="rounded-full bg-white px-3 py-2 shadow-sm">Next-step reminders</span></div>
      </div>
      <div className="pointer-events-none absolute -right-4 bottom-0 top-0 hidden w-[38%] items-center justify-center sm:flex"><img src="/kaira-crm-premium-card.svg" alt="" className="h-[96%] max-w-full object-contain drop-shadow-xl"/></div>
      <div className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl"/>
    </section>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Users className="h-5 w-5"/></div><div><p className="text-xs text-muted-foreground">Customers in CRM</p><p className="text-2xl font-bold">{metrics?.totalCustomers ?? filteredCount}</p><p className="text-xs text-muted-foreground">Searchable customer records</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600"><UserRound className="h-5 w-5"/></div><div><p className="text-xs text-muted-foreground">Active customers</p><p className="text-2xl font-bold">{metrics?.activeCustomers ?? "—"}</p><p className="text-xs text-muted-foreground">Currently active relationships</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-amber-500/10 p-3 text-amber-600"><Clock3 className="h-5 w-5"/></div><div><p className="text-xs text-muted-foreground">Open follow-ups</p><p className="text-2xl font-bold">{metrics?.openFollowUps ?? "—"}</p><p className="text-xs text-muted-foreground">Reminders still to complete</p></div></CardContent></Card>
    </div>
    <Card className="border-primary/15 bg-primary/[0.025]"><CardContent className="grid gap-3 p-4 sm:grid-cols-3"><div><p className="text-sm font-semibold">Customer profile</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Core identity and contact details. First and last name are required; other fields are optional.</p></div><div><p className="text-sm font-semibold">Relationship notes</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Record service preferences, feedback and useful follow-up context, keeping notes factual and respectful.</p></div><div><p className="text-sm font-semibold">Industry-specific fields</p><p className="mt-1 text-xs leading-5 text-muted-foreground">DOB, marital status and emergency contact are optional. Collect sensitive details only when relevant and appropriately authorised.</p></div></CardContent></Card>
    {formError && !formOpen && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{formError}</div>}
    {formOpen && <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>{editing ? "Edit customer profile" : "Create customer profile"}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Fields marked optional can be left blank and completed later.</p></div><Button variant="ghost" size="icon" onClick={() => {setFormOpen(false);setFormError(null);}}><X className="h-4 w-4"/></Button></CardHeader><CardContent><CustomerForm key={editing?.id ?? "new-customer"} initial={editing ? fromCustomer(editing) : blankDraft()} saving={saving} error={formError} onCancel={() => setFormOpen(false)} onSave={saveCustomer}/></CardContent></Card>}
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2"><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Customer directory</CardTitle><p className="mt-1 text-sm text-muted-foreground">Search names, phone, email, company, date of birth and saved profile details.</p></div><Badge variant="secondary">{directoryTotal} records</Badge></div><div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" placeholder="Search any saved customer detail…" value={search} onChange={(e) => setSearch(e.target.value)}/></div></CardHeader><CardContent>
        {isLoading ? <div className="space-y-3">{[1,2,3].map((n) => <div key={n} className="h-20 animate-pulse rounded-xl bg-muted"/>)}</div> : isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive" role="alert">Customer records could not be loaded. Check your connection and sign-in, then try again.</div> : customers.length === 0 ? <div className="py-12 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Users className="h-5 w-5 text-muted-foreground"/></div><p className="font-semibold">{search ? "No matching customers" : "Your customer list starts here"}</p><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{search ? "Try a different name, phone number, date of birth or other detail." : "Add a customer to create a profile, record notes and schedule follow-ups."}</p>{!search && <Button className="mt-4" onClick={() => openForm()}><Plus className="mr-2 h-4 w-4"/>Add first customer</Button>}</div> : <div className="space-y-3">{customers.map((c) => <div key={c.id} className={"rounded-xl border p-4 transition-colors hover:border-primary/35 " + (selected?.id === c.id ? "border-primary/50 bg-primary/[0.025]" : "")}><div className="flex flex-col gap-3 sm:flex-row sm:items-start"><button className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => setSelected(c)}><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">{c.avatarUrl ? <img src={c.avatarUrl} alt="" className="h-full w-full object-cover"/> : <span className="font-semibold text-muted-foreground">{(c.firstName[0] + c.lastName[0]).toUpperCase()}</span>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{c.firstName} {c.lastName}</span><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></div>{c.company && <p className="text-sm text-muted-foreground">{c.company}</p>}{Object.entries(c.spendByCurrency ?? {}).some(([, amount]) => amount > 0) && <div className="mt-2 flex flex-wrap gap-2">{Object.entries(c.spendByCurrency ?? {}).filter(([, amount]) => amount > 0).map(([currency, amount]) => <Badge key={currency} variant="outline">{currency} {new Intl.NumberFormat(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}).format(amount)} spent</Badge>)}</div>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3"/>{c.phone}</span>}{c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3"/>{c.email}</span>}{c.profileData?.dateOfBirth && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3"/>DOB: {c.profileData.dateOfBirth}</span>}</div></div></button><div className="flex shrink-0 gap-2 print:hidden"><Button variant="outline" size="sm" onClick={() => openForm(c)}><Pencil className="mr-1.5 h-3.5 w-3.5"/>Edit</Button><Button variant="ghost" size="icon" title="Upload customer photo" aria-label={"Upload photo for " + c.firstName + " " + c.lastName} onClick={() => {photoTargetRef.current = c; setSelected(c); fileRef.current?.click();}}><Upload className="h-4 w-4"/></Button><Button variant="ghost" size="icon" title="Take customer photo" aria-label={"Take photo for " + c.firstName + " " + c.lastName} onClick={() => {photoTargetRef.current = c; setSelected(c); setPhotoCameraOpen(true);}}><Camera className="h-4 w-4"/></Button></div></div></div>)}</div>}
        {directoryTotal > 200 && <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Showing {directoryTotal === 0 ? 0 : directoryPage * 200 + 1}–{Math.min((directoryPage + 1) * 200, directoryTotal)} of {directoryTotal} customers</p><div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={directoryPage === 0 || isLoading} onClick={() => setDirectoryPage((p) => Math.max(0, p - 1))}>Previous</Button><span className="min-w-20 text-center text-xs text-muted-foreground">Page {directoryPage + 1} of {directoryPageCount}</span><Button type="button" variant="outline" size="sm" disabled={directoryPage + 1 >= directoryPageCount || isLoading} onClick={() => setDirectoryPage((p) => Math.min(directoryPageCount - 1, p + 1))}>Next</Button></div></div>}
      </CardContent></Card>
      <div className="space-y-6">
        {selected ? <Card><CardHeader><div className="flex items-start justify-between gap-2"><div><CardTitle>Customer card</CardTitle><p className="mt-1 text-xs text-muted-foreground">A quick reference for this relationship.</p></div><Button variant="ghost" size="icon" onClick={() => setSelected(null)}><X className="h-4 w-4"/></Button></div></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-3">{selected.avatarUrl ? <img src={selected.avatarUrl} alt="" className="h-14 w-14 rounded-full border object-cover"/> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-semibold">{(selected.firstName[0]+selected.lastName[0]).toUpperCase()}</div>}<div><p className="font-semibold">{selected.firstName} {selected.lastName}</p><p className="text-xs text-muted-foreground">{selected.profileData?.preferredName || selected.company || "Individual customer"}</p></div></div><div className="space-y-2 text-sm">{selected.phone && <p><span className="text-muted-foreground">Phone:</span> {selected.phone}</p>}{selected.email && <p className="break-all"><span className="text-muted-foreground">Email:</span> {selected.email}</p>}{selected.profileData?.dateOfBirth && <p><span className="text-muted-foreground">Date of birth:</span> {selected.profileData.dateOfBirth}</p>}{selected.profileData?.maritalStatus && <p><span className="text-muted-foreground">Marital status:</span> {selected.profileData.maritalStatus}</p>}{selected.profileData?.occupation && <p><span className="text-muted-foreground">Occupation:</span> {selected.profileData.occupation}</p>}{selected.city && <p><span className="text-muted-foreground">Town / city:</span> {selected.city}</p>}{selected.country && <p><span className="text-muted-foreground">Country:</span> {selected.country}</p>}{selected.profileData?.preferredContactMethod && <p><span className="text-muted-foreground">Preferred contact:</span> {selected.profileData.preferredContactMethod}</p>}{selected.profileData?.tags?.length ? <div className="flex flex-wrap gap-1">{selected.profileData.tags.map((tag) => <Badge variant="outline" key={tag}>{tag}</Badge>)}</div> : null}{selected.profileData?.preferences && <div><p className="text-xs font-semibold text-muted-foreground">Preferences</p><p className="whitespace-pre-wrap">{selected.profileData.preferences}</p></div>}{selected.profileData?.internalNotes && <div><p className="text-xs font-semibold text-muted-foreground">Internal notes</p><p className="whitespace-pre-wrap">{selected.profileData.internalNotes}</p></div>}</div><div className="flex flex-wrap gap-2 border-t pt-3 print:hidden"><Button className="flex-1" variant="outline" onClick={() => openForm(selected)}><Pencil className="mr-2 h-4 w-4"/>Edit profile</Button><Button type="button" variant="outline" onClick={() => printKairaDocument("crm-customer-print")}><Printer className="mr-2 h-4 w-4"/>Print customer card</Button>{selected.avatarUrl && <Button variant="outline" size="icon" title="Remove photo" aria-label="Remove photo" onClick={async () => {try {const updated = await removeCrmCustomerPhoto(selected.id);setSelected(updated);await refresh();}catch(e){setFormError(e instanceof Error ? e.message : "Photo removal failed.");}}}><Trash2 className="h-4 w-4"/></Button>}</div></CardContent></Card> : <Card><CardHeader><CardTitle>How to use this CRM</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p className="font-medium">1. Add the essentials</p><p className="text-muted-foreground">Name is required. Phone, email and location make it easier to contact the customer.</p><p className="font-medium">2. Add optional context</p><p className="text-muted-foreground">DOB, marital status, occupation and emergency contact are not required for ordinary retail customers. Only collect what your service genuinely needs.</p><p className="font-medium">3. Keep a useful history</p><p className="text-muted-foreground">Log conversations, customer feedback and a clear next action so the team knows what to do next.</p><p className="font-medium">4. Export when needed</p><p className="text-muted-foreground">Use Export CSV for spreadsheet work or Print / PDF to save a printable view.</p></CardContent></Card>}
        <Card><CardHeader><CardTitle>Log a customer activity</CardTitle><p className="text-sm text-muted-foreground">Record a call, visit, message, feedback or next step.</p></CardHeader><CardContent className="space-y-3"><label className="block space-y-1.5 text-sm font-medium">Find customer<Input className="mt-1" placeholder="Search name, phone, email or company…" value={activityCustomerSearch} onChange={(e) => setActivityCustomerSearch(e.target.value)}/></label><label className="block space-y-1.5 text-sm font-medium">Customer<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Choose customer</option>{activityCustomers.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.phone ? " · " + c.phone : ""}</option>)}</select><span className="block text-xs font-normal text-muted-foreground">Search independently of the directory page so older customers can be selected too.</span></label><Input placeholder="Activity title (e.g. Delivery feedback)" value={title} onChange={(e) => setTitle(e.target.value)}/><Textarea placeholder="What happened? What did the customer say? What should happen next?" value={note} onChange={(e) => setNote(e.target.value)} rows={4}/><label className="block space-y-1.5 text-sm font-medium">Follow-up date (optional)<Input type="datetime-local" value={nextActionAt} onChange={(e) => setNextActionAt(e.target.value)}/></label>{activityError && <p className="text-sm text-destructive" role="alert">{activityError}</p>}<Button className="w-full" onClick={addNote} disabled={activitySaving || !customerId || !title.trim() || !note.trim()}><Plus className="mr-2 h-4 w-4"/>{activitySaving ? "Saving activity…" : "Save activity"}</Button></CardContent></Card>
      </div>
    </div>
    <Card><CardHeader><CardTitle>Recent interactions</CardTitle><p className="text-sm text-muted-foreground">A timeline of notes and follow-ups saved by your team.</p></CardHeader><CardContent className="space-y-3">{(overview?.interactions ?? []).map((i) => <div key={i.id} className="flex items-start justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><MessageSquare className="h-4 w-4 text-primary"/><span className="font-semibold text-sm">{i.title}</span>{i.completedAt ? <Badge variant="secondary">Done</Badge> : i.nextActionAt ? <Badge variant="outline">Follow-up</Badge> : null}</div><p className="mt-1 text-xs text-muted-foreground">{i.customerName} · {i.userName}</p><p className="mt-2 whitespace-pre-wrap text-sm">{i.note}</p><p className="mt-2 text-xs text-muted-foreground">{formatDate(new Date(i.createdAt),"MMM d, yyyy HH:mm")}</p></div>{!i.completedAt && <Button size="icon" variant="ghost" title="Mark follow-up complete" onClick={async () => {try {await completeCrmInteraction(i.id);await qc.invalidateQueries({queryKey:["crm-overview"]});}catch(e){setActivityError(e instanceof Error ? e.message : "Could not complete this follow-up.");}}}><CheckCircle2 className="h-4 w-4"/></Button>}</div>)}{!overviewLoading && !overview?.interactions?.length && <p className="py-6 text-center text-sm text-muted-foreground">No activities recorded yet. Add a note or follow-up above.</p>}{overviewError && <p className="text-sm text-destructive" role="alert">The activity timeline could not be loaded.</p>}</CardContent></Card>
    <input ref={fileRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={async (e) => {const file=e.target.files?.[0];e.target.value="";await saveQuickPhoto(file);}}/>
    <CameraCaptureDialog open={photoCameraOpen} onOpenChange={setPhotoCameraOpen} onCapture={saveQuickPhoto} title="Take customer photo" description="This opens the live device camera. Captured images are saved to the selected customer profile." />
    <PrintableBusinessDocument id="crm-directory-print" title="Customer directory" documentNumber={String(customers.length) + " customer records"} issuedAt={new Date().toLocaleString()}>
      <table>
        <thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Company</th><th>Status</th></tr></thead>
        <tbody>{printCustomers.map((customer) => <tr key={customer.id}><td>{customer.firstName} {customer.lastName}</td><td>{customer.phone || "—"}</td><td>{customer.email || "—"}</td><td>{customer.company || "—"}</td><td>{customer.status}</td></tr>)}</tbody>
      </table>
    </PrintableBusinessDocument>
    {selected && <PrintableBusinessDocument id="crm-customer-print" title="Customer profile" documentNumber={selected.id} issuedAt={new Date().toLocaleString()} status={selected.status.toUpperCase()}>
      <div className="flex items-start gap-4">
        {selected.avatarUrl && <img src={selected.avatarUrl} alt="" className="h-24 w-24 rounded-lg object-cover" />}
        <div><h3>{selected.firstName} {selected.lastName}</h3><p>{selected.profileData?.preferredName || selected.company || "Individual customer"}</p></div>
      </div>
      <table className="mt-4"><tbody>
        <tr><th>Phone</th><td>{selected.phone || "—"}</td><th>Email</th><td>{selected.email || "—"}</td></tr>
        <tr><th>City</th><td>{selected.city || "—"}</td><th>Country</th><td>{selected.country || "—"}</td></tr>
        {selected.profileData?.dateOfBirth && <tr><th>Date of birth</th><td>{selected.profileData.dateOfBirth}</td><th>Marital status</th><td>{selected.profileData.maritalStatus || "—"}</td></tr>}
        {selected.profileData?.occupation && <tr><th>Occupation</th><td colSpan={3}>{selected.profileData.occupation}</td></tr>}
        {selected.profileData?.preferences && <tr><th>Preferences</th><td colSpan={3}>{selected.profileData.preferences}</td></tr>}
        {selected.profileData?.internalNotes && <tr><th>Internal notes</th><td colSpan={3}>{selected.profileData.internalNotes}</td></tr>}
      </tbody></table>
    </PrintableBusinessDocument>}
  </div></PageTransition>;
}
