// Self-unregistering service worker to kill any active cache or routing overrides
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    self.registration.unregister()
      .then(() => self.clients.claim())
      .then(() => {
        console.log('Service Worker successfully self-unregistered and terminated.');
      })
  );
});

