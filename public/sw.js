// Service Worker: يدعم العمل دون إنترنت لواجهة التطبيق ومحتواه (التخزين المؤقت أثناء الاستخدام).
// استراتيجية: stale-while-revalidate لطلبات GET من نفس الأصل. طلبات /api/ (المدرس) لا تُخزَّن أبداً.
const CACHE = 'eme-shell-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './favicon.svg', './manifest.webmanifest'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: false });
      const net = fetch(req)
        .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => null);
      if (hit) { net.catch(() => {}); return hit; }
      const res = await net;
      if (res) return res;
      if (req.mode === 'navigate') return (await cache.match('./')) || Response.error();
      return Response.error();
    }),
  );
});
