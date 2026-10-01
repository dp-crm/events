const CACHE = 'wm-webinars-v3';
const SHELL = ['./admin.html', './config.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for the app shell: always try to fetch the latest
// admin.html/config.js/etc. from the network first, and only fall back to
// whatever's cached if the network request fails (offline). The cache is
// kept updated with every successful fetch, so offline mode still uses a
// reasonably recent copy. This matters specifically because this app gets
// installed/added to home screen, so a stale cache can otherwise keep
// serving an old version of the app indefinitely, even after re-uploading
// new files to GitHub Pages — the previous cache-first strategy did exactly
// that. Apps Script data calls and fonts are untouched: network only, no
// caching, since this app is only useful with live data.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const network = fetch(e.request).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
    }
    return res;
  });
  // Weak signal? After 3 seconds show the saved copy instead of a blank
  // screen — the network request carries on and refreshes it for next time.
  const fallback = new Promise((resolve) => setTimeout(resolve, 3000))
    .then(() => caches.match(e.request))
    .then((cached) => cached || network);
  e.respondWith(
    Promise.race([network.catch(() => caches.match(e.request)), fallback])
      .then((res) => res || network)
      .catch(() => caches.match(e.request))
  );
});
