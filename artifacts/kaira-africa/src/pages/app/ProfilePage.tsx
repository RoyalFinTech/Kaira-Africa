import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Building2, Calendar, CheckCircle2, Edit2, Shield, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { PageTransition } from '@/components/common/PageTransition';
import { useGetMe, useGetMyBusiness, useUpdateProfile, useLogoutAll, ApiError } from '@workspace/api-client-react';
import { clearToken } from '@/lib/api-client';
import { formatDate, getInitials } from '@/lib/utils';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
});
type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { data: user } = useGetMe();
  const { data: business } = useGetMyBusiness();
  const [saved, setSaved] = useState(false);
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

  const logoutAll = useLogoutAll({
    mutation: {
      onSettled: () => {
        clearToken();
        setLocation('/login');
      },
    },
  });

  const onSave = (data: ProfileForm) => {
    setFormError(null);
    updateProfile.mutate({ data });
  };

  if (!user) return null;

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
              {/* Avatar */}
              <div className="relative mb-4">
                <Avatar className="h-20 w-20 bg-secondary">
                  <AvatarFallback className="bg-secondary text-sidebar-primary-foreground text-2xl font-bold">
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>

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
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <Input value={user.email ?? ''} disabled className="text-muted-foreground bg-muted" />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
                    </FormItem>
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <Input value={user.phone ?? ''} disabled className="text-muted-foreground bg-muted" />
                      <p className="text-xs text-muted-foreground mt-1">Changing your phone number requires re-verifying it — not available here yet.</p>
                    </FormItem>
                    {formError && (
                      <p className="text-sm text-destructive" role="alert">{formError}</p>
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
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
