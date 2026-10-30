const CACHE_NAME = 'kaira-africa-shell-v1';
const scopeUrl = new URL(self.registration.scope);
const APP_ROOT = scopeUrl.pathname;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      APP_ROOT,
      new URL('manifest.webmanifest', scopeUrl).pathname,
      new URL('kaira-logo.png', scopeUrl).pathname
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('kaira-africa-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache authenticated API responses, financial records, or user data.
  if (url.pathname.includes('/api/')) return;
  if (!url.pathname.startsWith(APP_ROOT)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(APP_ROOT, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match(APP_ROOT));
      }
    })());
    return;
  }

  // Cache immutable-looking same-origin app assets only; never cache API data.
  if (/\.(?:js|css|svg|png|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw new Error('Kaira Africa asset is unavailable offline.');
      }
    })());
  }
});