import { KairaLogo } from '@/components/common/KairaLogo';
import { GambiaFlag } from '@/components/common/GambiaFlag';
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Building2, Calendar, CheckCircle2, Edit2, Shield, LogOut, CircleHelp, Trash2, Camera, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { PageTransition } from '@/components/common/PageTransition';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PinSettingsCard } from '@/components/common/PinSettingsCard';
import { useGetMe, useGetMyBusiness, useUpdateProfile, useUpdateBusiness, useLogoutAll, ApiError } from '@workspace/api-client-react';
import { clearToken } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { uploadProfileAvatar, removeProfileAvatar } from '@/lib/platform-api';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
});
type ProfileForm = z.infer<typeof profileSchema>;

function readProfileImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this image.'));
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { data: user, isLoading: userLoading, isError: userIsError, refetch: refetchUser } = useGetMe();
  const { data: business } = useGetMyBusiness();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarCameraInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [businessSaved, setBusinessSaved] = useState(false);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [businessDraft, setBusinessDraft] = useState({
    name: '', type: '', industry: '', country: 'The Gambia', city: '',
    phone: '', email: '', website: '', address: '', description: '', teamSize: '',
  });

  useEffect(() => {
    if (!business) return;
    setBusinessDraft({
      name: business.name || '',
      type: business.type || '',
      industry: business.industry || '',
      country: business.country || 'The Gambia',
      city: business.city || '',
      phone: business.phone || '',
      email: business.email || '',
      website: business.website || '',
      address: business.address || '',
      description: business.description || '',
      teamSize: business.teamSize || '',
    });
  }, [business?.id, business?.name, business?.type, business?.industry, business?.country, business?.city,
      business?.phone, business?.email, business?.website, business?.address, business?.description, business?.teamSize]);
  const [formError, setFormError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    },
  });

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        setSaved(true);
        setFormError(null);
        setTimeout(() => setSaved(false), 2500);
      },
      onError: (error) => setFormError(error.message),
    },
  });

  const saveBusiness = useUpdateBusiness({
    mutation: {
      onSuccess: async () => {
        setBusinessSaved(true);
        setBusinessError(null);
        await queryClient.invalidateQueries();
        window.setTimeout(() => setBusinessSaved(false), 2500);
      },
      onError: (error) => setBusinessError(error.message),
    },
  });

  const updateBusinessField = (field: keyof typeof businessDraft, value: string) => {
    setBusinessDraft((previous) => ({ ...previous, [field]: value }));
    setBusinessSaved(false);
  };

  const logoutAll = useLogoutAll({
    mutation: {
      onSettled: () => {
        clearToken();
        setLocation('/login');
      },
    },
  });

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    setAvatarError(null); setAvatarMessage(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setAvatarError('Choose a JPEG, PNG or WebP image.'); return; }
    if (file.size > 2 * 1024 * 1024) { setAvatarError('Choose an image that is 2 MB or smaller.'); return; }
    setAvatarBusy(true);
    try { await uploadProfileAvatar(await readProfileImage(file)); await refetchUser(); setAvatarMessage('Profile photo updated.'); }
    catch (error) { setAvatarError(error instanceof Error ? error.message : 'Profile photo upload failed.'); }
    finally { setAvatarBusy(false); }
  };

  const onSave = (data: ProfileForm) => {
    setFormError(null);
    updateProfile.mutate({ data });
  };

  if (userLoading) {
    return (
      <PageTransition>
        <div role="status" className="flex min-h-[45vh] flex-col items-center justify-center gap-4 text-center">
          <LoadingSpinner size={32} />
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Loading your profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">Securely fetching your account and business details…</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (userIsError || !user) {
    return (
      <PageTransition>
        <div className="mx-auto flex min-h-[45vh] max-w-xl flex-col items-center justify-center text-center">
          <Card className="w-full">
            <CardContent className="p-6 sm:p-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <User className="h-6 w-6" />
              </div>
              <h1 className="font-display text-xl font-bold text-foreground">We couldn't load your profile</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your information has not been removed. Check your connection and try again, or sign in again if your session has expired.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <Button type="button" onClick={() => void refetchUser()} className="gap-2">
                  Try again
                </Button>
                <Button type="button" variant="outline" onClick={() => setLocation('/login')}>
                  Return to sign in
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">
            My Profile
          </h1>
          <p className="text-muted-foreground text-sm">Manage your account details and security.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Profile card ── */}
          <Card className="lg:col-span-1">
            <CardContent className="p-6 flex flex-col items-center text-center">
              {/* Profile photo: upload is handled by the authenticated API and stored privately. */}
              <div className="relative mb-2">
                <Avatar className="h-24 w-24 border-2 border-background shadow-lg ring-1 ring-border">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.firstName + ' ' + user.lastName} className="object-cover" />}
                  <AvatarFallback className="overflow-hidden bg-indigo-100">
                    <svg viewBox="0 0 120 120" role="img" aria-label="Default 3D profile avatar" className="h-full w-full">
                      <defs>
                        <linearGradient id="avatar-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#667eea"/><stop offset="55%" stopColor="#8065ca"/><stop offset="100%" stopColor="#e2a3db"/></linearGradient>
                        <radialGradient id="avatar-skin" cx="30%" cy="25%" r="80%"><stop offset="0%" stopColor="#ffe2bf"/><stop offset="65%" stopColor="#eeb68b"/><stop offset="100%" stopColor="#c98262"/></radialGradient>
                        <linearGradient id="avatar-hair" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#483b36"/><stop offset="55%" stopColor="#292b3c"/><stop offset="100%" stopColor="#171a2b"/></linearGradient>
                        <linearGradient id="avatar-coat" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fdfdff"/><stop offset="45%" stopColor="#d9e0ff"/><stop offset="100%" stopColor="#8c9be0"/></linearGradient>
                        <linearGradient id="avatar-shirt" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0%" stopColor="#fff"/><stop offset="100%" stopColor="#c6d2f6"/></linearGradient>
                        <filter id="avatar-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#27234c" floodOpacity="0.24"/></filter>
                      </defs>
                      <circle cx="60" cy="60" r="60" fill="url(#avatar-sky)"/>
                      <circle cx="94" cy="23" r="14" fill="#fff" fillOpacity=".16"/>
                      <path d="M9 120c3-23 15-34 37-40l14 12 14-12c22 6 34 17 37 40Z" fill="url(#avatar-coat)" filter="url(#avatar-shadow)"/>
                      <path d="M44 78 60 94 76 78 71 70H49Z" fill="url(#avatar-skin)"/>
                      <path d="M47 82 60 96 73 82 80 120H40Z" fill="url(#avatar-shirt)"/>
                      <path d="M20 120c2-17 11-30 25-38l15 14 15-14c14 8 23 21 25 38Z" fill="url(#avatar-coat)"/>
                      <path d="m45 82 15 14-9 11-13-24Zm30 0L60 96l9 11 13-24Z" fill="#fff" fillOpacity=".94"/>
                      <ellipse cx="60" cy="49" rx="23" ry="29" fill="url(#avatar-skin)" filter="url(#avatar-shadow)"/>
                      <path d="M36 48c-3-22 7-35 23-36 16-1 28 11 26 31l-5 11-4-19c-10 2-21-1-29-7-1 8-5 13-10 20Z" fill="url(#avatar-hair)"/>
                      <path d="M42 45c2-5 6-7 10-5" fill="none" stroke="#78513f" strokeWidth="2.1" strokeLinecap="round"/>
                      <path d="M66 40c4-3 9-2 12 1" fill="none" stroke="#78513f" strokeWidth="2.1" strokeLinecap="round"/>
                      <ellipse cx="50" cy="48" rx="2.1" ry="2.7" fill="#292333"/>
                      <ellipse cx="72" cy="48" rx="2.1" ry="2.7" fill="#292333"/>
                      <circle cx="50.6" cy="47.2" r=".7" fill="#fff"/>
                      <circle cx="72.6" cy="47.2" r=".7" fill="#fff"/>
                      <path d="M60 49 57 59q3 3 7 0" fill="none" stroke="#b8755a" strokeWidth="1.7" strokeLinecap="round"/>
                      <path d="M52 64q8 7 16 0" fill="none" stroke="#9b4e50" strokeWidth="2.1" strokeLinecap="round"/>
                      <ellipse cx="43" cy="57" rx="5" ry="3" fill="#e99b91" fillOpacity=".34"/>
                      <ellipse cx="77" cy="57" rx="5" ry="3" fill="#e99b91" fillOpacity=".34"/>
                      <path d="M38 36c3-9 11-17 22-17 11 0 19 7 22 16-9-4-15-10-19-14-7 8-15 12-25 15Z" fill="#605047" fillOpacity=".42"/>
                      <path d="M16 21c7-8 15-12 24-14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeOpacity=".36"/>
                    </svg>
                  </AvatarFallback>
                </Avatar>
                <button type="button" aria-label="Upload profile photo" title="Upload from device" disabled={avatarBusy} onClick={() => avatarInputRef.current?.click()} className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50">
                  <Upload className="h-3.5 w-3.5" />
                </button>
                <button type="button" aria-label="Take profile photo" title="Take a photo with your camera" disabled={avatarBusy} onClick={() => avatarCameraInputRef.current?.click()} className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-secondary text-secondary-foreground shadow-md transition-colors hover:bg-secondary/80 disabled:opacity-50">
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input ref={avatarInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void handleAvatarFile(file); }} />
                <input ref={avatarCameraInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" capture="user" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void handleAvatarFile(file); }} />
              </div>
              <p className="mb-2 text-xs text-muted-foreground">JPEG, PNG or WebP · recommended 256×256 px or larger · maximum 2 MB</p>
              {avatarBusy && <p role="status" className="mb-2 text-xs text-muted-foreground">Uploading photo securely…</p>}
              {avatarMessage && <p role="status" className="mb-2 text-xs text-primary">{avatarMessage}</p>}
              {avatarError && <p role="alert" className="mb-2 max-w-[220px] text-xs text-destructive">{avatarError}</p>}
              {user.avatarUrl && <Button type="button" variant="ghost" size="sm" disabled={avatarBusy} onClick={async () => {
                setAvatarError(null); setAvatarMessage(null); setAvatarBusy(true);
                try { await removeProfileAvatar(); await refetchUser(); setAvatarMessage('Photo removed. Your default avatar is now shown.'); }
                catch (error) { setAvatarError(error instanceof Error ? error.message : 'Could not remove the photo.'); }
                finally { setAvatarBusy(false); }
              }} className="mb-2 h-7 text-xs text-muted-foreground"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove photo</Button>}

              <h2 className="font-display text-xl font-bold text-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <div className="flex items-center gap-2 mt-1 mb-3">
                <Badge className="bg-primary/10 text-primary border-0 text-xs">
                  {user.role}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
              </div>

              <Separator className="my-4 w-full" />

              <div className="w-full space-y-3 text-left">
                {[
                  { icon: Mail, label: 'Email', value: user.email },
                  { icon: Phone, label: 'Phone', value: user.phone || '—' },
                  { icon: Building2, label: 'Business', value: business?.name || '—' },
                  { icon: Calendar, label: 'Member since', value: formatDate(user.createdAt, 'MMM yyyy') },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-foreground truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Edit forms ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Personal info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="profile-email" className="text-sm font-medium leading-none">Email</label>
                      <Input id="profile-email" value={user.email ?? ''} disabled className="text-muted-foreground bg-muted" />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="profile-phone" className="text-sm font-medium leading-none">Phone</label>
                      <Input id="profile-phone" value={user.phone ?? ''} disabled className="text-muted-foreground bg-muted" />
                      <p className="text-xs text-muted-foreground mt-1">Changing your phone number requires re-verifying it — not available here yet.</p>
                    </div>
                    {formError && (
                      <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><KairaLogo width={26} className="shrink-0 rounded bg-white p-0.5" /><span>{formError}</span></div>
                    )}
                    <div className="flex items-center gap-3 pt-2">
                      <Button type="submit" size="sm" className="gap-2" disabled={updateProfile.isPending}>
                        {updateProfile.isPending ? 'Saving…' : saved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Business information — backed by PATCH /businesses/me */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Business Information
                </CardTitle>
                <p className="text-sm text-muted-foreground">Update the business details saved during onboarding. These details are used across your workspace.</p>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setBusinessError(null);
                    saveBusiness.mutate({ data: businessDraft });
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="space-y-1.5 text-sm font-medium">
                      Business name
                      <Input required minLength={2} value={businessDraft.name} onChange={(e) => updateBusinessField('name', e.target.value)} />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      Business type
                      <Input value={businessDraft.type} onChange={(e) => updateBusinessField('type', e.target.value)} placeholder="Sole Proprietor, Partnership…" />
                      <span className="block text-xs font-normal text-muted-foreground">For example, a sole proprietor is one person who owns and runs the business.</span>
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      Industry / work
                      <Input value={businessDraft.industry} onChange={(e) => updateBusinessField('industry', e.target.value)} placeholder="Retail, food, transport…" />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      Country
                      <div className="relative">
                        <Input value={businessDraft.country} onChange={(e) => updateBusinessField('country', e.target.value)} />
                        {businessDraft.country === 'The Gambia' && <GambiaFlag width={28} height={20} className="absolute right-3 top-1/2 -translate-y-1/2" />}
                      </div>
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      Town / community
                      <Input value={businessDraft.city} onChange={(e) => updateBusinessField('city', e.target.value)} />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      Business phone
                      <Input value={businessDraft.phone} onChange={(e) => updateBusinessField('phone', e.target.value)} placeholder="+220…" />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      Business email
                      <Input type="email" value={businessDraft.email} onChange={(e) => updateBusinessField('email', e.target.value)} placeholder="name@yourbusiness.gm" />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      Website
                      <Input value={businessDraft.website} onChange={(e) => updateBusinessField('website', e.target.value)} placeholder="https://…" />
                    </label>
                  </div>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Physical address
                    <Input value={businessDraft.address} onChange={(e) => updateBusinessField('address', e.target.value)} />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Business description
                    <Textarea rows={3} value={businessDraft.description} onChange={(e) => updateBusinessField('description', e.target.value)} placeholder="What does your business sell or provide?" />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Team size
                    <Input value={businessDraft.teamSize} onChange={(e) => updateBusinessField('teamSize', e.target.value)} placeholder="e.g. Owner only, 1–5 people" />
                  </label>
                  {businessError && (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                      <KairaLogo width={26} className="shrink-0 rounded bg-white p-0.5" />
                      <span>{businessError}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                  {user && user.role !== "owner" && (
                    <p className="text-xs text-muted-foreground" role="status">Business details can only be changed by the business owner account. Ask the owner to update official contact and registration details.</p>
                  )}
                    <Button type="submit" size="sm" disabled={saveBusiness.isPending || !business || user?.role !== "owner"}>
                      {saveBusiness.isPending ? 'Saving business…' : businessSaved ? <><CheckCircle2 className="h-4 w-4 mr-1" /> Saved!</> : 'Save Business Details'}
                    </Button>
                    {businessSaved && <span className="text-xs text-primary">Business details updated.</span>}
                  </div>
                </form>
              </CardContent>
            </Card>

            <PinSettingsCard />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CircleHelp className="h-4 w-4 text-primary" />
                  Help & frequently asked questions
                </CardTitle>
                <p className="text-sm leading-5 text-muted-foreground">Short guides to help you use Kaira confidently. Tap a question to read the answer.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <details className="group rounded-lg border p-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold">How do I sign in next time?</summary>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Set a six-digit PIN above. On the sign-in screen, enter the same Gambian phone number and PIN. Your PIN is stored as a secure hash on the server, never as plain text. If you forget it, use SMS verification to recover access.</p>
                </details>
                <details className="group rounded-lg border p-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold">What is the daily ledger?</summary>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">It is your digital cash book. Record sales, business expenses, credit given to customers and repayments received. Enter the date, amount, category and a clear description so reports make sense later.</p>
                </details>
                <details className="group rounded-lg border p-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold">How does inventory work, and what is a SKU?</summary>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Add each item you sell or store, its current quantity, buying cost, selling price and low-stock alert. A SKU (Stock Keeping Unit) is a short unique item code, such as RICE-25KG. Use the same code for the same product every time.</p>
                </details>
                <details className="group rounded-lg border p-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold">Can I add product photos?</summary>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Yes. Inventory photos are optional. Choose a photo and Kaira compresses it to 200 KB or less before upload to help conserve storage and mobile data. Photos require the inventory image storage service to be configured.</p>
                </details>
                <details className="group rounded-lg border p-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold">What should I do if a page or save action fails?</summary>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Check your internet connection and retry once. Do not repeatedly submit a payment or record if you are unsure whether it saved. If the issue continues, contact support and include the page name and exact error message—never send your PIN or OTP.</p>
                </details>
                <details className="group rounded-lg border p-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold">How do I protect my account?</summary>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Keep your PIN and SMS codes private, use a PIN that is not easy to guess, and choose “Log out of all devices” if you think someone else has access to your account.</p>
                </details>
              </CardContent>
            </Card>

            {/* Security — note: business users authenticate via
                phone/OTP only and have no password to change here.
                Password reset exists only for the separate admin
                portal (see /admin/forgot-password). */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Log out of all devices</p>
                    <p className="text-xs text-muted-foreground">
                      Ends every active session for your account, including this one.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    disabled={logoutAll.isPending}
                    onClick={() => logoutAll.mutate()}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {logoutAll.isPending ? 'Logging out…' : 'Log out everywhere'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Legal & Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={() => setLocation('/legal/terms')} className="p-3 rounded-lg border text-left hover:bg-muted transition-colors">
                    <p className="text-sm font-semibold">Terms of Service</p>
                    <p className="text-xs text-muted-foreground mt-1">Review Kaira Africa service terms.</p>
                  </button>
                  <button type="button" onClick={() => setLocation('/legal/privacy')} className="p-3 rounded-lg border text-left hover:bg-muted transition-colors">
                    <p className="text-sm font-semibold">Privacy Policy</p>
                    <p className="text-xs text-muted-foreground mt-1">Review how account and business data is handled.</p>
                  </button>
                </div>
                <Separator />
                <div className="text-sm">
                  <p className="font-medium">Official Kaira Africa support</p>
                  <div className="flex flex-wrap gap-3 mt-1">
                    <a href="tel:+220874071510" className="text-primary hover:underline">Call +220 87 407 1510</a>
                    <a href="https://wa.me/220874071510" target="_blank" rel="noreferrer" className="text-primary hover:underline">WhatsApp support</a>
                  </div>
                  <p className="text-muted-foreground">Royal Africa House, (Opposite Indian Farm) OIC Highway, Sukuta, The Gambia</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </PageTransition>
  );
}
