const CACHE = "nbs-shell-v3";
const SHELL_URLS = ["/", "/styles.css", "/app.js", "/data.js", "/manifest.json", "/icon-192.png", "/icon-512.png", "/icon-512-maskable.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const isNavigation = req.mode === "navigate" || new URL(req.url).pathname === "/" || new URL(req.url).pathname === "/index.html";

  // Network-first for the page and its code/data (index, styles.css, app.js, data.js):
  // always try to get the freshest Q&A content, fall back to cache offline.
  // The page, script and data must stay in sync, so none of them is served stale.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((res) => res || (isNavigation ? caches.match("/") : undefined)))
  );
});
