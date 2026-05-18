// ============================================================================
// POST /api/track-visit
// Fast-path tracker — buffers a page hit into RTDB. No Firestore I/O.
// Uniqueness is decided server-side from ppmh_sid cookie (httpOnly).
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminRtdb } from "@/lib/firebase/admin";
import {
  attachSessionCookie,
  getOrCreateSession,
} from "@/lib/tracking/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const path =
      typeof body?.path === "string"
        ? body.path.slice(0, 256)
        : req.headers.get("referer") || "/";
    const session = await getOrCreateSession();
    const today = new Date().toISOString().slice(0, 10);
    await adminRtdb.ref(`buffer/page_views/${today}`).push({
      path,
      sid: session.sid,
      isUnique: session.isNew,
      ts: Date.now(),
    });
    const res = NextResponse.json(
      { ok: true, unique: session.isNew },
      { headers: CORS },
    );
    return attachSessionCookie(res, session);
  } catch (err) {
    console.error("[track-visit] failed", err);
    return NextResponse.json({ ok: false }, { status: 200, headers: CORS });
  }
}