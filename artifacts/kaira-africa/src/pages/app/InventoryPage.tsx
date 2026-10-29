import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowDown, ArrowUp, AlertTriangle, ImagePlus, Package, Boxes, CircleHelp, X, LoaderCircle, Camera, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/common/PageTransition";
import { getInventoryProducts, createInventoryProduct, adjustInventory, uploadInventoryProductImage } from "@/lib/platform-api";
import type { InventoryProduct } from "@/lib/platform-api";

const MAX_IMAGE_BYTES = 200 * 1024;
const INVENTORY_CATEGORIES = ["Food & groceries", "Beverages", "Clothing & fashion", "Electronics", "Technology", "Marketing materials", "Office supplies", "Raw materials", "Health & beauty", "Household goods", "Agriculture", "Construction", "Automotive", "Digital products", "Tools & equipment", "Other"];
const INVENTORY_UNITS = ["piece", "pack", "box", "carton", "bag", "bottle", "can", "pair", "dozen", "kg", "g", "litre", "ml", "metre", "roll", "service", "hour", "Other"];
type Currency = "GMD" | "NGN" | "USD";
const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "GMD", label: "GMD — Gambian dalasi (D)" },
  { value: "NGN", label: "NGN — Nigerian naira (₦)" },
  { value: "USD", label: "USD — US dollar ($)" },
];
const money = (amount: number, currency: Currency) => new Intl.NumberFormat("en", {
  style: "currency", currency, maximumFractionDigits: 2,
}).format(amount);

async function compressProductPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file such as JPG, PNG or WebP.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Choose a photo smaller than 12 MB before compression.");
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      // Register handlers before starting the load to avoid a fast-cache race.
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("This image could not be opened. Try another photo."));
      image.src = source;
    });
    const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = 0.78;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_IMAGE_BYTES) break;
      quality -= 0.08;
      if (quality < 0.22 && (canvas.width > 420 || canvas.height > 420)) {
        canvas.width = Math.max(1, Math.round(canvas.width * 0.78));
        canvas.height = Math.max(1, Math.round(canvas.height * 0.78));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        quality = 0.55;
      }
    }
    if (!blob || blob.size > MAX_IMAGE_BYTES) throw new Error("This photo is still larger than 200 KB after compression. Choose a simpler or smaller photo.");
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not prepare this photo."));
      reader.onerror = () => reject(new Error("Could not read this photo."));
      reader.readAsDataURL(blob!);
    });
  } finally {
    URL.revokeObjectURL(source);
  }
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ["inventory-products"], queryFn: getInventoryProducts });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "", unit: "piece", quantity: 0, reorderLevel: 5, unitCost: 0, salePrice: 0, currency: "GMD" as Currency });
  const [customCategory, setCustomCategory] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [pendingPhotoProductId, setPendingPhotoProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const low = data.filter((p) => p.quantity <= p.reorderLevel).length;
  const currencyTotals = useMemo(() => data.reduce<Record<string, number>>((totals, product) => {
    const currency = (product.currency || "GMD") as Currency;
    totals[currency] = (totals[currency] || 0) + product.quantity * product.unitCost;
    return totals;
  }, {}), [data]);
  const resetForm = () => {
    setForm({ name: "", sku: "", category: "", unit: "piece", quantity: 0, reorderLevel: 5, unitCost: 0, salePrice: 0, currency: "GMD" });
    setCustomCategory("");
    setPhotoFile(null); setPhotoPreview(""); setPendingPhotoProductId(null); setFormError(null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };
  const choosePhoto = async (file?: File) => {
    setFormError(null); setPhotoFile(null); setPhotoPreview("");
    if (!file) return;
    try {
      const preview = await compressProductPhoto(file);
      setPhotoFile(file); setPhotoPreview(preview);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not prepare this image.");
    }
  };
  const retryPhotoUpload = async () => {
    if (!pendingPhotoProductId) return;
    if (!photoPreview) {
      setFormError("Choose a product photo before retrying the upload.");
      return;
    }
    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      await uploadInventoryProductImage(pendingPhotoProductId, photoPreview);
      resetForm();
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["inventory-products"] });
      setNotice("Product photo uploaded successfully.");
    } catch (cause) {
      setFormError(cause instanceof Error
        ? `The product is already saved, but its photo upload failed again: ${cause.message}`
        : "The product is already saved, but its photo upload failed again. Your selected photo is still available to retry.");
    } finally {
      setSaving(false);
    }
  };
  const add = async () => {
    if (pendingPhotoProductId) {
      await retryPhotoUpload();
      return;
    }
    setSaving(true); setFormError(null); setNotice(null);
    try {
      const product = await createInventoryProduct({ ...form, category: form.category === "Other" ? customCategory.trim() : form.category });
      if (photoPreview) {
        try {
          await uploadInventoryProductImage(product.id, photoPreview);
        } catch (cause) {
          // Keep the selected photo and the form open. The product already exists,
          // so the main action switches to a photo-only retry instead of creating a duplicate.
          setPendingPhotoProductId(product.id);
          setFormError(cause instanceof Error
            ? `Product saved, but its photo could not be uploaded: ${cause.message}`
            : "Product saved, but the photo upload failed. Your selected photo is kept for retry.");
          setNotice("Your product details are saved. Retry the photo upload below; do not create the product again.");
          await qc.invalidateQueries({ queryKey: ["inventory-products"] });
          return;
        }
      }
      resetForm(); setOpen(false);
      await qc.invalidateQueries({ queryKey: ["inventory-products"] });
      setNotice("Product saved. Opening stock has been recorded in your inventory.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "We couldn't save this product. Check your details and try again.");
    } finally {
      setSaving(false);
    }
  };
  const adjust = async (product: InventoryProduct, delta: number) => {
    setAdjustingId(product.id); setFormError(null); setNotice(null);
    try {
      await adjustInventory(product.id, { quantityDelta: delta, type: delta > 0 ? "purchase" : "sale", reason: delta > 0 ? "Stock received" : "Stock sold/removed" });
      await qc.invalidateQueries({ queryKey: ["inventory-products"] });
      setNotice(delta > 0 ? `One ${product.unit} added to ${product.name}.` : `One ${product.unit} removed from ${product.name}.`);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Stock could not be updated.");
    } finally {
      setAdjustingId(null);
    }
  };
  const productCurrency = (p: InventoryProduct) => (p.currency || "GMD") as Currency;

  return <PageTransition><div className="mx-auto max-w-7xl space-y-5 pb-8 sm:space-y-6">
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Package className="h-6 w-6" /></div><div className="min-w-0"><h1 className="font-display text-2xl font-bold sm:text-3xl">Inventory & stock book</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Keep a clear record of the goods your business owns, what each item costs, what you sell it for, and when stock is running low.</p></div></div>
        <Button className="h-11 w-full shrink-0 gap-2 sm:w-auto" onClick={() => { setOpen((value) => !value); setFormError(null); }} title="Open the form to add a product"><Plus className="h-4 w-4" />{open ? "Close form" : "Add product"}</Button>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <Card><CardContent className="flex items-center gap-3 p-4 sm:p-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Boxes className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Products tracked</p><p className="text-2xl font-bold">{data.length}</p><p className="text-xs text-muted-foreground">Different items in your stock book</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4 sm:p-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600"><Package className="h-5 w-5" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">Stock value at cost</p>{Object.keys(currencyTotals).length ? Object.entries(currencyTotals).map(([currency, amount]) => <p key={currency} className="text-lg font-bold">{money(amount, currency as Currency)}</p>) : <p className="text-2xl font-bold">{money(0, "GMD")}</p>}<p className="text-xs text-muted-foreground">Quantity × buying cost, grouped by currency</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4 sm:p-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Low-stock items</p><p className="text-2xl font-bold">{low}</p><p className="text-xs text-muted-foreground">Items at or below their reorder level</p></div></CardContent></Card>
    </div>

    <Card className="border-primary/15 bg-primary/[0.025]"><CardContent className="flex items-start gap-3 p-4 sm:p-5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CircleHelp className="h-4 w-4" /></div><div className="space-y-1"><h2 className="text-sm font-semibold">A simple stock book — no accounting jargon required</h2><p className="text-sm leading-6 text-muted-foreground"><strong>SKU</strong> means “Stock Keeping Unit”: a short unique code you choose to identify an item, for example <code>RICE-25KG</code> or <code>SHOE-001</code>. <strong>Buying cost</strong> is what one item costs you. <strong>Selling price</strong> is what a customer pays for one item. <strong>Reorder level</strong> is the quantity at which you should consider buying more.</p></div></CardContent></Card>

    {notice && <div role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">{notice}</div>}
    {formError && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{formError}</div>}
    {isError && <Card><CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-destructive">Inventory data could not be loaded. Your saved products have not been changed.</p><Button variant="outline" onClick={() => void refetch()}>Try again</Button></CardContent></Card>}

    {open && <Card className="overflow-hidden"><CardHeader className="border-b bg-muted/30"><CardTitle className="text-lg">Add a product to your stock book</CardTitle><p className="text-sm leading-5 text-muted-foreground">Enter what you know. You can use a simple name and code, then update quantities as goods arrive or sell.</p></CardHeader><CardContent className="space-y-5 p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1.5 text-sm font-medium">Product name <span className="text-destructive">*</span><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 25 kg bag of rice" autoComplete="off" maxLength={160} required /><span className="block text-xs font-normal text-muted-foreground">Use the name your staff and customers recognise.</span></label>
        <label className="space-y-1.5 text-sm font-medium">Item code (SKU) <span className="text-destructive">*</span><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase().replace(/[^A-Z0-9._-]/g, "").slice(0,80) })} placeholder="e.g. RICE-25KG" autoComplete="off" maxLength={80} required /><span className="block text-xs font-normal text-muted-foreground">Your own short, unique code. No two items in this business can share a code.</span></label>
        <label className="space-y-1.5 text-sm font-medium">Category (optional)<select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category === "Other" ? "Other" : form.category} onChange={(e) => { setForm({ ...form, category: e.target.value }); if (e.target.value !== "Other") setCustomCategory(""); }}><option value="">Choose a category</option>{INVENTORY_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>{form.category === "Other" && <Input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Type a custom category (optional)" maxLength={80} aria-label="Custom inventory category" /> }<span className="block text-xs font-normal text-muted-foreground">Choose a category or enter your own when you select Other.</span></label>
        <label className="space-y-1.5 text-sm font-medium">Unit name<select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={INVENTORY_UNITS.includes(form.unit) ? form.unit : "Other"} onChange={(e) => setForm({ ...form, unit: e.target.value === "Other" ? "" : e.target.value })} required><option value="" disabled>Choose a unit</option>{INVENTORY_UNITS.map((unit) => <option key={unit} value={unit}>{unit === "Other" ? "Other (type your own)" : unit}</option>)}</select>{(!form.unit || !INVENTORY_UNITS.includes(form.unit)) && <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Enter unit name" maxLength={30} required aria-label="Custom unit name" />}<span className="block text-xs font-normal text-muted-foreground">Choose a common unit or enter a custom one.</span></label>
        <label className="space-y-1.5 text-sm font-medium">Opening quantity<Input type="number" min={0} step={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(0, Number(e.target.value)) })} required /><span className="block text-xs font-normal text-muted-foreground">How many you have right now.</span></label>
        <label className="space-y-1.5 text-sm font-medium">Alert me when stock reaches<Input type="number" min={0} step={1} value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: Math.max(0, Number(e.target.value)) })} required /><span className="block text-xs font-normal text-muted-foreground">We flag the item when stock is at or below this number.</span></label>
        <label className="space-y-1.5 text-sm font-medium">Currency for this item<select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>{CURRENCIES.map((currency) => <option key={currency.value} value={currency.value}>{currency.label}</option>)}</select><span className="block text-xs font-normal text-muted-foreground">Prices and stock value use this currency; totals are kept separate.</span></label>
        <label className="space-y-1.5 text-sm font-medium">Buying cost per unit<Input type="number" min={0} step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: Math.max(0, Number(e.target.value)) })} required /><span className="block text-xs font-normal text-muted-foreground">What one unit costs your business.</span></label>
        <label className="space-y-1.5 text-sm font-medium">Selling price per unit<Input type="number" min={0} step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Math.max(0, Number(e.target.value)) })} required /><span className="block text-xs font-normal text-muted-foreground">The normal price you charge a customer.</span></label>
      </div>
      <div className="rounded-xl border border-dashed p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {photoPreview ? <img src={photoPreview} alt="Compressed product preview" className="h-24 w-24 rounded-lg border object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted text-muted-foreground"><ImagePlus className="h-7 w-7" /></div>}
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Product photo (optional)</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a photo from your phone or computer. Kaira automatically resizes it to a maximum of 200 KB (JPEG) to save storage and mobile data. A photo is never required to save a product.</p>{photoFile && <p className="mt-1 text-xs text-primary">Photo prepared for upload: {photoFile.name}</p>}</div>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => cameraRef.current?.click()} className="gap-2"><Camera className="h-4 w-4" />Take photo</Button><Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2"><Upload className="h-4 w-4" />Upload from device</Button>{photoPreview && <Button type="button" variant="ghost" onClick={() => { setPhotoFile(null); setPhotoPreview(""); if (fileRef.current) fileRef.current.value = ""; if (cameraRef.current) cameraRef.current.value = ""; }} disabled={Boolean(pendingPhotoProductId)} aria-label="Remove selected photo"><X className="h-4 w-4" />Remove</Button>}</div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { void choosePhoto(e.target.files?.[0]); e.currentTarget.value = ""; }} />
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => { void choosePhoto(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => { if (pendingPhotoProductId) setOpen(false); else { resetForm(); setOpen(false); } }}>{pendingPhotoProductId ? "Close for now" : "Cancel"}</Button><Button type="button" disabled={saving || (!pendingPhotoProductId && (!form.name.trim() || !form.sku.trim() || !form.unit.trim())) || (Boolean(pendingPhotoProductId) && !photoPreview)} onClick={() => void add()} className="gap-2">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{saving ? (pendingPhotoProductId ? "Retrying photo…" : "Saving product…") : pendingPhotoProductId ? "Retry photo upload" : "Save product"}</Button></div>
    </CardContent></Card>}

    <Card><CardHeader className="pb-3"><CardTitle className="text-lg">Your stock ledger</CardTitle><p className="text-sm text-muted-foreground">Each row is an item you keep in stock. Use the plus button to record stock received and the minus button to correct/remove stock. To record a real sale and revenue, use Daily Sales & Expense Book and select a GMD-priced inventory product.</p></CardHeader><CardContent className="p-0 sm:px-6 sm:pb-5">
      {isLoading ? <div className="m-5 h-48 animate-pulse rounded-xl bg-muted" /> : data.length === 0 ? <div className="px-5 py-10 text-center sm:py-14"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Package className="h-7 w-7" /></div><h3 className="mt-4 font-semibold">Your stock book is ready</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Add your first product to start tracking how many you have, what it costs, and when it is time to restock.</p><Button className="mt-4 gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add your first product</Button></div> : <><div className="space-y-3 p-4 sm:hidden">{data.map((p) => <div key={p.id} className="rounded-xl border p-3"><div className="flex items-start gap-3">{p.imageUrl ? <img src={p.imageUrl} alt={p.name} loading="lazy" className="h-14 w-14 shrink-0 rounded-lg border object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Package className="h-5 w-5" /></div>}<div className="min-w-0 flex-1"><p className="break-words font-semibold">{p.name}</p><p className="mt-0.5 break-all text-xs text-muted-foreground">Item code: {p.sku}</p><p className="mt-1 text-xs text-muted-foreground">{p.category || "No category"} · {money(p.salePrice, productCurrency(p))} selling price</p></div></div><div className="mt-3 flex items-center justify-between gap-2"><Badge variant="outline" className={p.quantity <= p.reorderLevel ? "border-amber-300 text-amber-700" : ""}>{p.quantity} {p.unit}{p.quantity <= p.reorderLevel ? " · Restock soon" : ""}</Badge><div className="flex gap-2"><Button size="icon" variant="outline" title={`Receive one ${p.unit}`} aria-label={`Receive one ${p.unit} of ${p.name}`} disabled={adjustingId === p.id} onClick={() => void adjust(p, 1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="outline" title={`Remove one ${p.unit} from stock without recording a sale`} aria-label={`Remove one ${p.unit} of ${p.name} from stock; this does not record revenue`} disabled={!p.quantity || adjustingId === p.id} onClick={() => void adjust(p, -1)}><ArrowDown className="h-4 w-4" /></Button></div></div></div>)}</div><div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="py-3 pr-3 font-medium">Product / item code</th><th className="py-3 px-3 font-medium">In stock</th><th className="py-3 px-3 font-medium">Buying cost</th><th className="py-3 px-3 font-medium">Selling price</th><th className="py-3 px-3 font-medium">Stock status</th><th className="py-3 pl-3 font-medium">Record movement</th></tr></thead><tbody>{data.map((p) => <tr key={p.id} className="border-b last:border-0"><td className="py-3 pr-3"><div className="flex items-center gap-3">{p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-11 w-11 rounded-lg border object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Package className="h-4 w-4" /></div>}<div className="min-w-0"><p className="font-semibold">{p.name}</p><p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{p.sku} · {p.category || "No category"}</p></div></div></td><td className="px-3 py-3 font-semibold">{p.quantity} {p.unit}</td><td className="px-3 py-3">{money(p.unitCost, productCurrency(p))}</td><td className="px-3 py-3">{money(p.salePrice, productCurrency(p))}</td><td className="px-3 py-3"><Badge variant="outline" className={p.quantity <= p.reorderLevel ? "border-amber-300 text-amber-700" : "border-emerald-300 text-emerald-700"}>{p.quantity <= p.reorderLevel ? "Restock soon" : "In stock"}</Badge><p className="mt-1 text-xs text-muted-foreground">Alert at {p.reorderLevel}</p></td><td className="pl-3 py-3"><div className="flex gap-2"><Button size="icon" variant="outline" title={`Receive one ${p.unit}`} aria-label={`Receive one ${p.unit} of ${p.name}`} disabled={adjustingId === p.id} onClick={() => void adjust(p, 1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="outline" title={`Remove one ${p.unit} from stock without recording a sale`} aria-label={`Remove one ${p.unit} of ${p.name} from stock; this does not record revenue`} disabled={!p.quantity || adjustingId === p.id} onClick={() => void adjust(p, -1)}><ArrowDown className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div></>}
    </CardContent></Card>
    <p className="text-xs leading-5 text-muted-foreground">Tip: use the same item code every time you refer to a product. Stock changes are saved to your business account, not just this screen. Currency totals are shown separately and are not converted using guessed exchange rates.</p>
  </div></PageTransition>;
}
