// Bumped on every meaningful SW change so old caches are evicted on activate.
// IMPORTANT: stale "cache-everything" service workers were the #1 cause of
// white-blank screens after rebuilds — the SW was serving an old index.html
// that referenced JS chunks that no longer existed. This version uses:
//   - network-first for HTML/JS/CSS/JSON  (always get fresh app shell)
//   - cache-first for images/fonts/static (fast repeat loads)
//   - never caches POST/PUT/DELETE or /api/*  (so CRUD never goes stale)
// Bump this whenever you change the SW so the cache health screen shows it.
const CACHE_VERSION = 'hub-v5';
const BUILD_ID = '__BUILD__';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

self.addEventListener('install', (event) => {
  // Activate the new SW immediately on first install so the broken old one
  // can't keep serving stale assets.
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)),
    );
    await self.clients.claim();
  })());
});

// Allow the page to force-clear all SW caches (used by ErrorBoundary recovery).
self.addEventListener('message', (event) => {
  if (event.data === 'clear-caches') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    })());
  }
  // Reply with version + cache info so the Cache Health tab can display it.
  if (event.data === 'get-version') {
    const port = event.ports && event.ports[0];
    (async () => {
      const cacheKeys = await caches.keys();
      const payload = {
        type: 'sw-version',
        version: CACHE_VERSION,
        buildId: BUILD_ID,
        caches: cacheKeys,
        scope: self.registration && self.registration.scope,
      };
      if (port) port.postMessage(payload);
      else if (event.source) event.source.postMessage(payload);
    })();
  }
  if (event.data === 'skip-waiting') {
    self.skipWaiting();
  }
});

const isStaticAsset = (url) =>
  /\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|eot)$/i.test(url.pathname);

const isAppShell = (url, req) =>
  req.mode === 'navigate' ||
  /\.(js|mjs|css|html|json|map)$/i.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never intercept non-GET, /api/*, cross-origin (Firebase, etc).
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (isAppShell(url, req)) {
    // Network-first: keep the app fresh; fall back to cache only when offline.
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const copy = fresh.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        // For navigations, fall back to the cached root document so we never
        // show the browser's offline error page when the app shell is cached.
        if (req.mode === 'navigate') {
          const root = await caches.match('/');
          if (root) return root;
        }
        throw new Error('offline and no cache');
      }
    })());
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const copy = fresh.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return fresh;
    })());
  }
});
