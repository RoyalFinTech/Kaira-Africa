import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { KairaLogo } from '@/components/common/KairaLogo';
import { BRAND } from '@/lib/brand';
import { isUserToken } from '@/lib/api-client';

export default function SplashScreen() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 100));
    }, 250);

    // Navigate after 2.5s
    const timer = setTimeout(() => {
      const onboardingDone = localStorage.getItem('kaira_onboarding_done');

      if (!onboardingDone) {
        setLocation('/onboarding');
      } else if (!isUserToken()) {
        setLocation('/login');
      } else {
        setLocation('/dashboard');
      }
    }, 2500);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [setLocation]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#0D2818] relative overflow-hidden">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent animate-pulse" />

      {/* Logo with glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10"
      >
        <div className="relative">
          <div className="absolute inset-0 blur-2xl opacity-50 bg-secondary" />
          <div className="relative rounded-2xl bg-white p-3 shadow-xl ring-1 ring-white/20">
            <KairaLogo width={180} className="relative" />
          </div>
        </div>
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-6 text-secondary text-sm font-medium tracking-widest uppercase z-10"
      >
        {BRAND.tagline}
      </motion.p>

      {/* Loading bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-sidebar-border/20">
        <motion.div
          className="h-full bg-secondary"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>
    </div>
  );
}
