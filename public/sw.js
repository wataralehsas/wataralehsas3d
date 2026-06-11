// وتر الإحساس — Service Worker (image-only offline cache)
// Caches images CacheFirst so previews remain available offline.
const CACHE = "watar-images-v1";
const MAX_ENTRIES = 200;

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("watar-images") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isImageRequest(req) {
  if (req.method !== "GET") return false;
  if (req.destination === "image") return true;
  const url = new URL(req.url);
  return /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(url.pathname);
}

async function trimCache(cache) {
  const reqs = await cache.keys();
  if (reqs.length > MAX_ENTRIES) {
    for (let i = 0; i < reqs.length - MAX_ENTRIES; i++) await cache.delete(reqs[i]);
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (!isImageRequest(req)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) {
      // refresh in background
      fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()).then(() => trimCache(cache)); }).catch(() => {});
      return cached;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok) { cache.put(req, res.clone()); trimCache(cache); }
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});
