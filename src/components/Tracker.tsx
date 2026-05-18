"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export function Tracker() {
  const pathname = usePathname();
  const reportedPaths = useRef(new Set<string>());

  useEffect(() => {
    if (!pathname) return;
    if (reportedPaths.current.has(pathname)) return;
    reportedPaths.current.add(pathname);

    // Fire-and-forget. Uniqueness is decided server-side from the ppmh_sid
    // httpOnly cookie — reloads are still counted as raw hits.
    apiFetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
