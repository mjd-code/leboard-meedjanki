"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export function Tracker() {
  const pathname = usePathname();
  const reportedPaths = useRef(new Set<string>());

  useEffect(() => {
    if (!pathname) return;

    if (!reportedPaths.current.has(pathname)) {
      reportedPaths.current.add(pathname);

      // Simple unique visitor logic using localStorage
      let isUnique = false;
      const TRACK_KEY = 'ppmh_visitor_id';
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(TRACK_KEY);
        if (!stored) {
          localStorage.setItem(TRACK_KEY, Date.now().toString());
          isUnique = true;
        } else {
          // Check if unique today? E.g., track-visit unique_hits can be "new visitors today"
          // We'll consider them unique once per browser.
        }
      }

      // Track visit
      apiFetch('/api/track-visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isUnique })
      }).catch(console.error);
    }
  }, [pathname]);

  return null;
}
