import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { KairaLogo } from '@/components/common/KairaLogo';
import { BRAND } from '@/lib/brand';
import { isUserToken } from '@/lib/api-client';

const SPLASH_DURATION_MS = 9_000;
const NAVIGATION_DELAY_MS = 9_400;

export default function SplashScreen() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Preparing your workspace');
  const [splashStartedAt, setSplashStartedAt] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    setSplashStartedAt(startedAt);

    // The progress reflects elapsed time rather than jumping in arbitrary steps.
    // It reaches 100% before the route changes, leaving a short finish beat.
    const progressInterval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(100, (elapsed / SPLASH_DURATION_MS) * 100));

      if (elapsed < 3_000) {
        setLoadingMessage('Preparing your workspace');
      } else if (elapsed < 6_500) {
        setLoadingMessage('Loading your business tools');
      } else {
        setLoadingMessage('Almost ready');
      }
    }, 60);

    const timer = window.setTimeout(() => {
      setProgress(100);
      const onboardingDone = localStorage.getItem('kaira_onboarding_done');

      if (!onboardingDone) {
        // Gate the onboarding route so a direct refresh on /onboarding
        // returns through the splash rather than skipping the brand intro.
        sessionStorage.setItem('kaira_splash_complete', '1');
        setLocation('/onboarding');
      } else if (!isUserToken()) {
        setLocation('/login');
      } else {
        setLocation('/dashboard');
      }
    }, NAVIGATION_DELAY_MS);

    return () => {
      window.clearInterval(progressInterval);
      window.clearTimeout(timer);
    };
  }, [setLocation]);

  return (
    <main className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#0D2818] relative overflow-hidden px-6">
      {/* Layered Kaira green-and-gold atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(36,116,75,0.58),transparent_55%),radial-gradient(ellipse_at_85%_80%,rgba(216,180,90,0.13),transparent_42%)]" />
      <div className="absolute inset-0 opacity-[0.08]">
        <svg className="h-full w-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <pattern id="kaira-splash-pattern" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M32 0L64 32L32 64L0 32Z" fill="none" stroke="#D8B45A" strokeWidth="1" />
              <circle cx="32" cy="32" r="3" fill="#D8B45A" />
            </pattern>
          </defs>
          <rect width="400" height="400" fill="url(#kaira-splash-pattern)" />
        </svg>
      </div>

      {/* Use the static public logo URL so the brand does not depend on bundler asset imports. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10"
      >
        <div className="relative rounded-2xl bg-white p-3 shadow-[0_0_70px_rgba(216,180,90,0.22)] ring-1 ring-white/30">
          <KairaLogo width={220} height={220} className="relative" />
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.25 }}
        className="relative z-10 mt-7 text-center text-sm sm:text-base font-semibold tracking-[0.18em] uppercase text-[#D8B45A]"
      >
        {BRAND.tagline}
      </motion.p>

      <div className="relative z-10 mt-12 w-full max-w-xs">
        <div className="mb-3 flex items-center justify-between gap-4">
          <motion.p
            key={loadingMessage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-white/85"
            aria-live="polite"
          >
            {loadingMessage}
          </motion.p>
          <span className="text-xs tabular-nums text-white/60">{Math.round(progress)}%</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-label="Preparing Kaira Africa"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          data-splash-started-at={splashStartedAt || ''}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#197442] via-[#2b9a5a] to-[#D8B45A]"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.08, ease: 'linear' }}
          />
        </div>
        <div className="mt-4 flex items-center justify-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="h-1.5 w-1.5 rounded-full bg-[#D8B45A]"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: dot * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>

      <p className="absolute bottom-7 z-10 text-[10px] font-medium tracking-[0.28em] text-white/35">
        BUILT FOR AFRICAN BUSINESS
      </p>
    </main>
  );
}
