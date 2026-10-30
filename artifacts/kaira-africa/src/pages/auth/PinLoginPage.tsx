import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { KeyRound, ShieldCheck, Eye, EyeOff, CircleHelp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KairaLogo } from "@/components/common/KairaLogo";
import { GambiaFlag } from "@/components/common/GambiaFlag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequestJson, setToken } from "@/lib/api-client";
import { reportKairaFeedback } from "@/lib/platform-api";

interface PinLoginResult {
  token: string;
  isNewUser: boolean;
  user: { phone?: string | null; firstName?: string | null; businessId?: string | null };
}
const NETWORKS = [
  { prefix: "87", name: "Africell" },
  { prefix: "83", name: "QCell" },
  { prefix: "86", name: "Comium" },
  { prefix: "none", name: "Gamcel (no new prefix)" },
];

function splitGambianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("220") ? digits.slice(3) : digits;
  const network = NETWORKS.find((item) => item.prefix !== "none" && national.startsWith(item.prefix));
  if (network) return { prefix: network.prefix, subscriber: national.slice(2, 9) };
  return { prefix: "none", subscriber: national.slice(0, 7) };
}

export default function PinLoginPage() {
  const [, setLocation] = useLocation();
  const initialPhone = localStorage.getItem("kaira_last_phone") || sessionStorage.getItem("kaira_pending_phone") || "";
  const initial = useMemo(() => splitGambianPhone(initialPhone), []);
  const hasRememberedPhone = Boolean(initialPhone && /^\d{7}$/.test(initial.subscriber));
  const [showPhoneEditor, setShowPhoneEditor] = useState(!hasRememberedPhone);
  const [networkPrefix, setNetworkPrefix] = useState(initial.prefix);
  const [subscriberNumber, setSubscriberNumber] = useState(initial.subscriber);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);

  const fullPhone = useMemo(() => `+220${networkPrefix === "none" ? "" : networkPrefix}${subscriberNumber}`, [networkPrefix, subscriberNumber]);
  const completePhone = networkPrefix === "none" ? /^\d{7}$/.test(subscriberNumber) : /^\d{7}$/.test(subscriberNumber);

  useEffect(() => {
    // Remember only the phone number, never the PIN.
    if (initialPhone) {
      setNetworkPrefix(initial.prefix);
      setSubscriberNumber(initial.subscriber);
    }
  }, []);

  const submitPin = useCallback(async (pinValue: string) => {
    if (submitLockRef.current || submitting) return;
    submitLockRef.current = true;
    setError(null);
    if (!completePhone) {
      setError("Enter the seven subscriber digits for your selected Gambian network.");
      submitLockRef.current = false;
      return;
    }
    if (!/^\d{6}$/.test(pinValue)) {
      setError("Enter all six digits of your PIN.");
      pinInputRef.current?.focus();
      submitLockRef.current = false;
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiRequestJson<PinLoginResult>("/auth/login-pin", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: fullPhone, pin: pinValue }),
      });
      setToken(result.token);
      localStorage.setItem("kaira_last_phone", result.user.phone || fullPhone);
      sessionStorage.removeItem("kaira_pending_phone");
      sessionStorage.removeItem("kaira_dev_otp");
      reportKairaFeedback({
        variant: "success",
        title: "Welcome back",
        message: "Your PIN was verified. Kaira Africa is opening your workspace.",
      });
      if (!result.user.firstName) setLocation("/login/name");
      else if (!result.user.businessId) setLocation("/business-onboarding");
      else setLocation("/dashboard");
    } catch (cause) {
      const message = cause instanceof Error && cause.message !== "[object Object]"
        ? cause.message
        : "Kaira Africa could not verify that PIN. Check the six digits and try again.";
      setError(message);
      reportKairaFeedback({ variant: "error", title: "PIN sign-in failed", message });
      setPin("");
      pinInputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }, [completePhone, fullPhone, setLocation, submitting]);

  useEffect(() => {
    if (pin.length !== 6) {
      submitLockRef.current = false;
      return;
    }
    if (!completePhone || submitting || submitLockRef.current) return;
    void submitPin(pin);
  }, [pin, completePhone, submitting, submitPin]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitPin(pin);
  };

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#f4f7f4] px-3 py-6 sm:px-6 sm:py-10">
      <section aria-label="Kaira Africa for growing businesses" className="hidden">
        <img src="/kaira-pin-login-hero.webp" alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_45%]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-[#062317]/95 via-[#062317]/75 to-[#062317]/45" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-secondary" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="w-fit rounded-xl bg-white p-2 shadow-lg ring-1 ring-white/40"><KairaLogo width={118} className="sm:w-[150px]" /></div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E9CA78]/50 bg-black/25 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#F5D986] sm:text-xs lg:hidden">
            <GambiaFlag width={23} height={15} /> The Gambia
          </div>
        </div>
        <div className="relative z-10 mt-5 max-w-lg space-y-3 lg:my-auto lg:py-14 lg:space-y-5">
          <div className="hidden w-fit items-center gap-2 rounded-full border border-[#E9CA78]/50 bg-black/20 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#F5D986] lg:inline-flex"><GambiaFlag width={24} height={16} /> Built for The Gambia</div>
          <h2 className="font-display text-xl font-extrabold leading-tight text-white sm:text-2xl lg:text-3xl xl:text-4xl">Welcome back to your business.</h2>
          <p className="hidden max-w-md text-sm leading-6 text-white/85 sm:block sm:text-base">Your customers, daily ledger and inventory are right where you left them. Sign in securely and get back to work.</p>
          <div className="hidden flex-wrap gap-2 pt-1 sm:flex">{["Sales & expenses", "Inventory", "Customer records"].map((label) => <span key={label} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">{label}</span>)}</div>
        </div>
        <p className="relative z-10 mt-4 hidden text-xs text-white/65 lg:block">© {new Date().getFullYear()} Kaira Africa · Your business, clearly managed.</p>
      </section>

      <main className="flex w-full items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-md">
          <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground sm:mb-7"><ShieldCheck className="h-4 w-4 text-primary" /> Secure returning-user sign-in</div>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:mb-6 sm:h-12 sm:w-12"><KeyRound className="h-6 w-6" /></div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{hasRememberedPhone ? "Enter your six-digit PIN to securely continue to your Kaira Africa dashboard." : "Enter your Gambian phone number and six-digit PIN to securely sign in."}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5 sm:mt-7">
            {showPhoneEditor ? (
              <fieldset disabled={submitting} className="space-y-2">
                <legend className="text-sm font-semibold">Gambian phone number</legend>
                <div className="flex min-w-0 overflow-hidden rounded-xl border border-input bg-background shadow-sm transition focus-within:ring-2 focus-within:ring-ring/30">
                  <div className="flex shrink-0 items-center gap-2 border-r border-input bg-muted/70 px-2.5 sm:px-3">
                    <GambiaFlag width={25} height={17} />
                    <span className="text-sm font-semibold text-foreground">+220</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Select value={networkPrefix} onValueChange={(value) => { setNetworkPrefix(value); setError(null); }}>
                      <SelectTrigger aria-label="Mobile network" className="h-9 w-full rounded-none border-0 bg-transparent px-2 text-xs font-semibold shadow-none focus:ring-0 sm:h-10 sm:px-3 sm:text-sm">
                        <SelectValue placeholder="Choose network" />
                      </SelectTrigger>
                      <SelectContent>{NETWORKS.map((network) => <SelectItem key={network.prefix} value={network.prefix}>{network.name}{network.prefix !== "none" ? ` (${network.prefix})` : ""}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="px-2 pb-2 sm:px-3">
                      <Input type="tel" inputMode="numeric" autoComplete="tel-national" value={subscriberNumber} onChange={(event) => { setSubscriberNumber(event.target.value.replace(/\D/g, "").slice(0, 7)); setError(null); }} placeholder="7-digit number" maxLength={7} className="h-9 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 sm:text-lg" aria-label="Seven digit phone number" required />
                    </div>
                  </div>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">Select the network linked to your account. Your number is saved on this device for faster sign-in.</p>
              </fieldset>
            ) : (
              <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Phone number confirmed</p>
                <p className="mt-1 text-lg font-bold tracking-wide text-foreground" data-testid="remembered-pin-phone">{fullPhone}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">You only need your PIN on this device. Your phone number stays saved here for faster, simpler sign-in.</p>
                <Button type="button" variant="link" size="sm" disabled={submitting} onClick={() => { setShowPhoneEditor(true); setPin(""); setError(null); }} className="mt-1 h-auto px-0">Use a different number</Button>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="pin-entry" className="text-sm font-semibold">Six-digit PIN</label>
                <button type="button" onClick={() => setShowPin((value) => !value)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={showPin ? "Hide PIN" : "Show PIN"}>
                  {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{showPin ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative rounded-xl border-2 border-primary/20 bg-card p-2.5 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 sm:p-3">
                <div className="grid h-10 grid-cols-6 gap-2 sm:h-12 sm:gap-2.5" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className={`flex min-w-0 items-center justify-center rounded-lg border transition-colors ${pin.length > index ? "border-primary/40 bg-primary/[0.07]" : "border-border bg-muted/40"}`}>
                      {pin.length > index && (showPin ? <span className="text-base font-bold text-foreground">{pin[index]}</span> : <span className="h-2.5 w-2.5 rounded-full bg-primary sm:h-3 sm:w-3" />)}
                    </div>
                  ))}
                </div>
                <Input ref={pinInputRef} id="pin-entry" type={showPin ? "text" : "password"} inputMode="numeric" autoComplete="current-password" pattern="[0-9]{6}" minLength={6} maxLength={6} value={pin} onChange={(event) => { setPin(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }} onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest", behavior: "smooth" })} className="absolute inset-0 h-full w-full cursor-text opacity-0" aria-label="Six-digit sign-in PIN. Tap to enter digits." required />
                <span className="sr-only" aria-live="polite">{pin.length} of 6 PIN digits entered</span>
              </div>
              <div className="grid grid-cols-6 gap-2 px-1" aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => <div key={index} className={`h-1.5 rounded-full transition-colors ${pin.length > index ? "bg-primary" : "bg-muted"}`} />)}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">On a phone or tablet, tap the PIN field to open your device’s numeric keyboard. Never share your PIN.</p>
            </div>

            {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm leading-5 text-destructive">{error}</p>}

            <div className="min-h-12 rounded-xl border border-primary/10 bg-muted/30 px-4 py-3 text-center" role="status" aria-live="polite">
              {submitting
                ? <span className="font-medium text-primary">Verifying your PIN and signing you in…</span>
                : pin.length === 6
                  ? <span className="font-medium text-primary">Checking your PIN…</span>
                  : <span className="text-sm text-muted-foreground">Enter the sixth digit to sign in automatically. You will not need to press Continue.</span>}
            </div>
          </form>

          <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.04] p-3.5 sm:mt-6 sm:p-4">
            <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-4.5 w-4.5" /></div><div><p className="text-sm font-semibold text-foreground">Your account stays protected</p><p className="mt-1 text-xs leading-5 text-muted-foreground">PIN attempts are rate-limited. If you forget your PIN, use SMS verification to regain access.</p></div></div>
          </div>

          <div className="mt-5 space-y-3 text-center text-sm">
            <p className="text-muted-foreground">Forgot your PIN? <Link href="/login?recovery=1" className="font-semibold text-primary underline-offset-4 hover:underline">Sign in with SMS verification</Link></p>
            <p className="text-muted-foreground">New to Kaira Africa? <Link href="/login?recovery=1" className="font-semibold text-primary underline-offset-4 hover:underline">Create your account</Link></p>
          </div>
          <div className="mt-6 rounded-xl border border-border bg-card p-4 text-sm sm:mt-8">
            <div className="flex items-start gap-2"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="font-semibold text-foreground">Need assistance?</p><p className="mt-1 text-muted-foreground">Our support team can help if you cannot access your account.</p><a href="https://wa.me/220874071510" target="_blank" rel="noreferrer" className="mt-3 inline-flex font-semibold text-primary underline-offset-4 hover:underline">WhatsApp +220 87 407 1510</a></div></div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
