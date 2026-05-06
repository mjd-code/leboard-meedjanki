// @ts-nocheck
/**
 * Custom Serwist (Workbox) Service Worker
 * -----------------------------------------------------------------------------
 * - Precaches the Next.js build manifest (__SW_MANIFEST)
 * - Custom runtime caching:
 *     • HTML navigations      → NetworkFirst (fresh shell, offline fallback)
 *     • Next static (_next/)  → CacheFirst (immutable, hashed)
 *     • Same-origin /api/*    → NetworkFirst + BackgroundSync queue for writes
 *     • Firestore listen/write→ NetworkOnly + BackgroundSync queue (writes)
 *     • Images/fonts          → StaleWhileRevalidate / CacheFirst
 * - Background Sync: failed POST/PUT/PATCH/DELETE are queued and replayed
 *   when the device regains connectivity.
 * - Periodic Background Sync: refresh `/api/data` every ~12h on supported
 *   browsers (Chrome/Android with installed PWA + permission). Falls back
 *   gracefully on Safari/iOS where the API is absent — the app simply
 *   refreshes on next foreground via React Query.
 */

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
  ExpirationPlugin,
  BackgroundSyncPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// ---------------------------------------------------------------------------
// Background Sync queues — one per logical surface so retries are scoped.
// `maxRetentionTime` is in MINUTES (Workbox convention).
// ---------------------------------------------------------------------------
const apiWriteQueue = new BackgroundSyncPlugin("api-write-queue", {
  maxRetentionTime: 24 * 60, // 24h
});
const firebaseWriteQueue = new BackgroundSyncPlugin("firebase-write-queue", {
  maxRetentionTime: 24 * 60,
});

// ---------------------------------------------------------------------------
// Runtime caching rules (evaluated in order; first match wins).
// We intentionally place these BEFORE `defaultCache` so our rules win.
// ---------------------------------------------------------------------------
const runtimeCaching = [
  // 1. App-shell / HTML navigations
  {
    matcher: ({ request, sameOrigin }) =>
      sameOrigin && request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: "html-shell",
      networkTimeoutSeconds: 4,
      plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
    }),
  },

  // 2. Hashed Next.js build assets — safe to cache forever
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith("/_next/static/"),
    handler: new CacheFirst({
      cacheName: "next-static",
      plugins: [
        new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      ],
    }),
  },

  // 3. Same-origin API reads → NetworkFirst (fast fallback to cache)
  {
    matcher: ({ url, sameOrigin, request }) =>
      sameOrigin &&
      url.pathname.startsWith("/api/") &&
      request.method === "GET",
    handler: new NetworkFirst({
      cacheName: "api-get",
      networkTimeoutSeconds: 5,
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 30 })],
    }),
  },

  // 4. Same-origin API writes → queue if offline, retry when online
  {
    matcher: ({ url, sameOrigin, request }) =>
      sameOrigin &&
      url.pathname.startsWith("/api/") &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method),
    handler: new NetworkOnly({ plugins: [apiWriteQueue] }),
    method: "POST",
  },

  // 5. Firestore REST writes → queue
  {
    matcher: ({ url, request }) =>
      url.hostname === "firestore.googleapis.com" &&
      ["POST", "PATCH", "DELETE"].includes(request.method),
    handler: new NetworkOnly({ plugins: [firebaseWriteQueue] }),
    method: "POST",
  },

  // 6. Images
  {
    matcher: ({ request }) => request.destination === "image",
    handler: new StaleWhileRevalidate({
      cacheName: "images",
      plugins: [
        new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 14 }),
      ],
    }),
  },

  // 7. Google Fonts
  {
    matcher: ({ url }) =>
      url.hostname === "fonts.googleapis.com" ||
      url.hostname === "fonts.gstatic.com",
    handler: new StaleWhileRevalidate({ cacheName: "google-fonts" }),
  },

  // 8. Firebase Storage user uploads
  {
    matcher: ({ url }) => url.hostname === "firebasestorage.googleapis.com",
    handler: new StaleWhileRevalidate({
      cacheName: "firebase-storage",
      plugins: [
        new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }),
      ],
    }),
  },

  // 9. Fall back to Serwist's tuned defaults for everything else
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// ---------------------------------------------------------------------------
// Periodic Background Sync (Chromium-only, requires installed PWA + permission)
// We register a 'refresh-data' tag from the page; here we handle it.
// On unsupported browsers (Safari/iOS/Firefox) this listener simply never
// fires — the app falls back to React Query refetch-on-focus.
// ---------------------------------------------------------------------------
self.addEventListener("periodicsync", (event: any) => {
  if (event.tag === "refresh-data") {
    event.waitUntil(
      (async () => {
        try {
          const res = await fetch("/api/data", { cache: "no-store" });
          if (res.ok) {
            const cache = await caches.open("api-get");
            await cache.put("/api/data", res.clone());
            // Notify any open clients that fresh data landed.
            const clients = await self.clients.matchAll({ type: "window" });
            clients.forEach((c) => c.postMessage({ type: "periodic-sync", tag: event.tag }));
          }
        } catch {
          /* swallow — next interval will retry */
        }
      })(),
    );
  }
});

// Allow the page to force-clear caches (used by error boundary recovery).
self.addEventListener("message", (event) => {
  if (event.data === "clear-caches") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      })(),
    );
  }
  if (event.data === "skip-waiting") self.skipWaiting();
});
