// Phase 1: Analytics now routes through GA4 (window.gtag) instead of
// Firestore app_events writes.  The same public API is kept so call-sites
// don't need changes.

export type AppEventType =
  | "page_view"
  | "leaderboard_filter"
  | "profile_open"
  | "admin_login"
  | "admin_logout"
  | "admin_action";

export const setAnalyticsAdminFlag = (_isAdmin: boolean) => { /* no-op */ };

export interface TrackOptions {
  refId?: string;
  metadata?: Record<string, any>;
  isAdmin?: boolean;
}

export async function trackEvent(
  eventType: AppEventType,
  opts: TrackOptions = {},
): Promise<void> {
  try {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", eventType, {
        page_path: window.location.pathname,
        ref_id: opts.refId ?? undefined,
        ...opts.metadata,
      });
    }
  } catch (e) {
    console.warn("trackEvent failed", e);
  }
}
