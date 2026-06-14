var CACHE = 'raked-wall-v8';

var scope = self.registration.scope;
var CORE = [
  scope,
  scope + 'index.html',
  scope + 'manifest.json',
  scope + 'icons/icon-192.png',
  scope + 'icons/icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(CORE); })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(CACHE).then(function(c) {
        // Navigation requests: serve cache immediately, no network wait
        if (e.request.mode === 'navigate') {
          return c.match(e.request).then(function(cached) {
            if (cached) return cached;
            // Fallback to index.html shell for any navigation miss
            return c.match(scope + 'index.html').then(function(shell) {
              return shell || fetch(e.request);
            });
          });
        }
        // Sub-resources: cache-first, update in background
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

  // External: Google Fonts + Shopify CDN — cache on first load
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
