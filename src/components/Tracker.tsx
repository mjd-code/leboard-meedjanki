"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackArticleView } from '@/lib/firebase/tracking';
import { sendGAEvent } from '@next/third-parties/google';

/**
 * Lightweight tracker:
 * 1. GA4 handles unique visitors, sessions, demographics (via GoogleAnalytics component).
 * 2. This component only increments per-post view counters in Firebase
 *    when a user lands on /blog/[slug].
 */
export function Tracker() {
  const pathname = usePathname();
  const trackedSlugs = useRef(new Set<string>());

  useEffect(() => {
    if (!pathname) return;

    // Only track blog post views for the per-post counter
    const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
    if (!blogMatch) return;

    const slug = blogMatch[1];
    if (trackedSlugs.current.has(slug)) return;
    trackedSlugs.current.add(slug);

    // Increment the post's view counter directly in Firestore.
    trackArticleView(slug);

    // Also send a custom GA4 event for article reads (optional enrichment)
    try {
      sendGAEvent('event', 'article_view', { slug });
    } catch {
      // GA4 might not be loaded if no measurement ID
    }
  }, [pathname]);

  return null;
}
