const CACHE_NAME = "kinoshita-daisen-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// キャラクター定義は index.html が唯一の正規データ源です。
// 古い報酬補正スクリプトは削除し、HTMLの最新版をそのまま配信します。

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

  const isHtml = event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    event.request.url.endsWith("/index.html") ||
    event.request.url.endsWith("/kinoshita-daisenso/");

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (isHtml) return withRewardFix(response).then(fixed => {
          const copy = fixed.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return fixed;
        });
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
