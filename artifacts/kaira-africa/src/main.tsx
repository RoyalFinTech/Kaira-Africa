import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

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
createRoot(document.getElementById('root')!).render(<App />);
