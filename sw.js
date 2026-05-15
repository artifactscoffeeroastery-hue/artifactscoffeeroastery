const CACHE = 'artifacts-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/rewards.html',
  '/images/logo.png',
  '/images/favicon.ico',
  '/images/apple-touch-icon.png',
  '/images/gt-1080.png',
  '/images/mx-1080.png',
  '/images/ni-1080.png',
  '/images/cup.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only cache GET requests for same origin
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  // Never cache Netlify functions or PayFast
  if (e.request.url.includes('/.netlify/') || e.request.url.includes('payfast')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
      return cached || fresh;
    })
  );
});
