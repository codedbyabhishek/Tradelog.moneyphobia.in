/**
 * Service Worker for Trading Diary PWA
 * Handles offline functionality, caching, and background sync
 */

const CACHE_NAME = 'trading-diary-v3';
const RUNTIME_CACHE = 'trading-diary-runtime-v3';

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(Promise.resolve());
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - avoid stale HTML/documents
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Never cache API calls
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => {
          return new Response('Offline - data unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        }),
    );
    return;
  }

  // Navigation/document requests: network first, fallback to cached page
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return (
            cached ||
            new Response('Offline - page unavailable', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          );
        }),
    );
    return;
  }

  // Static assets: cache first with network fallback
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((networkResponse) => {
        if (networkResponse.ok && request.method === 'GET') {
          return caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
        return new Response('Offline - page unavailable', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

// Background sync for offline trades
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-trades') {
    event.waitUntil(syncOfflineTrades());
  }
});

async function syncOfflineTrades() {
  try {
    const db = new Promise((resolve, reject) => {
      const request = indexedDB.open('trading-journal-db', 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    const database = await db;
    const tx = database.transaction(['pending-trades'], 'readonly');
    const store = tx.objectStore('pending-trades');
    const trades = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });

    for (const trade of trades) {
      await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade)
      });
    }

    const deleteTx = database.transaction(['pending-trades'], 'readwrite');
    deleteTx.objectStore('pending-trades').clear();
  } catch (error) {
    console.error('[SW] Sync error:', error);
    throw error;
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'Trading Diary notification',
    icon: '/icon-192.png',
    badge: '/icon-64.png',
    tag: data.tag || 'trading-diary',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Trading Diary', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windows) => {
      if (windows.length > 0) {
        windows[0].focus();
        windows[0].postMessage({ type: 'notification-clicked', data: event.notification });
      } else {
        clients.openWindow('/');
      }
    })
  );
});
