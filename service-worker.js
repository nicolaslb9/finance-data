// KILL SWITCH — this SW unregisters itself and clears all caches, then stops controlling.
// This forces every client to fetch fresh code directly from the network (no stale cache).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll();
    clients.forEach(c => c.navigate(c.url));
  })());
});
// Pass-through fetch: always go to network, never serve from cache.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => new Response('', {status: 504})));
});
