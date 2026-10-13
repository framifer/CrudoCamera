// Service Worker di CrudoCamera: abilita l'uso offline della PWA.
// Strategia: "cache-first" per gli asset dell'app (guscio applicativo).
// Aggiornato a v22 per forzare il download del nuovo app.js con flash sincronizzato.

const CACHE_NAME = 'crudocamera-v22';

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

// Installazione: pre-carica il guscio applicativo in cache e forza l'attivazione immediata
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Attivazione: rimuove le cache vecchie (inclusa la v21) e prende subito il controllo
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

// Fetch: serve prima dalla cache, poi dalla rete aggiornando la cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // Salva in cache solo risposte valide e dello stesso origine
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // Offline e non in cache: per le navigazioni, torna alla home
          if (req.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
