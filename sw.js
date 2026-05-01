const CACHE = 'pasillitos-v6';
const PRECACHE = [
  './manifest.json',
  './icons/icon_192.png',
  './icons/icon_512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  // Solo elimina cachés de versiones anteriores. No toca IndexedDB.
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
      ))
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // API calls siempre van a red
  if (url.hostname === 'api.anthropic.com' || url.hostname === 'generativelanguage.googleapis.com') return;

  // index.html: network-first para recibir siempre la versión más reciente
  if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Resto: cache-first (CDN libs, iconos, manifest)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
