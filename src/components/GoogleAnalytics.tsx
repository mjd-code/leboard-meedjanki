/**
 * GA4 integration using @next/third-parties/google.
 * Handles pageview tracking on client-side route changes automatically.
 */
"use client";

import { GoogleAnalytics as GA4 } from "@next/third-parties/google";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;
  return <GA4 gaId={GA_MEASUREMENT_ID} />;
}