import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Phone, ChevronRight, Users, Package, ChartNoAxesCombined, Sparkles, Headset, MapPin, MessageCircle } from 'lucide-react';
import { KairaLogo } from '@/components/common/KairaLogo';
import { GambiaFlag } from '@/components/common/GambiaFlag';
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

// Gambian mobile validation: selected operator prefix + 7 subscriber digits
const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\d{7}$/, 'Enter the 7 digits after the selected operator prefix'),
});

type PhoneForm = z.infer<typeof phoneSchema>;

function isPinLoginRequired(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: unknown; message?: unknown; data?: unknown };
  const data = candidate.data && typeof candidate.data === "object"
    ? candidate.data as Record<string, unknown>
    : null;
  const nestedError = data?.error && typeof data.error === "object"
    ? data.error as Record<string, unknown>
    : null;
  const code = nestedError?.code ?? data?.code;
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  return code === "pin_login_required" ||
    message.includes("already has pin sign-in enabled");
}

export default function PhoneAuthPage() {
  const [, setLocation] = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [networkPrefix, setNetworkPrefix] = useState('87');
  const networks = [
    { prefix: '87', name: 'Africell' },
    { prefix: '83', name: 'QCell' },
    { prefix: '86', name: 'Comium' },
    { prefix: '', name: 'Gamtel (enter number)' },
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
        if (isPinLoginRequired(error)) {
          // This is a known returning-user path, not an OTP failure. Remember only
          // the phone number and take the user directly to PIN entry—never store a PIN.
          const phoneNumber = `+220${networkPrefix}${form.getValues("phone")}`;
          sessionStorage.setItem("kaira_pending_phone", phoneNumber);
          localStorage.setItem("kaira_last_phone", phoneNumber);
          sessionStorage.removeItem("kaira_dev_otp");
          setFormError(null);
          setLocation("/login/pin");
          return;
        }
        setFormError(error.message || "Kaira Africa could not start sign-in. Please check your connection and try again.");
      },
    },
  });

  const onSubmit = (data: PhoneForm) => {
    setFormError(null);
    requestOtp.mutate({ data: { phoneNumber: `+220${networkPrefix}${data.phone}` } });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      {/* ── Mobile brand banner — same visual identity as desktop, adapted for small screens ── */}
      <section
        className="relative isolate flex min-h-[190px] flex-col justify-between overflow-hidden bg-[#0D2818] px-5 pb-4 pt-5 sm:min-h-[220px] sm:px-7 lg:hidden"
        aria-label="Kaira Africa business platform"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-[center_42%]"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85')",
          }}
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#071F16]/95 via-[#0D2818]/75 to-[#0D2818]/55" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#D8B45A]" />
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-lg bg-white p-1.5 shadow-lg ring-1 ring-white/50">
            <KairaLogo width={76} height={76} className="rounded-md" />
          </div>
          <span className="rounded-full border border-[#D8B45A]/60 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3D681]">
            Built for The Gambia
          </span>
        </div>
        <div className="mt-4">
          <h2 className="font-display text-xl font-extrabold leading-tight text-white sm:text-2xl">Know your business.<br className="hidden sm:block" /> Grow your business.</h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { label: 'CRM', Icon: Users },
              { label: 'Inventory', Icon: Package },
              { label: 'Analytics', Icon: ChartNoAxesCombined },
              { label: 'AI Reports', Icon: Sparkles },
            ].map(({ label, Icon }) => (
              <div key={label} className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-white/90 sm:text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 text-[#D8B45A]" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Left Panel — Branding ── */}
      <div className="hidden lg:flex lg:w-[42%] bg-sidebar flex-col justify-between p-12 relative overflow-hidden">
        {/* Photographic business workspace background with a dark green overlay.
            The logo and copy remain separate foreground elements above this layer. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "linear-gradient(135deg, rgba(7, 35, 24, 0.88), rgba(7, 35, 24, 0.68) 55%, rgba(7, 35, 24, 0.82)), url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1800&q=85')",
          }}
        />


        {/* Gold arc accent */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary" />

        <div className="relative z-10">
          <div className="w-fit rounded-xl bg-white p-2 shadow-sm"><KairaLogo width={160} /></div>
        </div>

        <div className="relative z-10 space-y-8">


          <div>
            <h2 className="font-display text-3xl font-bold text-white leading-tight mb-3">
              <GambiaFlag width={30} height={20} className="mr-2 align-middle" /> Built for<br />The Gambia
            </h2>
            <p className="text-sidebar-foreground/70 text-base leading-relaxed">
              {BRAND.tagline}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              { label: 'CRM', detail: 'Manage customers', Icon: Users },
              { label: 'Inventory', detail: 'Track stock', Icon: Package },
              { label: 'Analytics', detail: 'Understand sales', Icon: ChartNoAxesCombined },
              { label: 'AI Reports', detail: 'Smart summaries', Icon: Sparkles },
            ].map(({ label, detail, Icon }) => (
              <div key={label} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs leading-relaxed text-sidebar-foreground/65">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} Kaira Africa
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-5 pb-8 pt-7 sm:px-7 lg:p-16 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo is included in the photographic brand banner above. */}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6 sm:mb-8">
              <div className="flex gap-1.5">
                <div className="h-1.5 w-8 rounded-full bg-primary" />
                <div className="h-1.5 w-8 rounded-full bg-muted" />
                <div className="h-1.5 w-8 rounded-full bg-muted" />
              </div>
              <span className="text-xs text-muted-foreground ml-1">Step 1 of 3</span>
            </div>

            <div className="mb-6 sm:mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2 sm:text-[1.75rem]">
                Enter your phone number
              </h1>
              <p className="text-muted-foreground text-sm">
                We'll send a verification code to confirm your identity.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gambian Phone Number</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <div className="flex items-center gap-2 px-2 border border-r-0 border-input rounded-l-md bg-muted text-sm font-medium whitespace-nowrap">
                            <GambiaFlag width={28} height={20} />
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
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        Select your network, then enter your 7-digit number. Gamcel keeps its existing 7-digit format.
                      </p>
                    </FormItem>
                  )}
                />

                {formError && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 -mt-2" role="alert">
                    <KairaLogo width={26} className="shrink-0 rounded bg-white p-0.5" />
                    <p className="text-sm text-destructive">{formError}</p>
                  </div>
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
                  <Link href="/legal/terms" className="text-primary hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                </p>
              </form>
            </Form>

            <div className="mt-5 text-center text-sm">
              <span className="text-muted-foreground">Already registered? </span>
              <Link href="/login/pin" className="font-semibold text-primary underline-offset-4 hover:underline">Sign in with your 6-digit PIN</Link>
            </div>

            <div className="mt-6 pt-5 border-t border-border space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Customer Support</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <a href="tel:+220874071510" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"><Headset className="h-4 w-4" /> +220 87 407 1510</a>
                <a href="https://wa.me/220874071510" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
              </div>
              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Royal Africa House, (Opposite Indian Farm), OIC Highway, Sukuta, The Gambia</span>
              </p>
            </div>

          </motion.div>

</div>
      </div>
    </div>
  );
}
