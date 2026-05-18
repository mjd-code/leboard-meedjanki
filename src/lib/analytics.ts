// Lightweight client-side analytics → app_events table.
// Captures: page visits, leaderboard filter changes, profile opens, admin login.
// Each browser gets a stable session_id stored in localStorage.

import { apiFetch } from './api';

const SESSION_KEY = "app_session_id";

const getSessionId = (): string => {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

const detectDevice = (): "mobile" | "tablet" | "desktop" => {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const w = window.innerWidth;
  if (/iPad|Tablet/i.test(ua) || (w >= 600 && w <= 1024)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua) || w < 600) return "mobile";
  return "desktop";
};

let cachedAdmin = false;
export const setAnalyticsAdminFlag = (isAdmin: boolean) => { cachedAdmin = isAdmin; };

export type AppEventType =
  | "page_view"
  | "leaderboard_filter"
  | "profile_open"
  | "admin_login"
  | "admin_logout"
  | "admin_action";

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
    await apiFetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: eventType,
        path: typeof window !== "undefined" ? window.location.pathname + window.location.hash : null,
        device: detectDevice(),
        is_admin: opts.isAdmin ?? cachedAdmin,
        session_id: getSessionId(),
        ref_id: opts.refId ?? null,
        metadata: opts.metadata ?? {},
      })
    });
  } catch (e) {
    // Never let analytics break UX.
    console.warn("trackEvent failed", e);
  }
}
