const CACHE = 'pasillitos-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
    // Sin skipWaiting: el nuevo SW espera a que todas las pestañas
    // estén cerradas antes de activarse, evitando interrumpir
    // la inicialización de sql.js en mitad de una sesión.
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
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const { hostname } = new URL(e.request.url);

  // Llamadas a la API siempre van a red, nunca a caché
  if (hostname === 'api.anthropic.com' || hostname === 'generativelanguage.googleapis.com') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(c => c.put(e.request, response.clone()));
        }
        return response;
      });
    })
  );
});
