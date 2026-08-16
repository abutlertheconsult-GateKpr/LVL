// LVL Service Worker — PWA + Push Notifications
// Deploy as sw.js at repo root

const SW_VERSION = 'lvl-sw-v6';
const BASE = new URL('.', self.location).pathname;
const CACHE_NAME = `lvl-cache-${SW_VERSION}`;
const CACHE_URLS = [
  BASE,
  BASE + 'index.html',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'manifest.json',
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(BASE + 'index.html'));
    })
  );
});

// Push events
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'LVL', {
      body: data.body || '',
      icon: BASE + 'icon-512.png',
      badge: BASE + 'icon-512.png',
      tag: data.tag || 'lvl',
      data: data.url ? { url: data.url } : {},
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  );
});

// Scheduled notifications via postMessage
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, fireAt } = e.data;
    const delay = fireAt - Date.now();
    if (delay < 0) return;
    if (delay > 2147483647) return; // setTimeout max ~24.8 days
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: BASE + 'icon-512.png',
        badge: BASE + 'icon-512.png',
        tag: id,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: { url: BASE }
      });
    }, delay);
  }
});

// Notification click — open/focus app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url)
    ? e.notification.data.url
    : BASE;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('LVL'));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
