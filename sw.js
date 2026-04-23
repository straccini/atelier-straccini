/* Atelier Sinestetico — Service Worker
 * v1.0 · cache della shell, fallback offline, network-first per i dati
 */
const VERSION   = 'atelier-v7-1.0.0';
const SHELL     = 'shell-' + VERSION;
const RUNTIME   = 'runtime-' + VERSION;

// Risorse della shell precachiate al primo install
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Domini per cui usare strategia "stale-while-revalidate" (font, leaflet)
const SWR_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'basemaps.cartocdn.com',
  'a.basemaps.cartocdn.com',
  'b.basemaps.cartocdn.com',
  'c.basemaps.cartocdn.com',
  'd.basemaps.cartocdn.com',
  'api.qrserver.com'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) =>
      c.addAll(SHELL_ASSETS).catch(() => {/* alcune icone potrebbero mancare */})
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. Google Apps Script (dati live): network-only — niente cache
  if (url.hostname === 'script.google.com' || url.hostname.endsWith('.googleusercontent.com')) {
    return; // lascia gestire al browser
  }

  // 2. Navigazioni HTML: network-first, fallback alla shell offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3. CDN noti: stale-while-revalidate
  if (SWR_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // 4. Stesso origin: cache-first con fallback rete
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached))
    );
  }
});

function staleWhileRevalidate(req) {
  return caches.open(RUNTIME).then((cache) =>
    cache.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
}

// Permetti al client di chiedere skipWaiting su nuova versione
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
