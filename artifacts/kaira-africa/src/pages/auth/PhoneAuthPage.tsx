import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Phone, ChevronRight, Shield } from 'lucide-react';
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
import { BRAND } from '@/lib/brand';
import { useRequestOtp } from '@workspace/api-client-react';

// Gambian phone validation: +220 87 followed by 7 digits (9 digits total)
const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\d{7}$/, 'Enter the 7 digits after the 87 prefix'),
});

type PhoneForm = z.infer<typeof phoneSchema>;

export default function PhoneAuthPage() {
  const [, setLocation] = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [networkPrefix, setNetworkPrefix] = useState('87');
  const networks = [
    { prefix: '87', name: 'Africell' },
    { prefix: '83', name: 'QCell' },
    { prefix: '86', name: 'Comium' },
    { prefix: '', name: 'Gamcel (no new prefix)' },
  ];

  const form = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  const requestOtp = useRequestOtp({
    mutation: {
      onSuccess: (data, variables) => {
        sessionStorage.setItem('kaira_pending_phone', variables.data.phoneNumber);
        // devOtp is only ever populated outside production (see the
        // backend's RequestOtpResponse) — OTPPage reads this same key
        // for its dev-mode banner.
        if (data.devOtp) {
          sessionStorage.setItem('kaira_dev_otp', data.devOtp);
        } else {
          sessionStorage.removeItem('kaira_dev_otp');
        }
        setLocation('/login/otp');
      },
      onError: (error) => {
        setFormError(error.message);
      },
    },
  });

  const onSubmit = (data: PhoneForm) => {
    setFormError(null);
    requestOtp.mutate({ data: { phoneNumber: `+220${networkPrefix}${data.phone}` } });
  };

  return (
    <div className="min-h-[100dvh] flex">
      {/* ── Left Panel — Branding ── */}
      <div className="hidden lg:flex lg:w-[42%] bg-sidebar flex-col justify-between p-12 relative overflow-hidden">
        {/* African geometric pattern */}
        <div className="absolute inset-0 opacity-[0.06]">
          <svg className="w-full h-full" viewBox="0 0 500 800" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="kente" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="50" height="50" fill="white" />
                <rect x="50" y="50" width="50" height="50" fill="white" />
                <polygon points="50,0 100,50 50,100 0,50" fill="white" opacity="0.5" />
                <circle cx="50" cy="50" r="15" fill="white" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="500" height="800" fill="url(#kente)" />
          </svg>
        </div>

        {/* Gold arc accent */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary" />

        <div className="relative z-10">
          <KairaLogo width={160} className="brightness-0 invert" />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Africa continent decoration */}
          <div className="text-secondary/30">
            <svg width="120" height="140" viewBox="0 0 120 140" fill="currentColor">
              <path d="M60 8 L75 18 L88 35 L92 55 L88 78 L78 98 L65 118 L55 128 L42 122 L30 108 L24 90 L20 70 L24 50 L35 30 L48 14 Z" />
              <ellipse cx="85" cy="52" rx="12" ry="8" />
            </svg>
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold text-white leading-tight mb-3">
              🇬🇲 Built for<br />The Gambia
            </h2>
            <p className="text-sidebar-foreground/70 text-base leading-relaxed">
              {BRAND.tagline}
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Fast & secure phone verification',
              'No passwords to remember',
              'Your data stays private',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="h-3 w-3 text-secondary" />
                </div>
                <span className="text-sm text-sidebar-foreground/70">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} Kaira Africa
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden text-center">
            <KairaLogo width={130} className="mx-auto" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
              <div className="flex gap-1.5">
                <div className="h-1.5 w-8 rounded-full bg-primary" />
                <div className="h-1.5 w-8 rounded-full bg-muted" />
                <div className="h-1.5 w-8 rounded-full bg-muted" />
              </div>
              <span className="text-xs text-muted-foreground ml-1">Step 1 of 3</span>
            </div>

            <div className="mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Enter your phone number
              </h1>
              <p className="text-muted-foreground text-sm">
                We'll send a verification code to confirm your identity.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gambian Phone Number</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <div className="flex items-center gap-2 px-2 border border-r-0 border-input rounded-l-md bg-muted text-sm font-medium whitespace-nowrap">
                            <span className="text-base">🇬🇲</span>
                            <span className="text-muted-foreground">+220</span>
                            <Select value={networkPrefix || 'none'} onValueChange={(value) => setNetworkPrefix(value === 'none' ? '' : value)}>
                              <SelectTrigger className="h-9 w-[116px] border-0 bg-transparent px-1 font-bold focus:ring-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {networks.map((network) => (
                                  <SelectItem key={network.prefix || 'none'} value={network.prefix || 'none'}>
                                    {network.name} {network.prefix ? `(${network.prefix})` : '(7 digits)'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Input type="tel" inputMode="numeric" placeholder="*******" maxLength={7}
                            className="rounded-l-none flex-1 tracking-[0.3em] font-semibold"
                            autoComplete="tel-national" autoFocus {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 7))} />
                        </div>
                          <Input
                            type="tel"
                            inputMode="numeric"
                            placeholder="XX XXXXXXX"
                            maxLength={7}
                            className="rounded-l-none flex-1"
                            autoComplete="tel-national"
                            autoFocus
                            {...field}
                            onChange={(e) => {
                              // Only allow digits
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 7);
                              field.onChange(digits);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        Select your network, then enter your 7-digit number. Gamcel keeps its existing 7-digit format.
                      </p>
                    </FormItem>
                  )}
                />

                {formError && (
                  <p className="text-sm text-destructive -mt-2" role="alert">
                    {formError}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full font-semibold"
                  disabled={requestOtp.isPending}
                >
                  {requestOtp.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Sending code…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  By continuing, you agree to Kaira Africa's{' '}
                  <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>
                  {' '}and{' '}
                  <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>.
                </p>
              </form>
            </Form>

            {/* Admin separator */}
            <div className="mt-10 pt-6 border-t border-border">
              <Link href="/admin">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
                  <Shield className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  <span>Admin Portal</span>
                </div>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
