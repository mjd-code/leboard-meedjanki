"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Handles SW lifecycle on the client:
 *  - Registers Periodic Background Sync (`refresh-data`) when supported &
 *    permission is granted. Silently no-ops on Safari/iOS/Firefox.
 *  - Listens for SW → page messages (e.g. periodic-sync completion) and
 *    invalidates React Query caches so UI updates without a manual reload.
 *  - Drains pending Background Sync queue on `online` events (best effort).
 *
 * Note: registration of /sw.js itself is handled by @serwist/next.
 */
export function ServiceWorkerRegistrar() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "periodic-sync") {
        queryClient.invalidateQueries({ queryKey: ["app-data"] });
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    const onOnline = () => {
      // Nudge React Query to refetch when connectivity returns.
      queryClient.invalidateQueries();
    };
    window.addEventListener("online", onOnline);

    // ---- Periodic Background Sync (Chromium-only, installed PWA) ----
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        // @ts-expect-error — periodicSync is not in lib.dom yet
        if (!reg.periodicSync) return;

        // Permissions API gate (avoids prompting / failing silently).
        const status = await (navigator.permissions as any).query({
          name: "periodic-background-sync",
        });
        if (status.state !== "granted") return;

        // @ts-expect-error
        await reg.periodicSync.register("refresh-data", {
          minInterval: 12 * 60 * 60 * 1000, // 12 hours
        });
      } catch {
        /* unsupported — fall back to refetch-on-focus from React Query */
      }
    })();

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("online", onOnline);
    };
  }, [queryClient]);

  return null;
}