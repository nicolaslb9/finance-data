// Bump this version to force all clients to update immediately
const CACHE_VERSION = 'finance-v9';

self.addEventListener('install', e => {
  // Skip waiting so new SW activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete ALL old caches on activate
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never intercept: GitHub API, data.json, external APIs
  if (url.includes('api.github.com') ||
      url.includes('data.json') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com')) {
    return; // pass through to network
  }

  // For app HTML, app.js, styles.css — network first, cache fallback (always fresh code)
  if (e.request.mode === 'navigate' || url.endsWith('index.html') || url.endsWith('/') ||
      url.includes('app.js') || url.includes('charts.js') || url.includes('github.js') || url.includes('sinking.js') || url.includes('render.js') || url.includes('budget.js') || url.includes('savings.js') || url.includes('styles.css')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Cache the fresh version for offline use
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // offline fallback
    );
    return;
  }

  // For everything else (JS libs, icons) — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
