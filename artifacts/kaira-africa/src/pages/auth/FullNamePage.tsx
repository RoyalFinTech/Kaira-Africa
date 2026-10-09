import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Smile, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useUpdateProfile } from '@workspace/api-client-react';

const nameSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Please enter your full name')
    .max(80, 'Name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens and apostrophes'),
});

type NameForm = z.infer<typeof nameSchema>;

export default function FullNamePage() {
  const [, setLocation] = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { fullName: '' },
  });

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: (user) => {
        // A brand-new user has no business yet — the person who just
        // named themselves always goes to onboarding next, since
        // businessId can only be null at this point in the funnel.
        setLocation(user.businessId ? '/dashboard' : '/business-onboarding');
      },
      onError: (error) => {
        setFormError(error.message);
      },
    },
  });

  const onSubmit = (data: NameForm) => {
    setFormError(null);
    const [firstName, ...rest] = data.fullName.trim().split(/\s+/);
    const lastName = rest.join(' ');
    updateProfile.mutate({ data: { firstName, lastName: lastName || undefined } });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        {/* Back */}
        <button
          onClick={() => setLocation('/login/otp')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        {/* Logo */}
        <div className="mb-8">
          <KairaLogo width={110} />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10">
          <div className="flex gap-1.5">
            <div className="h-1.5 w-8 rounded-full bg-primary/40" />
            <div className="h-1.5 w-8 rounded-full bg-primary/40" />
            <div className="h-1.5 w-8 rounded-full bg-primary" />
          </div>
          <span className="text-xs text-muted-foreground ml-1">Step 3 of 3</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center mb-4">
            <Smile className="h-6 w-6 text-secondary" />
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            What's your full name?
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Let's personalise your Kaira Africa experience.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Fatou Jallow"
                        autoFocus
                        autoComplete="name"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3" role="alert"><KairaLogo width={26} className="shrink-0 rounded bg-white p-0.5" /><p className="text-sm text-destructive">{formError}</p></div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full font-semibold"
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Setting up your workspace…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </Form>
        </motion.div>
      </div>
    </div>
  );
}
