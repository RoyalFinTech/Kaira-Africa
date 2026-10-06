import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MessageSquare, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { KairaLogo } from '@/components/common/KairaLogo';
import { Button } from '@/components/ui/button';
import { useVerifyOtp, useRequestOtp } from '@workspace/api-client-react';
import { setToken } from '@/lib/api-client';

// Render builds the frontend as a production bundle even while the backend is in development mode.
// This explicit flag keeps the development OTP visible during the current testing phase.
const IS_DEV = import.meta.env.VITE_AUTH_DEV_MODE === 'true';
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

type OTPStatus = 'idle' | 'verifying' | 'success' | 'error' | 'expired';

export default function OTPPage() {
  const [, setLocation] = useLocation();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [status, setStatus] = useState<OTPStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [devOTP, setDevOTP] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phone = sessionStorage.getItem('kaira_pending_phone') || '+220 XXX XXXX';

  // Load dev OTP only in dev mode — populated by PhoneAuthPage from
  // the real backend response (RequestOtpResponse.devOtp), never
  // fabricated client-side.
  useEffect(() => {
    if (IS_DEV) {
      setDevOTP(sessionStorage.getItem('kaira_dev_otp'));
    }
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const verifyOtp = useVerifyOtp();
  const requestOtp = useRequestOtp();

  const verifyOTP = useCallback((code: string) => {
    setStatus('verifying');
    setErrorMessage(null);

    verifyOtp.mutate(
      { data: { phoneNumber: phone, code } },
      {
        onSuccess: (result) => {
          setStatus('success');
          setToken(result.token);
          setTimeout(() => {
            if (!result.user.firstName) {
              // New user, or an existing one who never finished
              // naming themselves — Full Name screen.
              setLocation('/login/name');
            } else if (!result.user.businessId) {
              // Has a name but no business yet — business onboarding.
              setLocation('/business-onboarding');
            } else {
              setLocation('/dashboard');
            }
          }, 900);
        },
        onError: (error) => {
          setStatus('error');
          setErrorMessage(error.message);
          setTimeout(() => {
            setDigits(Array(OTP_LENGTH).fill(''));
            setStatus('idle');
            inputRefs.current[0]?.focus();
          }, 1500);
        },
      },
    );
  }, [phone, setLocation, verifyOtp]);

  const handleDigitChange = (index: number, value: string) => {
    if (status === 'verifying' || status === 'success') return;

    // Handle paste
    if (value.length > 1) {
      const pastedDigits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      const newDigits = Array(OTP_LENGTH).fill('');
      pastedDigits.split('').forEach((d, i) => { newDigits[i] = d; });
      setDigits(newDigits);
      const focusIndex = Math.min(pastedDigits.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      if (pastedDigits.length === OTP_LENGTH) {
        verifyOTP(pastedDigits);
      }
      return;
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when complete
    const complete = newDigits.join('');
    if (complete.length === OTP_LENGTH && !newDigits.includes('')) {
      verifyOTP(complete);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setDigits(Array(OTP_LENGTH).fill(''));
    setStatus('idle');
    setErrorMessage(null);
    setCountdown(RESEND_COOLDOWN);
    setCanResend(false);
    inputRefs.current[0]?.focus();

    requestOtp.mutate(
      { data: { phoneNumber: phone } },
      {
        onSuccess: (data) => {
          if (IS_DEV && data.devOtp) {
            sessionStorage.setItem('kaira_dev_otp', data.devOtp);
            setDevOTP(data.devOtp);
          }
        },
        onError: (error) => {
          setErrorMessage(error.message);
        },
      },
    );
  };

  const statusColor = {
    idle: 'border-input',
    verifying: 'border-primary',
    success: 'border-green-500',
    error: 'border-destructive',
    expired: 'border-muted',
  }[status];

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        {/* Back button */}
        <button
          onClick={() => setLocation('/login')}
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
        <div className="flex items-center gap-2 mb-8">
          <div className="flex gap-1.5">
            <div className="h-1.5 w-8 rounded-full bg-primary/40" />
            <div className="h-1.5 w-8 rounded-full bg-primary" />
            <div className="h-1.5 w-8 rounded-full bg-muted" />
          </div>
          <span className="text-xs text-muted-foreground ml-1">Step 2 of 3</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Verify your phone
          </h1>
          <p className="text-muted-foreground text-sm mb-2">
            We sent a 6-digit code to
          </p>
          <p className="font-semibold text-foreground text-sm mb-8">
            {phone}
          </p>

          {/* ── DEV MODE OTP Banner ─────────────────────────────────────── */}
          {IS_DEV && devOTP && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/30"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                    Dev Mode Only — Never shown in production
                  </p>
                  <p className="text-sm font-mono font-bold text-amber-900 dark:text-amber-300 mt-1 tracking-widest">
                    OTP: {devOTP}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── OTP Input Boxes ─────────────────────────────────────────── */}
          <div className="flex gap-3 mb-6 justify-center">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                value={digit}
                disabled={status === 'verifying' || status === 'success'}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className={[
                  'w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background transition-all outline-none',
                  'focus:border-primary focus:ring-2 focus:ring-primary/20',
                  statusColor,
                  status === 'success' ? 'bg-green-50 dark:bg-green-950/20' : '',
                  status === 'error' ? 'bg-red-50 dark:bg-red-950/20 animate-shake' : '',
                ].join(' ')}
                aria-label={`OTP digit ${i + 1}`}
              />
            ))}
          </div>

          {/* ── Status Messages ─────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {status === 'verifying' && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4"
              >
                <span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                Verifying…
              </motion.div>
            )}
            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 mb-4"
              >
                <CheckCircle2 className="h-4 w-4" />
                Verified! Continuing…
              </motion.div>
            )}
            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 text-sm text-destructive mb-4"
              >
                <XCircle className="h-4 w-4" />
                {errorMessage || 'Invalid code. Please try again.'}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Resend ─────────────────────────────────────────────────── */}
          <div className="text-center text-sm text-muted-foreground">
            Didn't receive the code?{' '}
            {canResend ? (
              <button
                onClick={handleResend}
                className="text-primary font-medium hover:underline transition-colors"
              >
                Resend code
              </button>
            ) : (
              <span className="text-muted-foreground/60">
                Resend in {countdown}s
              </span>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Wrong number?{' '}
            <button
              onClick={() => setLocation('/login')}
              className="text-primary hover:underline"
            >
              Change it
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
