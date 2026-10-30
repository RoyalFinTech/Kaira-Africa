import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
import { clearToken, isUserToken } from '@/lib/api-client';

// Apply the saved theme before React paints the first screen, so the preference
// works on direct links/reloads and not only after visiting Settings.
function applySavedTheme() {
  let preference: 'light' | 'dark' | 'system' = 'system';
  try {
    const saved = window.localStorage.getItem('kaira-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') preference = saved;
  } catch {
    // Use system preference if browser storage is unavailable.
  }
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    let current: 'light' | 'dark' | 'system' = 'system';
    try {
      const saved = window.localStorage.getItem('kaira-theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') current = saved;
    } catch {
      // Keep the system fallback.
    }
    const dark = current === 'dark' || (current === 'system' && media.matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  };

  // Set immediately using the resolved preference.
  const dark = preference === 'dark' || (preference === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  media.addEventListener('change', apply);
  window.addEventListener('storage', apply);
}

applySavedTheme();

// A stored user token is not enough to unlock a returning session after a full
// page load. Keep the remembered phone number, discard the browser-held token,
// and require the user to obtain a fresh server session with their PIN or SMS.
if (isUserToken()) clearToken();

// Register the PWA worker only on secure origins (HTTPS or localhost).
if ('serviceWorker' in navigator && (window.isSecureContext || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch((error) => {
      // The web app remains fully usable when service workers are unavailable.
      console.warn('Kaira Africa could not register its offline app shell.', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
