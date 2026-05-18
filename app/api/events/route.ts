// ============================================================================
// POST /api/events  — buffers app events into RTDB for cron aggregation.
// GET  /api/events  — returns the most recent persisted events from Firestore.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminRtdb } from "@/lib/firebase/admin";
import {
  attachSessionCookie,
  getOrCreateSession,
} from "@/lib/tracking/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = await getOrCreateSession();
    const payload = {
      event_type: String(body?.event_type || "unknown").slice(0, 64),
      path: body?.path ? String(body.path).slice(0, 512) : null,
      device: body?.device ? String(body.device).slice(0, 16) : null,
      is_admin: !!body?.is_admin,
      session_id: session.sid,
      ref_id: body?.ref_id ? String(body.ref_id).slice(0, 128) : null,
      metadata:
        body?.metadata && typeof body.metadata === "object"
          ? body.metadata
          : {},
      ts: Date.now(),
    };
    await adminRtdb.ref("buffer/events").push(payload);
    const res = NextResponse.json({ ok: true }, { headers: CORS });
    return attachSessionCookie(res, session);
  } catch (err) {
    console.error("[events POST] failed", err);
    return NextResponse.json({ ok: false }, { status: 200, headers: CORS });
  }
}

export async function GET() {
  try {
    const snap = await adminDb
      .collection("app_events")
      .orderBy("created_at", "desc")
      .limit(500)
      .get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json(rows, { headers: CORS });
  } catch (err) {
    console.error("[events GET] failed", err);
    return NextResponse.json([], { headers: CORS });
  }
}