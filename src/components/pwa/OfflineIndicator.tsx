"use client";

import React, { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Tiny non-blocking banner that appears when the browser reports offline.
 * Uses `navigator.onLine` + online/offline events. Safe on SSR.
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold shadow-lg"
    >
      <WifiOff className="w-4 h-4" />
      Anda sedang offline — perubahan akan disinkronkan saat kembali online
    </div>
  );
}