// ============================================================================
// POST /api/track-article
// Buffers an article read into RTDB. Every call = raw hit (reloads counted).
// Unique reader is keyed by ppmh_sid + ppmh_read_{postId} cookie.
// Aggregator increments ONLY posts/{id}.organic_views — never offset_views.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminRtdb } from "@/lib/firebase/admin";
import {
  attachReadFlag,
  attachSessionCookie,
  consumeReadFlag,
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
    const postId =
      typeof body?.postId === "string" ? body.postId.trim() : "";
    if (!postId || !/^[A-Za-z0-9_-]{1,128}$/.test(postId)) {
      return NextResponse.json(
        { ok: false, error: "invalid postId" },
        { status: 400, headers: CORS },
      );
    }
    const session = await getOrCreateSession();
    const isFirstReadInWindow = await consumeReadFlag(postId);
    await adminRtdb.ref(`buffer/article_views/${postId}`).push({
      sid: session.sid,
      unique: session.isNew || isFirstReadInWindow,
      ts: Date.now(),
    });
    let res = NextResponse.json(
      { ok: true, unique: isFirstReadInWindow },
      { headers: CORS },
    );
    res = attachSessionCookie(res, session);
    res = attachReadFlag(res, postId);
    return res;
  } catch (err) {
    console.error("[track-article] failed", err);
    return NextResponse.json({ ok: false }, { status: 200, headers: CORS });
  }
}