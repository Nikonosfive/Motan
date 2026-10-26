const CACHE_NAME = 'motan-player-v9.0-shell-cache';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './theme-template.css',
  './img/icon-192.png',
  './img/icon-512.png'
];
const OPTIONAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js',
  'https://cdn.jsdelivr.net/npm/jsmediatags@3.9.5/dist/jsmediatags.min.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Orbitron:wght@500&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Do not make installation fail just because an optional CDN is unavailable.
    await cache.addAll(SHELL_ASSETS);
    await Promise.all(OPTIONAL_ASSETS.map(async url => {
      try { const response = await fetch(url, { mode: 'no-cors' }); if (response && (response.ok || response.type === 'opaque')) await cache.put(url, response); } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('motan-player-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'REFRESH_INDEX') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      try { await cache.delete('./index.html'); } catch (_) {}
      try { const response = await fetch('./index.html', { cache: 'reload' }); if (response.ok) await cache.put('./index.html', response); } catch (_) {}
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Never intercept audio blobs, IndexedDB, or cross-origin requests other than cached CDN assets.
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !OPTIONAL_ASSETS.some(item => item.startsWith(url.origin))) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE_NAME)).put('./index.html', response.clone());
        return response;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && (response.ok || response.type === 'opaque')) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});
