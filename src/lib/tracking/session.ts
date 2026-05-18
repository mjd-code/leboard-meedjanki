// ============================================================================
// Server-side session cookie helper for tracking pipeline.
// - ppmh_sid: long-lived (1y) httpOnly cookie. Source of truth for uniqueness.
// - ppmh_read_{postId}: short-lived (24h) per-post read-dedupe flag.
// Reloads still produce raw hits; uniqueness is derived from cookie presence.
// ============================================================================
import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import type { NextResponse } from "next/server";

const SID_COOKIE = "ppmh_sid";
const SID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const READ_MAX_AGE = 60 * 60 * 24; // 24 hours

export interface SessionInfo {
  sid: string;
  isNew: boolean;
}

/** Read ppmh_sid; if missing, mint a new id (caller writes it on response). */
export async function getOrCreateSession(): Promise<SessionInfo> {
  const jar = await cookies();
  const existing = jar.get(SID_COOKIE)?.value;
  if (existing && /^[a-zA-Z0-9-]{6,}$/.test(existing)) {
    return { sid: existing, isNew: false };
  }
  return { sid: randomUUID(), isNew: true };
}

/** Attach ppmh_sid cookie to a NextResponse if it was newly minted. */
export function attachSessionCookie(res: NextResponse, info: SessionInfo) {
  if (!info.isNew) return res;
  res.cookies.set(SID_COOKIE, info.sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SID_MAX_AGE,
    path: "/",
  });
  return res;
}

/** Returns true on the first read of a post within the dedupe window. */
export async function consumeReadFlag(postId: string): Promise<boolean> {
  const jar = await cookies();
  const key = `ppmh_read_${postId}`;
  return !jar.get(key)?.value;
}

export function attachReadFlag(res: NextResponse, postId: string) {
  res.cookies.set(`ppmh_read_${postId}`, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: READ_MAX_AGE,
    path: "/",
  });
  return res;
}