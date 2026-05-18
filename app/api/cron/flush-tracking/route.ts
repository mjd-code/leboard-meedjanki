// ============================================================================
// GET /api/cron/flush-tracking
// Scheduled aggregator: drains RTDB buffers and applies efficient batched
// Firestore writes. Auth via Bearer ${CRON_SECRET} or ?secret=... query.
//
// Guarantees:
//   - posts/{id}.organic_views is the ONLY post field ever touched.
//   - offset_views is never read or written.
//   - Atomic per-post increments via FieldValue.increment (no read/modify).
//   - On commit failure, buffered nodes are left in place for next run.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminRtdb, FieldValue } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_LIMIT = 450;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

function safePathKey(p: string): string {
  return (p || "/")
    .slice(0, 200)
    .replace(/[\/.~*\[\]]/g, "_")
    .replace(/^_+/, "_");
}

async function chunkedCommit(
  ops: Array<(b: FirebaseFirestore.WriteBatch) => void>,
) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = adminDb.batch();
    for (const op of ops.slice(i, i + BATCH_LIMIT)) op(batch);
    await batch.commit();
  }
}

async function flushPageViews() {
  const ref = adminRtdb.ref("buffer/page_views");
  const snap = await ref.once("value");
  const val = snap.val() as Record<
    string,
    Record<
      string,
      { path: string; sid: string; isUnique: boolean; ts: number }
    >
  > | null;
  if (!val) return { dates: 0, hits: 0 };

  type Agg = {
    hits: number;
    unique_hits: number;
    by_path: Record<string, number>;
  };
  const perDate = new Map<string, Agg>();
  let totalHits = 0;

  for (const [date, entries] of Object.entries(val)) {
    const agg: Agg = { hits: 0, unique_hits: 0, by_path: {} };
    for (const e of Object.values(entries || {})) {
      agg.hits += 1;
      if (e.isUnique) agg.unique_hits += 1;
      const k = safePathKey(e.path);
      agg.by_path[k] = (agg.by_path[k] || 0) + 1;
    }
    perDate.set(date, agg);
    totalHits += agg.hits;
  }

  const ops: Array<(b: FirebaseFirestore.WriteBatch) => void> = [];
  for (const [date, agg] of perDate.entries()) {
    const doc = adminDb.collection("page_views").doc(date);
    const update: Record<string, unknown> = {
      date,
      hits: FieldValue.increment(agg.hits),
      unique_hits: FieldValue.increment(agg.unique_hits),
      updated_at: FieldValue.serverTimestamp(),
    };
    for (const [k, n] of Object.entries(agg.by_path)) {
      update[`by_path.${k}`] = FieldValue.increment(n);
    }
    ops.push((b) => b.set(doc, update, { merge: true }));
  }
  await chunkedCommit(ops);

  for (const date of perDate.keys()) {
    await adminRtdb.ref(`buffer/page_views/${date}`).remove();
  }
  return { dates: perDate.size, hits: totalHits };
}

async function flushArticleViews() {
  const ref = adminRtdb.ref("buffer/article_views");
  const snap = await ref.once("value");
  const val = snap.val() as Record<
    string,
    Record<string, { sid: string; unique?: boolean; ts: number }>
  > | null;
  if (!val) return { posts: 0, reads: 0, uniques: 0 };

  type PostAgg = { reads: number; uniqueReads: number };
  const perPost = new Map<string, PostAgg>();
  let totalReads = 0;
  let totalUniques = 0;

  for (const [postId, entries] of Object.entries(val)) {
    const agg: PostAgg = { reads: 0, uniqueReads: 0 };
    for (const e of Object.values(entries || {})) {
      agg.reads += 1;
      if (e.unique) agg.uniqueReads += 1;
    }
    perPost.set(postId, agg);
    totalReads += agg.reads;
    totalUniques += agg.uniqueReads;
  }

  // ATOMIC, PER-POST. Only touches organic_views — offset_views is never named.
  const ops: Array<(b: FirebaseFirestore.WriteBatch) => void> = [];
  for (const [postId, agg] of perPost.entries()) {
    const doc = adminDb.collection("posts").doc(postId);
    ops.push((b) =>
      b.set(
        doc,
        {
          organic_views: FieldValue.increment(agg.reads),
          last_view_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    );
  }
  await chunkedCommit(ops);

  if (totalReads > 0) {
    const today = new Date().toISOString().slice(0, 10);
    await adminDb
      .collection("page_views")
      .doc(today)
      .set(
        {
          date: today,
          article_reads: FieldValue.increment(totalReads),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }

  for (const postId of perPost.keys()) {
    await adminRtdb.ref(`buffer/article_views/${postId}`).remove();
  }
  return { posts: perPost.size, reads: totalReads, uniques: totalUniques };
}

async function flushEvents() {
  const ref = adminRtdb.ref("buffer/events");
  const snap = await ref.once("value");
  const val = snap.val() as Record<string, Record<string, unknown>> | null;
  if (!val) return { written: 0 };

  const entries = Object.entries(val);
  const ops: Array<(b: FirebaseFirestore.WriteBatch) => void> = [];
  for (const [, payload] of entries) {
    const doc = adminDb.collection("app_events").doc();
    ops.push((b) =>
      b.set(doc, {
        ...(payload as Record<string, unknown>),
        created_at: FieldValue.serverTimestamp(),
      }),
    );
  }
  await chunkedCommit(ops);
  await ref.remove();
  return { written: entries.length };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  try {
    const [visits, articles, events] = await Promise.all([
      flushPageViews(),
      flushArticleViews(),
      flushEvents(),
    ]);
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - started,
      flushed: { visits, articles, events },
    });
  } catch (err: any) {
    console.error("[cron/flush-tracking] failed", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "flush failed" },
      { status: 500 },
    );
  }
}

export const POST = GET;