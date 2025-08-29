// Simple Service Worker for caching (optional for now)
const CACHE_NAME = 'stockest-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        // Only cache files that exist and are accessible
        return cache.addAll(urlsToCache.filter(url => {
          // Don't cache dynamic JS/CSS bundles that may not exist yet
          return !url.includes('/static/');
        }));
      })
      .catch(function(error) {
        console.log('Cache installation failed:', error);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});
