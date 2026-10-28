import { KairaLogo } from '@/components/common/KairaLogo';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Settings2, Building2, Shield, Bell, Palette, Users, CreditCard, Clock3,
  Save, CheckCircle2, ChevronRight, LogOut
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { PageTransition } from '@/components/common/PageTransition';
import { useGetMe, useGetMyBusiness, useUpdateBusiness, useLogoutAll, ApiError } from '@workspace/api-client-react';
import { apiRequestJson, clearToken } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type TabKey = 'business' | 'branding' | 'security' | 'appearance' | 'team' | 'billing' | 'preferences';

const tabs: { key: TabKey; label: string; icon: typeof Settings2 }[] = [
  { key: 'business',      label: 'Business Profile', icon: Building2   },
  { key: 'branding',      label: 'Branding & Identity', icon: Palette },
  { key: 'security',      label: 'Security',         icon: Shield      },
  { key: 'appearance',    label: 'Appearance',       icon: Palette     },
  { key: 'team',          label: 'Team & Permissions', icon: Users     },
  { key: 'billing',       label: 'Billing',          icon: CreditCard  },
  { key: 'preferences',   label: 'Schedule & alerts', icon: Clock3      },
];

const roleMatrix = [
  { role: 'Owner',   manage: true,  view: true,  billing: true,  team: true  },
  { role: 'Admin',   manage: true,  view: true,  billing: false, team: true  },
  { role: 'Manager', manage: false, view: true,  billing: false, team: false },
  { role: 'Staff',   manage: false, view: true,  billing: false, team: false },
];

function SaveButton({ saved, pending }: { saved: boolean; pending?: boolean }) {
  return (
    <Button size="sm" className="gap-2 mt-4" type="submit" disabled={pending}>
      {pending
        ? <>Saving…</>
        : saved
        ? <><CheckCircle2 className="h-4 w-4" /> Saved</>
        : <><Save className="h-4 w-4" /> Save Changes</>}
    </Button>
  );
}


const TIME_ZONES = [
  { value: 'Africa/Banjul', label: 'The Gambia — Banjul (GMT, UTC+00:00)' },
  { value: 'Africa/Abidjan', label: 'Côte d’Ivoire — Abidjan (UTC+00:00)' },
  { value: 'Africa/Accra', label: 'Ghana — Accra (UTC+00:00)' },
  { value: 'Africa/Lagos', label: 'Nigeria — Lagos (UTC+01:00)' },
  { value: 'Africa/Dakar', label: 'Senegal — Dakar (UTC+00:00)' },
  { value: 'Africa/Nairobi', label: 'Kenya — Nairobi (UTC+03:00)' },
  { value: 'Africa/Johannesburg', label: 'South Africa — Johannesburg (UTC+02:00)' },
  { value: 'Europe/London', label: 'United Kingdom — London' },
  { value: 'Europe/Paris', label: 'Central Europe — Paris' },
  { value: 'Europe/Berlin', label: 'Central Europe — Berlin' },
  { value: 'Europe/Istanbul', label: 'Türkiye — Istanbul (UTC+03:00)' },
  { value: 'Asia/Dubai', label: 'UAE — Dubai (UTC+04:00)' },
  { value: 'Asia/Kolkata', label: 'India — Kolkata (UTC+05:30)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Japan — Tokyo (UTC+09:00)' },
  { value: 'Australia/Sydney', label: 'Australia — Sydney' },
  { value: 'America/New_York', label: 'United States — New York / Eastern' },
  { value: 'America/Chicago', label: 'United States — Chicago / Central' },
  { value: 'America/Denver', label: 'United States — Denver / Mountain' },
  { value: 'America/Los_Angeles', label: 'United States — Los Angeles / Pacific' },
  { value: 'America/Toronto', label: 'Canada — Toronto / Eastern' },
  { value: 'America/Vancouver', label: 'Canada — Vancouver / Pacific' },
  { value: 'America/Sao_Paulo', label: 'Brazil — São Paulo' },
  { value: 'Pacific/Auckland', label: 'New Zealand — Auckland' },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const businessPreferencesQ = useQuery({ queryKey: ['business-preferences'], queryFn: () => apiRequestJson<{timeZone:string}>('/businesses/me/preferences') });
  const notificationPreferencesQ = useQuery({ queryKey: ['notification-preferences'], queryFn: () => apiRequestJson<{taskReminders:boolean;taskReminderEmail:boolean;hasEmail:boolean}>('/notifications/preferences') });
  const timeZoneMutation = useMutation({
    mutationFn: (timeZone: string) => apiRequestJson<{timeZone:string}>('/businesses/me/preferences', { method: 'PATCH', body: JSON.stringify({ timeZone }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['business-preferences'] }); setSaved(true); setSaveError(null); setTimeout(() => setSaved(false), 2500); },
    onError: (error) => setSaveError(error instanceof Error ? error.message : 'Could not save the business time zone.'),
  });
  const remindersMutation = useMutation({
    mutationFn: (preferences: {taskReminders?:boolean;taskReminderEmail?:boolean}) => apiRequestJson<{taskReminders:boolean;taskReminderEmail:boolean;hasEmail:boolean}>('/notifications/preferences', { method: 'PATCH', body: JSON.stringify(preferences) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['notification-preferences'] }); setSaveError(null); },
    onError: (error) => setSaveError(error instanceof Error ? error.message : 'Could not save notification preferences.'),
  });
  const { data: me } = useGetMe();
  const { data: business } = useGetMyBusiness();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>('business');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Backend's requireRole("owner") is the actual boundary on
  // PATCH /businesses/me (see api-server/src/routes/businesses.ts) —
  // this only avoids showing an edit form that would 403 on submit.
  const canEditBusiness = me?.role === 'owner';

  const updateBusiness = useUpdateBusiness({
    mutation: {
      onSuccess: () => {
        setSaved(true);
        setSaveError(null);
        setTimeout(() => setSaved(false), 2500);
      },
      onError: (error) => setSaveError(error instanceof ApiError ? error.message : 'Failed to save changes'),
    },
  });

  const logoutAll = useLogoutAll({
    mutation: {
      onSettled: () => {
        clearToken();
        setLocation('/login');
      },
    },
  });

  const handleSaveBusiness = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveError(null);
    const form = new FormData(e.currentTarget);
    updateBusiness.mutate({
      data: {
        name: String(form.get('name') || ''),
        industry: String(form.get('industry') || ''),
        phone: String(form.get('phone') || '') || undefined,
        email: String(form.get('email') || '') || undefined,
        website: String(form.get('website') || '') || undefined,
        city: String(form.get('city') || ''),
        description: String(form.get('description') || '') || undefined,
        address: String(form.get('address') || '') || undefined,
      },
    });
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-slate-500/10 p-5 sm:p-6">
          <div className="absolute -right-6 -top-10 h-36 w-36 rounded-full bg-slate-500/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><Settings2 className="h-7 w-7" /></div><div><h1 className="font-display mb-1 text-3xl font-bold text-foreground">Settings</h1><p className="text-sm text-muted-foreground">Manage your workspace preferences and configuration.</p></div></div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Sidebar tabs ── */}
          <div className="lg:w-52 flex-shrink-0">
            <Card>
              <CardContent className="p-2">
                <nav className="space-y-0.5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                        activeTab === tab.key
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <tab.icon className="h-4 w-4 flex-shrink-0" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* ── Content panel ── */}
          <div className="flex-1 min-w-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* GENERAL */}
              {/* BUSINESS PROFILE */}
              {activeTab === 'business' && (
                <Card>
                  <CardHeader><CardTitle>Business Profile</CardTitle></CardHeader>
                  <CardContent>
                    {!canEditBusiness && (
                      <p className="text-xs text-muted-foreground mb-4">
                        Only the business owner can edit these details. You can view them below.
                      </p>
                    )}
                    <form onSubmit={handleSaveBusiness} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>Business Name</Label><Input name="name" defaultValue={business?.name} disabled={!canEditBusiness} /></div>
                        <div className="space-y-1.5"><Label>Industry</Label><Input name="industry" defaultValue={business?.industry} disabled={!canEditBusiness} /></div>
                        <div className="space-y-1.5"><Label>Phone</Label><Input name="phone" defaultValue={business?.phone || ''} disabled={!canEditBusiness} /></div>
                        <div className="space-y-1.5"><Label>Email</Label><Input name="email" defaultValue={business?.email || ''} disabled={!canEditBusiness} /></div>
                        <div className="space-y-1.5"><Label>Website</Label><Input name="website" defaultValue={business?.website || ''} disabled={!canEditBusiness} /></div>
                        <div className="space-y-1.5"><Label>City</Label><Input name="city" defaultValue={business?.city} disabled={!canEditBusiness} /></div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Business Description</Label>
                        <Textarea name="description" defaultValue={business?.description || ''} rows={3} disabled={!canEditBusiness} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Physical Address</Label>
                        <Input name="address" defaultValue={business?.address || ''} disabled={!canEditBusiness} />
                      </div>
                      {saveError && <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><KairaLogo width={26} className="shrink-0 rounded bg-white p-0.5" /><span>{saveError}</span></div>}
                      {canEditBusiness && <SaveButton saved={saved} pending={updateBusiness.isPending} />}
                    </form>
                  </CardContent>
                </Card>
              )}


              {activeTab === 'preferences' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle>Business time zone</CardTitle><p className="text-sm text-muted-foreground">Used to display meeting times and calculate task reminder dates for your whole business. Remote workers can compare schedules using the same business clock.</p></CardHeader>
                    <CardContent className="space-y-3">
                      <Label htmlFor="business-time-zone">Time zone for schedules and deadlines</Label>
                      <select id="business-time-zone" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={businessPreferencesQ.data?.timeZone ?? 'Africa/Banjul'} disabled={businessPreferencesQ.isLoading || timeZoneMutation.isPending || me?.role !== 'owner'} onChange={event => timeZoneMutation.mutate(event.target.value)}>
                        {TIME_ZONES.map(zone => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
                        {businessPreferencesQ.data?.timeZone && !TIME_ZONES.some(zone => zone.value === businessPreferencesQ.data?.timeZone) && <option value={businessPreferencesQ.data.timeZone}>{businessPreferencesQ.data.timeZone}</option>}
                      </select>
                      <p className="text-xs text-muted-foreground">Times are stored as exact instants and displayed in this selected IANA time zone. Daylight-saving changes follow the time-zone rules.</p>
                      {businessPreferencesQ.error && <p role="alert" className="text-sm text-destructive">Could not load your business time zone. Refresh and try again.</p>}
                      {timeZoneMutation.isPending && <p role="status" className="text-sm text-muted-foreground">Saving time zone…</p>}
                      {me?.role !== 'owner' && <p className="text-xs text-muted-foreground">Ask your business owner to change the shared business time zone.</p>}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Task reminder preferences</CardTitle><p className="text-sm text-muted-foreground">Choose whether Kaira creates in-app notifications for tasks due today or already overdue. This preference belongs to your user account.</p></CardHeader>
                    <CardContent className="space-y-4">
                      <label className="flex items-start gap-3 rounded-xl border p-4">
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-800" checked={notificationPreferencesQ.data?.taskReminders ?? true} disabled={notificationPreferencesQ.isLoading || remindersMutation.isPending} onChange={event => remindersMutation.mutate({ taskReminders: event.target.checked })} />
                        <span><span className="block text-sm font-medium">In-app task reminders</span><span className="mt-1 block text-xs text-muted-foreground">Due-today and overdue reminders. Turning this off stops future reminders; existing notifications remain in your inbox.</span></span>
                      </label>
                      <label className="flex items-start gap-3 rounded-xl border p-4">
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-800" checked={notificationPreferencesQ.data?.taskReminderEmail ?? false} disabled={notificationPreferencesQ.isLoading || remindersMutation.isPending || !notificationPreferencesQ.data?.hasEmail} onChange={event => remindersMutation.mutate({ taskReminderEmail: event.target.checked })} />
                        <span><span className="block text-sm font-medium">Email task reminders</span><span className="mt-1 block text-xs text-muted-foreground">Optional email copies for due-today and overdue tasks. Messages are queued and retried when SMTP is available.</span></span>
                      </label>
                      {!notificationPreferencesQ.data?.hasEmail && !notificationPreferencesQ.isLoading && <p className="text-xs text-amber-800">Add an email address to your profile before enabling email reminders. <button type="button" className="underline" onClick={() => setLocation('/profile')}>Open profile</button></p>}
                      <p className="text-xs text-muted-foreground">Browser push notifications are still being developed and are not offered as a working option yet.</p>
                      {remindersMutation.isPending && <p role="status" className="text-sm text-muted-foreground">Saving preference…</p>}
                      {notificationPreferencesQ.error && <p role="alert" className="text-sm text-destructive">Could not load your notification preferences.</p>}
                    </CardContent>
                  </Card>
                  {saveError && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{saveError}</p>}
                </div>
              )}

              {/* BRANDING & IDENTITY: these destinations use the existing live profile and receipt-branding flows. */}
              {activeTab === 'branding' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Branding & Identity</CardTitle>
                    <p className="text-sm text-muted-foreground">Keep your personal identity and business documents consistent. These controls open the existing pages that save through Kaira's API and private storage.</p>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border p-4">
                      <div className="mb-2 flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><h3 className="font-semibold">Business identity</h3></div>
                      <p className="mb-4 text-sm text-muted-foreground">Edit the business name, address, contact details, website and description. Changes save through the business profile API.</p>
                      <Button className="w-full" onClick={() => setActiveTab('business')}>Edit business details</Button>
                    </div>
                    <div className="rounded-xl border p-4">
                      <div className="mb-2 flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /><h3 className="font-semibold">Receipt & print branding</h3></div>
                      <p className="mb-4 text-sm text-muted-foreground">Set the receipt logo, printed business details, customer visibility and footer note. Logo files use private storage.</p>
                      <Button className="w-full" onClick={() => setLocation('/receipt-branding')}>Open print branding</Button>
                    </div>
                    <div className="rounded-xl border p-4">
                      <div className="mb-2 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h3 className="font-semibold">Personal profile</h3></div>
                      <p className="mb-4 text-sm text-muted-foreground">Manage your name, profile photo and account details.</p>
                      <Button variant="outline" className="w-full" onClick={() => setLocation('/profile')}>Open my profile</Button>
                    </div>
                    <div className="rounded-xl border p-4">
                      <div className="mb-2 flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><h3 className="font-semibold">Notifications</h3></div>
                      <p className="mb-4 text-sm text-muted-foreground">Review your in-app notifications. Delivery preferences are not exposed here until a notification-preferences API is available.</p>
                      <Button variant="outline" className="w-full" onClick={() => setLocation('/notifications')}>View notifications</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SECURITY — note: business users authenticate via
                  phone/OTP only and have no password to change here.
                  Password reset exists only for the separate admin
                  portal (see /admin/forgot-password). */}
              {activeTab === 'security' && (
                <Card>
                  <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
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
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">Add extra security with 2FA</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Coming soon</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* APPEARANCE */}
              {activeTab === 'appearance' && (
                <Card>
                  <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Choose how Kaira Africa looks to you.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={cn(
                            'p-4 rounded-xl border-2 transition-all text-left',
                            theme === t ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
                          )}
                        >
                          <div className={cn(
                            'h-16 rounded-lg mb-3 border',
                            t === 'light' ? 'bg-white border-slate-200' :
                              t === 'dark' ? 'bg-slate-900 border-slate-700' :
                                'bg-gradient-to-br from-white to-slate-900 border-slate-300'
                          )} />
                          <p className="text-sm font-semibold capitalize">{t}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t === 'light' ? 'Always light' : t === 'dark' ? 'Always dark' : 'Follow system'}
                          </p>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">Full theme switching isn't wired up yet — this selection isn't saved.</p>
                  </CardContent>
                </Card>
              )}

              {/* TEAM & PERMISSIONS */}
              {activeTab === 'team' && (
                <Card>
                  <CardHeader><CardTitle>Roles & Permissions</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Role-based permissions enforced on both client and server side.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b border-border">
                            <th className="pb-3 font-semibold text-foreground">Role</th>
                            <th className="pb-3 font-semibold text-foreground">Manage Data</th>
                            <th className="pb-3 font-semibold text-foreground">View Data</th>
                            <th className="pb-3 font-semibold text-foreground">Billing</th>
                            <th className="pb-3 font-semibold text-foreground">Team</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {roleMatrix.map((row) => (
                            <tr key={row.role} className="py-3">
                              <td className="py-3"><Badge variant="outline" className="text-xs">{row.role}</Badge></td>
                              {['manage', 'view', 'billing', 'team'].map((col) => (
                                <td key={col} className="py-3">
                                  <span className={`text-sm ${row[col as keyof typeof row] ? 'text-green-600' : 'text-muted-foreground/40'}`}>
                                    {row[col as keyof typeof row] ? '✓' : '✗'}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* BILLING: the live billing page owns current plan status and launch messaging. */}
              {activeTab === 'billing' && (
                <Card>
                  <CardHeader><CardTitle>Billing & Plan</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">View the current early-access plan, included features and future payment-method status. No payment details are collected on this settings screen.</p>
                    <Button className="w-full sm:w-auto gap-2" onClick={() => setLocation('/billing')}><CreditCard className="h-4 w-4" />Open Billing & Plan</Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
