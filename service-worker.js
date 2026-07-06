// Service worker são: network-first para tudo, cache só como fallback offline.
const CACHE_VERSION = 'finance-v11';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Limpa caches antigos de versões anteriores
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  // Network-first: sempre tenta a rede primeiro; usa cache só se a rede falhar
  event.respondWith((async () => {
    try {
      const fresh = await fetch(event.request);
      // Guarda cópia no cache para fallback offline
      if (event.request.method === 'GET' && fresh.ok) {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(event.request, fresh.clone());
      }
      return fresh;
    } catch (e) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw e;
    }
  })());
});
