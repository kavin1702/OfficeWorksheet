// WorkPulse PWA Service Worker for Offline & High Performance
const CACHE_NAME = 'workpulse-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/main.css',
  './css/components.css',
  './css/responsive.css',
  './js/sampleData.js',
  './js/cloudStorage.js',
  './js/worksheetManager.js',
  './js/uiRenderer.js',
  './js/importExport.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only cache GET requests for app assets
  if (e.request.method !== 'GET') return;

  // Do not cache cloud database requests
  if (e.request.url.includes('supabase.co') || e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});
