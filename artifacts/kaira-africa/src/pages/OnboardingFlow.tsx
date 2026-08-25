import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { KairaLogo } from '@/components/common/KairaLogo';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import {
  TrendingUp,
  Users,
  UserCheck,
  BarChart3,
  ChevronRight,
  Check,
} from 'lucide-react';

const slides = [
  {
    title: 'Build. Manage. Grow.',
    description: 'The complete business management platform built for African entrepreneurs.',
    bg: 'bg-gradient-to-br from-sidebar via-sidebar/95 to-primary/20',
    pattern: true,
  },
  {
    title: 'Everything Your Business Needs',
    description: 'Powerful tools to manage every aspect of your business in one place.',
    features: [
      { icon: BarChart3, label: 'Analytics' },
      { icon: Users, label: 'Team Management' },
      { icon: UserCheck, label: 'Customer Relations' },
      { icon: TrendingUp, label: 'Financial Visibility' },
    ],
  },
  {
    title: 'Built for Africa',
    description: 'Designed specifically for African markets, currencies, and business practices.',
    bg: 'bg-gradient-to-br from-primary via-primary/90 to-secondary/20',
    showMap: true,
  },
  {
    title: 'Your Business. One Powerful Platform.',
    description: 'Join thousands of African businesses already growing with Kaira.',
    cta: true,
  },
];

export default function OnboardingFlow() {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('kaira_onboarding_done', 'true');
    setLocation('/login');
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col relative overflow-hidden">
      {/* Skip Button */}
      <div className="absolute top-6 right-6 z-20">
        <Button variant="ghost" onClick={handleSkip} className="text-foreground/70">
          Skip
        </Button>
      </div>

      {/* Slide Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-4xl"
          >
            {currentSlide === 0 && (
              <div className={`${slide.bg} rounded-3xl p-12 md:p-16 text-center relative overflow-hidden`}>
                {/* African pattern SVG background */}
                <div className="absolute inset-0 opacity-10">
                  <svg className="w-full h-full" viewBox="0 0 400 400">
                    <pattern id="pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                      <polygon points="40,0 80,40 40,80 0,40" fill="currentColor" />
                      <circle cx="40" cy="40" r="15" fill="currentColor" />
                    </pattern>
                    <rect width="400" height="400" fill="url(#pattern)" />
                  </svg>
                </div>
                <div className="relative z-10">
                  <KairaLogo width={200} className="mx-auto mb-8 brightness-0 invert" />
                  <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-4">
                    {slide.title}
                  </h1>
                  <p className="text-xl text-secondary max-w-2xl mx-auto">
                    {slide.description}
                  </p>
                </div>
              </div>
            )}

            {currentSlide === 1 && slide.features && (
              <div className="text-center">
                <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
                  {slide.title}
                </h1>
                <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
                  {slide.description}
                </p>
                <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
                  {slide.features.map((feature, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <p className="font-semibold text-foreground">{feature.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {currentSlide === 2 && (
              <div className={`${slide.bg} rounded-3xl p-12 md:p-16 text-center relative overflow-hidden`}>
                {/* Simple Africa outline SVG */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <svg width="300" height="400" viewBox="0 0 300 400" className="text-secondary">
                    <path
                      d="M150 50 L180 80 L200 120 L210 160 L200 200 L180 240 L160 280 L140 320 L120 340 L100 330 L80 300 L70 260 L60 220 L50 180 L60 140 L80 100 L100 70 L130 50 Z"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div className="relative z-10">
                  <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
                    {slide.title}
                  </h1>
                  <p className="text-xl text-secondary/90 max-w-2xl mx-auto">
                    {slide.description}
                  </p>
                </div>
              </div>
            )}

            {currentSlide === 3 && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Check className="h-10 w-10 text-primary" />
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
                  {slide.title}
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  {slide.description}
                </p>
                <div className="space-y-3 max-w-sm mx-auto">
                  <Button onClick={handleComplete} size="lg" className="w-full">
                    Get Started
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button onClick={() => setLocation('/login')} variant="ghost" size="lg" className="w-full">
                    Already have an account? Sign in
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Dots + Next Button */}
      <div className="pb-8 px-6 flex items-center justify-between max-w-4xl mx-auto w-full">
        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === currentSlide
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
        {!isLastSlide && (
          <Button onClick={handleNext} size="lg">
            Next
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
