import { useState } from 'react';
import { Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Check } from 'lucide-react';
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
import { useRequestPasswordReset } from '@workspace/api-client-react';

const IS_DEV = import.meta.env.DEV;

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  });

  const requestReset = useRequestPasswordReset({
    mutation: {
      onSuccess: (data) => {
        // The backend always responds the same way whether or not the
        // email exists (see RequestPasswordResetResponse) — this UI
        // deliberately never distinguishes either, so it can't be
        // used to enumerate admin accounts.
        setSuccess(true);
        if (IS_DEV && data.devResetToken) {
          setDevResetToken(data.devResetToken);
        }
      },
    },
  });

  const onSubmit = (data: ForgotPasswordForm) => {
    requestReset.mutate({ data: { email: data.email } });
  };

  return (
    <div className="min-h-[100dvh] flex">
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-sidebar via-primary to-primary/90 p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <KairaLogo width={160} className="brightness-0 invert" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <KairaLogo width={140} className="mx-auto mb-4" />
          </div>

          {!success ? (
            <>
              <div className="mb-8">
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Button>
                </Link>
                <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                  Forgot your password?
                </h1>
                <p className="text-muted-foreground">
                  Enter your email address and we'll send you a reset link
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" size="lg" disabled={requestReset.isPending}>
                    {requestReset.isPending ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              </Form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-3">
                Check your email
              </h1>
              <p className="text-muted-foreground mb-8">
                We've sent a password reset link to {form.getValues('email')}
              </p>
              {devResetToken && (
                <p className="text-xs font-mono bg-muted rounded-lg p-3 mb-6 break-all">
                  DEV MODE — reset token: {devResetToken}
                </p>
              )}
              <Link href="/admin">
                <Button variant="outline" className="w-full">
                  Back to login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
