// BlueScout service worker — app-shell caching + offline navigation fallback.
// Offline scouting DATA is stored in IndexedDB (Dexie), independent of this SW.
const CACHE = "bluescout-v1";
const PRECACHE = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

const OFFLINE_HTML =
  "<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Offline · BlueScout</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#070b16;color:#e8edf7;font-family:system-ui,sans-serif;text-align:center;padding:2rem}h1{color:#facc15}</style></head><body><div><h1>You're offline</h1><p>Scouting still works — your entries are saved on this device and can be synced or shared via QR code when you're done.</p></div></body></html>";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache realtime or API traffic.
  if (url.pathname.startsWith("/realtime") || url.pathname.startsWith("/api")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            new Response(OFFLINE_HTML, {
              headers: { "Content-Type": "text/html" },
            }),
        ),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached),
    ),
  );
});
