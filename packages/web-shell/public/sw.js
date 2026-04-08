// Service worker for installability without pinning navigation to a stale index.html.
// Navigation uses network-first so deployments and local dev do not get stuck on an old shell.

const CACHE_NAME = 'volt-shell-v2';
const INDEX_PATH = '/index.html';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET' || request.mode !== 'navigate') {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    try {
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(INDEX_PATH, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(INDEX_PATH);
      if (cached) {
        return cached;
      }
      throw error;
    }
  })());
});
