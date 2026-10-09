import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { KairaLogo } from '@/components/common/KairaLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useResetPassword } from '@workspace/api-client-react';

// Mirrors the backend's actual complexity rule (see
// lib/password.ts validatePasswordComplexity) so people get useful
// inline feedback instead of a generic 400 after submitting.
const schema = z
  .object({
    password: z
      .string()
      .min(10, 'Must be at least 10 characters')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a digit')
      .regex(/[^A-Za-z0-9]/, 'Must contain a symbol'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const token = new URLSearchParams(window.location.search).get('token') ?? '';

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const resetPassword = useResetPassword({
    mutation: {
      onSuccess: () => setLocation('/admin'),
      onError: (error) => setFormError(error.message),
    },
  });

  const onSubmit = (data: ResetPasswordForm) => {
    setFormError(null);
    resetPassword.mutate({ data: { token, newPassword: data.password } });
  };

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm text-center">
          <KairaLogo width={140} className="mx-auto mb-6" />
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Invalid reset link
          </h1>
          <p className="text-muted-foreground mb-8">
            This password reset link is missing its token. Request a new one.
          </p>
          <Link href="/admin/forgot-password">
            <Button variant="outline" className="w-full">Request a new link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex">
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-sidebar via-primary to-primary/90 p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-fit rounded-xl bg-white p-2 shadow-sm"><KairaLogo width={160} /></div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <KairaLogo width={140} className="mx-auto mb-4" />
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Reset your password
            </h1>
            <p className="text-muted-foreground">
              Enter a new password for your account
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3" role="alert"><KairaLogo width={26} className="shrink-0 rounded bg-white p-0.5" /><p className="text-sm text-destructive">{formError}</p></div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={resetPassword.isPending}>
                {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/admin">
                  <span className="text-primary hover:underline">
                    Back to login
                  </span>
                </Link>
              </p>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
