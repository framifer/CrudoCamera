// Service Worker di CrudoCamera: abilita l'uso offline della PWA.
// Strategia: "Cache First, then Network" per gli asset dell'app.

// NOTA PER LO SVILUPPATORE:
// Per forzare l'aggiornamento dell'app dopo una modifica,
// incrementa il numero di versione qui sotto (es. da 'v1' a 'v2').
const CACHE_VERSION = 'v1'; // Inizia da v1 e incrementa quando aggiorni i file
const CACHE_NAME = `crudocamera-${CACHE_VERSION}`;

// File che compongono il "guscio" dell'app da rendere disponibili offline.
const APP_SHELL = [
  './', // Alias per index.html
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './shutter.ogg',
  './icon-192.png',
  './icon-512.png'
];

// Fase di installazione: il Service Worker viene registrato.
// Mettiamo in cache tutti i file essenziali dell'app.
self.addEventListener('install', (event) => {
  console.log('[SW] Installazione...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching dell\'App Shell');
        return cache.addAll(APP_SHELL);
      })
  );
  // Forza il nuovo Service Worker a diventare attivo immediatamente.
  self.skipWaiting();
});

// Fase di attivazione: il nuovo Service Worker prende il controllo.
// Qui eliminiamo le vecchie cache non più necessarie.
self.addEventListener('activate', (event) => {
  console.log('[SW] Attivazione...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        // Filtra e rimuovi tutte le cache che non corrispondono a quella attuale.
        keys
          .filter((key) => key !== CACHE_NAME && key.startsWith('crudocamera-'))
          .map((key) => {
            console.log(`[SW] Rimozione vecchia cache: ${key}`);
            return caches.delete(key);
          })
      )
    )
  );
  // Permette al SW attivo di controllare subito i client aperti.
  self.clients.claim();
});

// Fase di fetch: intercetta tutte le richieste di rete.
// Questa funzione è stata riscritta con async/await per maggiore leggibilità.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignoriamo le richieste che non sono di tipo GET (es. POST).
  if (req.method !== 'GET') {
    return;
  }

  // La funzione asincrona che gestisce la richiesta.
  const handleRequest = async () => {
    // 1. Prova a trovare la risorsa nella cache.
    const cachedResponse = await caches.match(req);
    if (cachedResponse) {
      // Se trovata, restituiscila subito (velocità massima e supporto offline).
      return cachedResponse;
    }

    // 2. Se non è in cache, prova a recuperarla dalla rete.
    try {
      const networkResponse = await fetch(req);

      // Se la richiesta di rete va a buon fine, la mettiamo in cache per il futuro.
      // Controlliamo che la risposta sia valida prima di salvarla.
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        // Usiamo clone() perché una risposta può essere letta una sola volta.
        await cache.put(req, networkResponse.clone());
      }

      return networkResponse;
    } catch (error) {
      // 3. Se la rete fallisce (l'utente è offline) e la risorsa non era in cache...
      console.error('[SW] Fetch fallito; utente offline o errore di rete.', error);

      // ...come ultima spiaggia, se si stava navigando verso una pagina,
      // restituiamo la pagina principale dell'app (index.html) dalla cache.
      if (req.mode === 'navigate') {
        return caches.match('./index.html');
      }

      // Per altre richieste (es. immagini non in cache), l'errore del browser è appropriato.
      return;
    }
  };

  event.respondWith(handleRequest());
});
