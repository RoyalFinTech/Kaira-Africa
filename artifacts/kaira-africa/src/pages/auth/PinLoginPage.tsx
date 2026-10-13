import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { KairaLogo } from "@/components/common/KairaLogo";
import { GambiaFlag } from "@/components/common/GambiaFlag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequestJson, setToken } from "@/lib/api-client";

interface PinLoginResult {
  token: string;
  isNewUser: boolean;
  user: {
    phone?: string | null;
    firstName?: string | null;
    businessId?: string | null;
  };
}

export default function PinLoginPage() {
  const [, setLocation] = useLocation();
  const [phoneNumber, setPhoneNumber] = useState(
    () => localStorage.getItem("kaira_last_phone") || sessionStorage.getItem("kaira_pending_phone") || "",
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const phone = phoneNumber.trim();
    if (!phone) {
      setError("Enter the phone number linked to your Kaira Africa account.");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError("Enter all six digits of your PIN.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiRequestJson<PinLoginResult>("/auth/login-pin", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: phone, pin }),
      });
      setToken(result.token);
      localStorage.setItem("kaira_last_phone", result.user.phone || phone);
      if (!result.user.firstName) {
        setLocation("/login/name");
      } else if (!result.user.businessId) {
        setLocation("/business-onboarding");
      } else {
        setLocation("/dashboard");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't sign you in. Please try again.");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background lg:flex">
      {/* Premium brand panel, with a short crop on mobile. */}
      <section
        aria-label="Kaira Africa for growing businesses"
        className="relative isolate flex min-h-[185px] flex-col justify-between overflow-hidden bg-[#092718] px-5 py-5 sm:min-h-[210px] sm:px-7 lg:min-h-[100dvh] lg:w-[44%] lg:px-10 lg:py-10 xl:px-14"
      >
        <img
          src="/kaira-pin-login-hero.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_45%]"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#062317]/90 via-[#062317]/70 to-[#062317]/45" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-secondary" />
        <div className="relative z-10">
          <div className="w-fit rounded-xl bg-white p-2 shadow-lg">
            <KairaLogo width={140} className="sm:w-[160px]" />
          </div>
        </div>
        <div className="relative z-10 mt-7 max-w-lg space-y-4 lg:my-auto lg:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E9CA78]/50 bg-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5D986] sm:text-xs">
            <GambiaFlag width={24} height={16} />
            Built for The Gambia
          </div>
          <h2 className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl xl:text-4xl">
            Welcome back to your business.
          </h2>
          <p className="hidden max-w-md text-sm leading-6 text-white/85 sm:block sm:text-base">
            Your customers, daily ledger and inventory are right where you left them. Sign in securely and get back to work.
          </p>
          <div className="hidden flex-wrap gap-2 pt-1 sm:flex">
            {["Sales & expenses", "Inventory", "Customer records"].map((label) => (
              <span key={label} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
                {label}
              </span>
            ))}
          </div>
        </div>
        <p className="relative z-10 mt-6 hidden text-xs text-white/65 lg:block">
          © {new Date().getFullYear()} Kaira Africa · Your business, clearly managed.
        </p>
      </section>

      <main className="flex min-w-0 flex-1 items-start justify-center px-5 pb-10 pt-8 sm:px-8 lg:items-center lg:px-12 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="mb-7 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Secure returning-user sign-in
          </div>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Enter your PIN
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use the six-digit PIN you created during registration. Your number is remembered on this device for a faster return.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <label className="block space-y-2 text-sm font-semibold">
              Phone number
              <div className="relative">
                <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="+220 87 1234567"
                  className="h-12 pl-10 text-base"
                  required
                />
              </div>
            </label>

            <label className="block space-y-2 text-sm font-semibold">
              Six-digit PIN
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="h-14 text-center text-xl tracking-[0.65em]"
                aria-label="Six-digit sign-in PIN"
                required
              />
              <span className="block text-xs font-normal text-muted-foreground">
                Keep your PIN private. Too many incorrect attempts may temporarily pause PIN sign-in.
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm leading-5 text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" disabled={submitting} className="h-12 w-full gap-2 font-semibold">
              {submitting ? "Signing you in…" : "Continue to dashboard"}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm">
            <p className="text-muted-foreground">
              Forgot your PIN?{" "}
              <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                Sign in with SMS verification
              </Link>
            </p>
            <p className="text-muted-foreground">
              New to Kaira Africa?{" "}
              <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                Create your account
              </Link>
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-semibold text-foreground">Need assistance?</p>
            <p className="mt-1 text-muted-foreground">Our support team is available if you cannot access your account.</p>
            <a href="https://wa.me/220874071510" target="_blank" rel="noreferrer" className="mt-3 inline-flex font-semibold text-primary underline-offset-4 hover:underline">
              WhatsApp +220 87 407 1510
            </a>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
