import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Settings2, Building2, Shield, Bell, Palette, Users, CreditCard,
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
import { clearToken } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type TabKey = 'business' | 'security' | 'appearance' | 'team' | 'billing';

const tabs: { key: TabKey; label: string; icon: typeof Settings2 }[] = [
  { key: 'business',      label: 'Business Profile', icon: Building2   },
  { key: 'security',      label: 'Security',         icon: Shield      },
  { key: 'appearance',    label: 'Appearance',       icon: Palette     },
  { key: 'team',          label: 'Team & Permissions', icon: Users     },
  { key: 'billing',       label: 'Billing',          icon: CreditCard  },
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

export default function SettingsPage() {
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
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your workspace preferences and configuration.</p>
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
                      {saveError && <p className="text-sm text-destructive" role="alert">{saveError}</p>}
                      {canEditBusiness && <SaveButton saved={saved} pending={updateBusiness.isPending} />}
                    </form>
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

              {/* BILLING */}
              {activeTab === 'billing' && (
                <Card>
                  <CardHeader><CardTitle>Billing & Subscription</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl border border-dashed border-border text-center">
                      <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground">Billing isn't set up yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Plans, invoices, and payment methods will appear here once billing is built.
                      </p>
                    </div>
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
