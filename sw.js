// Service Worker di CrudoCamera: abilita l'uso offline della PWA.
// Strategia: "cache-first" per gli asset dell'app (guscio applicativo).
// Aggiornato a v40 per garantire la definitiva sincronizzazione hardware del flash.
const CACHE_NAME = 'crudocamera-v40';

// File che compongono il "guscio" dell'app da rendere disponibili offline.
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './shutter.ogg',
  './icon-192.png',
  './icon-512.png'
];

// Installazione: pre-carica il guscio applicativo in cache.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Attivazione: rimuove le cache vecchie di versioni precedenti.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: prova prima la cache; se manca, va in rete e salva se GET.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
