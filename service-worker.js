const CACHE_NAME = "kinoshita-daisen-v4";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const isHtml =
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    event.request.url.endsWith("/index.html") ||
    event.request.url.endsWith("/kinoshita-daisenso/");

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || !response.ok) throw new Error("network response unavailable");
        const copy = response.clone();
        event.waitUntil(
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy))
        );
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => {
        if (cached) return cached;
        return caches.match("./index.html");
      }))
  );
});
