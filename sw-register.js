// Makes REPEAT visits to the registration page (and the next webinar's link — the page is the same, only the link differs) open instantly
// from this phone's cache. Its scope is register.html ONLY: the admin app keeps its own sw.js and is not touched by this file.
//
//  register.html  → stale-while-revalidate: the saved copy opens at once; a fresh copy is fetched behind it for the next visit.
//  config.js      → network first, always re-validated with the server (it holds the web app address, which must never be stale); the saved
//                   copy is used only if the network is slow (2.5 s) or offline.
//  everything else (Apps Script calls, the icon) → straight to the network, as before.
//
// To force every phone to drop its saved copy after a big change, change the version in CACHE below.
const CACHE = 'wm-register-v1';
const PAGE = './register.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(PAGE, { cache: 'reload' }))).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.indexOf('wm-register-') === 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                                   // Apps Script and other sites: never touched
  if (req.mode === 'navigate' && /\/register\.html$/.test(url.pathname)) { e.respondWith(pageFromCache(e)); return; }
  if (/\/config\.js$/.test(url.pathname)) { e.respondWith(networkFirst(req, 2500)); return; }
});

function pageFromCache(e) {
  // Whatever the link's ?id=…&t=… says, the page itself is the same file, so one saved copy serves every webinar.
  const refresh = fetch(PAGE, { cache: 'no-cache' })                          // ask the server whether it changed (a cheap 304 when it did not) — never the browser's own 10-minute copy
    .then((res) => { if (res && res.ok) { const copy = res.clone(); return caches.open(CACHE).then((c) => c.put(PAGE, copy)).then(() => res); } return res; })
    .catch(() => null);
  e.waitUntil(refresh);
  return caches.open(CACHE).then((c) => c.match(PAGE)).then((hit) => hit || refresh.then((res) => res || fetch(e.request)));
}

function networkFirst(req, waitMs) {
  const net = fetch(new Request(req, { cache: 'no-cache' })).then((res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; });
  const slow = new Promise((resolve) => setTimeout(resolve, waitMs)).then(() => caches.match(req));
  return Promise.race([net.catch(() => caches.match(req)), slow]).then((res) => res || net);
}
