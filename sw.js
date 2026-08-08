// EQUILIB Service Worker — Push Notifications
// Deploy this file as sw.js at the root of your GitHub Pages repo

const SW_VERSION = 'equilib-sw-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// Handle push events from server (future use)
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'EQUILIB', {
      body: data.body || '',
      icon: data.icon || '/Personal-Life-Tracker/icon-192.png',
      badge: data.badge || '/Personal-Life-Tracker/icon-192.png',
      tag: data.tag || 'equilib',
      data: data.url ? { url: data.url } : {},
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  );
});

// Handle scheduled notifications via setTimeout messages
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, fireAt } = e.data;
    const delay = fireAt - Date.now();
    if (delay < 0) return; // already past
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/Personal-Life-Tracker/icon-192.png',
        tag: id,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: { url: 'https://abutlertheconsult-gatekpr.github.io/Personal-Life-Tracker/' }
      });
    }, delay);
  }

  if (e.data && e.data.type === 'CANCEL_NOTIFICATION') {
    // Can't cancel setTimeout in SW easily — handled by tag deduplication
  }
});

// Notification click — open/focus the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url)
    ? e.notification.data.url
    : 'https://abutlertheconsult-gatekpr.github.io/Personal-Life-Tracker/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('Personal-Life-Tracker'));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
