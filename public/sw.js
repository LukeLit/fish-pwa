/**
 * Service Worker for PWA offline support
 * Includes blob asset caching for fast texture loading
 */
const CACHE_NAME = 'fish-odyssey-v2';
const ASSET_CACHE_NAME = 'fish-odyssey-assets-v1';

const urlsToCache = [
  '/',
  '/game',
  '/tech-tree',
  '/manifest.json',
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

// Fetch event - serve from cache with smart caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Check if this is a blob storage request (Vercel Blob)
  const isBlobAsset = url.hostname.includes('blob.vercel-storage.com') ||
    url.hostname.includes('public.blob.vercel-storage.com');

  // Check if this is an image request
  const isImage = event.request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);

  if (isBlobAsset || (isImage && url.pathname.includes('/assets/'))) {
    // Cache-first strategy for blob assets and images
    event.respondWith(
      caches.open(ASSET_CACHE_NAME).then(async (cache) => {
        // Strip query params for cache key (allows caching regardless of cache busters)
        const cacheUrl = url.origin + url.pathname;
        const cacheRequest = new Request(cacheUrl);

        const cachedResponse = await cache.match(cacheRequest);
        if (cachedResponse) {
          // Return cached version immediately
          return cachedResponse;
        }

        // Not in cache, fetch from network
        try {
          const networkResponse = await fetch(event.request);

          // Only cache successful responses
          if (networkResponse.ok) {
            // Clone the response before caching
            const responseToCache = networkResponse.clone();
            cache.put(cacheRequest, responseToCache);
          }

          return networkResponse;
        } catch (error) {
          // Network failed, return error
          console.error('[SW] Failed to fetch asset:', url.href, error);
          return new Response('Asset not available', { status: 503 });
        }
      })
    );
    return;
  }

  // For API requests, always go to network (no caching)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Default: network-first for pages, with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful page responses
        if (response.ok && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Network failed - try cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // No cache either - return offline page or error
        console.warn('[SW] Network and cache both failed for:', event.request.url);
        return new Response('Offline - page not cached', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, ASSET_CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Listen for messages to clear asset cache (for when sprites are updated)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_ASSET_CACHE') {
    caches.delete(ASSET_CACHE_NAME).then(() => {
      console.log('[SW] Asset cache cleared');
      if (event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }

  if (event.data && event.data.type === 'INVALIDATE_ASSET') {
    const assetUrl = event.data.url;
    if (assetUrl) {
      caches.open(ASSET_CACHE_NAME).then((cache) => {
        const url = new URL(assetUrl);
        const cacheUrl = url.origin + url.pathname;
        cache.delete(new Request(cacheUrl)).then((deleted) => {
          console.log('[SW] Asset invalidated:', cacheUrl, deleted);
        });
      });
    }
  }
});
