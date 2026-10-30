import { useEffect, useState } from 'react';
import { Share, X, Smartphone, MonitorDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type InstallPlatform = 'ios' | 'android' | 'desktop' | 'other';

function detectInstallPlatform(): InstallPlatform {
  const ua = window.navigator.userAgent;
  const platform = window.navigator.platform || '';
  const isIos = /iphone|ipad|ipod/i.test(ua) ||
    (platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  if (isIos) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (window.matchMedia('(pointer: coarse)').matches) return 'other';
  return 'desktop';
}

function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [platform, setPlatform] = useState<InstallPlatform>('other');
  const [showHelp, setShowHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setIsStandalone(isAppInstalled());
    setPlatform(detectInstallPlatform());
    try {
      setDismissed(sessionStorage.getItem('kaira_install_prompt_dismissed') === '1');
    } catch {
      // Keep the install suggestion visible if storage is restricted.
    }

    const onBeforeInstall = (event: Event) => {
      // Keep the browser's native install prompt until the user taps Install.
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setIsStandalone(true);
      setShowHelp(false);
      setDismissed(true);
    };
    const onDisplayModeChange = () => setIsStandalone(isAppInstalled());

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    const displayMode = window.matchMedia('(display-mode: standalone)');
    displayMode.addEventListener?.('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      displayMode.removeEventListener?.('change', onDisplayModeChange);
    };
  }, []);

  const close = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('kaira_install_prompt_dismissed', '1');
    } catch {
      // Dismiss for this mounted session even when storage is unavailable.
    }
  };

  const install = async () => {
    if (installEvent) {
      try {
        await installEvent.prompt();
        const choice = await installEvent.userChoice;
        if (choice.outcome === 'accepted') setDismissed(true);
      } finally {
        setInstallEvent(null);
      }
      return;
    }
    // iOS and browsers that do not expose beforeinstallprompt require
    // their browser's own Share/Menu action; a site cannot open that UI.
    setShowHelp(true);
  };

  const mobile = platform !== 'desktop';
  if (isStandalone || dismissed || (!mobile && !installEvent)) return null;

  const helpTitle = platform === 'ios'
    ? 'Add Kaira to your Home Screen'
    : platform === 'android'
      ? 'Install Kaira on Android'
      : 'Install Kaira on your device';
  const helpSteps = platform === 'ios'
    ? 'In Safari, tap Share, choose “Add to Home Screen”, then tap Add. Open Kaira using the new Home Screen icon.'
    : platform === 'android'
      ? 'In Chrome, open the ⋮ menu and choose “Install app” or “Add to Home screen”. In Samsung Internet, open the menu and choose “Add page to” → “Home screen”.'
      : 'Open your browser menu and choose “Install Kaira Africa” or “Install app” / “Add to Home Screen”, if offered.';

  return (
    <aside
      className={mobile
        ? 'fixed inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5rem)] z-[180] mx-auto flex w-auto max-w-xl items-center gap-3 rounded-2xl border border-[#D8B45A]/50 bg-[#0D2818] p-3.5 text-white shadow-2xl sm:inset-x-5 sm:bottom-5 sm:p-4'
        : 'fixed right-5 top-1/2 z-[180] flex w-[min(22rem,calc(100vw-2.5rem))] -translate-y-1/2 items-center gap-3 rounded-2xl border border-[#D8B45A]/50 bg-[#0D2818] p-4 text-white shadow-2xl'}
      aria-label="Install Kaira Africa"
      data-testid="kaira-install-prompt"
    >
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1.5">
        <img src="/kaira-logo.png" alt="Kaira Africa" className="h-full w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Install Kaira Africa</p>
        <p className="mt-0.5 text-xs leading-5 text-white/75">
          {installEvent
            ? 'Add Kaira to your device for a faster app-like experience.'
            : mobile
              ? 'Get the Kaira app on your Home Screen for quick access.'
              : 'Install Kaira for a faster, app-like experience.'}
        </p>
      </div>
      <Button
        size="sm"
        onClick={install}
        className="shrink-0 bg-[#D8B45A] text-[#172719] hover:bg-[#edcf7c]"
        data-testid="kaira-install-action"
      >
        {installEvent
          ? 'Install'
          : platform === 'ios'
            ? <><Share className="mr-1.5 h-3.5 w-3.5" /> How</>
            : <><Smartphone className="mr-1.5 h-3.5 w-3.5" /> How</>}
      </Button>
      <button
        type="button"
        onClick={close}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        aria-label="Dismiss install suggestion"
      >
        <X className="h-4 w-4" />
      </button>
      {showHelp && (
        <div
          className={mobile
            ? 'absolute bottom-[calc(100%+0.65rem)] left-0 right-0 rounded-xl border border-border bg-background p-4 text-foreground shadow-xl'
            : 'absolute right-0 top-[calc(100%+0.65rem)] w-full rounded-xl border border-border bg-background p-4 text-foreground shadow-xl'}
          role="dialog"
          aria-label={helpTitle}
        >
          <p className="flex items-center gap-2 text-sm font-bold">
            <MonitorDown className="h-4 w-4" /> {helpTitle}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{helpSteps}</p>
          <button type="button" onClick={() => setShowHelp(false)} className="mt-2 text-xs font-semibold text-primary">Got it</button>
        </div>
      )}
    </aside>
  );
}
