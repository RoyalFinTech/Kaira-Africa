import { useEffect, useState } from 'react';
import { Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIos(ios);
    setDismissed(sessionStorage.getItem('kaira_install_prompt_dismissed') === '1');

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setIsStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const close = () => {
    setDismissed(true);
    sessionStorage.setItem('kaira_install_prompt_dismissed', '1');
  };

  const install = async () => {
    if (!installEvent) {
      if (isIos) setShowIosHelp(true);
      return;
    }
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  if (isStandalone || dismissed || (!installEvent && !isIos)) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[180] mx-auto flex w-auto max-w-xl items-center gap-3 rounded-2xl border border-[#D8B45A]/40 bg-[#0D2818] p-3.5 text-white shadow-2xl sm:inset-x-5 sm:bottom-5 sm:p-4" aria-label="Install Kaira Africa">
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1.5">
        <img src="/kaira-logo.png" alt="" className="h-full w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Install Kaira Africa</p>
        <p className="mt-0.5 text-xs leading-5 text-white/75">Add Kaira to your device for a faster, app-like experience.</p>
      </div>
      <Button size="sm" onClick={install} className="shrink-0 bg-[#D8B45A] text-[#172719] hover:bg-[#edcf7c]">
        {isIos && !installEvent ? <><Share className="mr-1.5 h-3.5 w-3.5" /> How</> : 'Install'}
      </Button>
      <button type="button" onClick={close} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label="Dismiss install suggestion">
        <X className="h-4 w-4" />
      </button>
      {showIosHelp && (
        <div className="absolute bottom-[calc(100%+0.6rem)] left-0 right-0 rounded-xl border border-border bg-background p-4 text-foreground shadow-xl">
          <p className="text-sm font-bold">Add Kaira to your Home Screen</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">In Safari, tap the Share icon, then choose “Add to Home Screen”. Open Kaira from its new icon.</p>
          <button type="button" onClick={() => setShowIosHelp(false)} className="mt-2 text-xs font-semibold text-primary">Got it</button>
        </div>
      )}
    </aside>
  );
}