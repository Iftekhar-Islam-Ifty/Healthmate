const CACHE_NAME = 'healthmate-v8-latest';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/medicines.html',
  '/routine.html',
  '/records.html',
  '/appointments.html',
  '/documents.html',
  '/settings.html',
  '/register.html',
  '/report.html',
  '/css/style.css',
  '/js/supabase-config.js',
  '/js/supabase.js',
  '/js/store.js',
  '/js/app.js',
  '/js/records.js',
  '/js/medicines.js',
  '/js/routine.js',
  '/js/appointments.js',
  '/js/documents.js',
  '/js/ai-assistant.js',
  '/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW cache prefetch note:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Don't intercept API endpoints
  if (url.pathname.startsWith('/api/')) return;

  // Network-First with cache fallback
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
