// Minimal service worker. Its presence + a fetch handler is what makes Kira installable as a PWA.
// It deliberately does NOT cache app shells/JS: Kira ships often, and serving stale chunks from a
// cache would break the app. This is a network passthrough — just enough to be installable, no more.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
// No respondWith → the browser handles the request normally (network). The handler must exist for
// the install heuristic; keep it a passthrough so there is never a stale-cache failure mode.
self.addEventListener('fetch', () => {});
