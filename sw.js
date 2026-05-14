var CACHE = 'raked-wall-v1';

var CORE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Cache core app shell on install
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(CORE); })
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Cache-first for same-origin assets; network-first for CDN/external
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  // For same-origin requests: cache-first, update cache in background
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(CACHE).then(function(c) {
        return c.match(e.request).then(function(cached) {
          var network = fetch(e.request).then(function(res) {
            if (res.ok) c.put(e.request, res.clone());
            return res;
          }).catch(function() { return cached; });
          return cached || network;
        });
      })
    );
    return;
  }

  // For external requests (Google Fonts, Shopify CDN images): cache on first load, serve from cache offline
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdn.shopify.com')) {
    e.respondWith(
      caches.open(CACHE).then(function(c) {
        return c.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(res) {
            if (res.ok) c.put(e.request, res.clone());
            return res;
          });
        });
      })
    );
  }
});
