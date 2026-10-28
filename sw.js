/* Motan Player v10.3 — tab spacing and effect rack spacing polish. Audio blobs stay in IndexedDB. */
'use strict';
const CACHE_NAME = 'motan-player-v10.3-tab-effects-spacing-shell';
const SHELL_ASSETS = [
  './', './index.html', './manifest.json', './theme-template.css',
  './img/icon-192.png', './img/icon-512.png'
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
    await Promise.all(SHELL_ASSETS.map(async url => {
      try { const response = await fetch(url, { cache: 'reload' }); if (response.ok) await cache.put(url, response); }
      catch (error) { console.warn('[Motan SW] Shell asset could not be cached:', url, error); }
    }));
    await Promise.all(OPTIONAL_ASSETS.map(async url => {
      try {
        const response = await fetch(url, { mode: 'no-cors', cache: 'reload' });
        if (response && (response.ok || response.type === 'opaque')) await cache.put(url, response);
      } catch (_) { /* Optional dependency: offline audio playback still works. */ }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('motan-player-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    // Cache only explicitly optional dependencies; never cache arbitrary third-party media.
    if (OPTIONAL_ASSETS.includes(request.url)) {
      event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        try { const response = await fetch(request); if (response && (response.ok || response.type === 'opaque')) await cache.put(request, response.clone()); return response; }
        catch (error) { throw error; }
      })());
    }
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put('./index.html', response.clone()).catch(() => {});
        return response;
      } catch (_) {
        return (await cache.match(request)) || (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const update = fetch(request).then(response => {
      if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    }).catch(() => null);
    if (cached) { event.waitUntil(update); return cached; }
    const fresh = await update;
    if (fresh) return fresh;
    return Response.error();
  })());
});
