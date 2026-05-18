## Goal

Move all high-velocity tracking (page visits, article reads, app events, post views) off the client and Firestore hot path. Buffer writes in Firebase Realtime Database (RTDB), then aggregate via a scheduled cron into Firestore using batch writes. Fix post view counting so increments are atomic, per-post, and only touch `organic_views` — never `offset_views`.

## Current State (audit)

- Client calls `/api/track-visit`, `/api/track-article`, `/api/events` on every navigation/read — each hits Firestore directly.
- `BlogPostPage` triggers `/api/track-article` per session; route likely does a Firestore read+write per call.
- Post view counting risks reading the full posts list and writing it back (which would inflate other posts' counters).
- `offset_views` is a manual admin field; must remain immutable from tracking pipeline.

## Architecture

```text
Client (Tracker, BlogPostPage, analytics.ts)
   │  fire-and-forget POST
   ▼
Next.js API routes (/api/track-visit, /api/track-article, /api/events)
   │  Firebase Admin SDK — RTDB push only (no Firestore read)
   ▼
RTDB buffer:
   /buffer/page_views/{YYYY-MM-DD}/{autoId}    { path, sessionId, isUnique, ts }
   /buffer/article_views/{postId}/{autoId}     { sessionId, ts, isOrganic:true }
   /buffer/events/{autoId}                     { type, path, sessionId, refId, meta, ts }
   ▼
Cron: /api/cron/flush-tracking  (Vercel Cron, every 5 min, secured by CRON_SECRET)
   │  read buffer → aggregate in memory → Firestore batch write → delete buffered nodes
   ▼
Firestore:
   page_views/{YYYY-MM-DD}        hits, uniques, by_path{}
   posts/{id}                     organic_views (FieldValue.increment only)
   app_events/{autoId}            normalized event docs (batched)
```

## Implementation Steps

1. **Firebase Admin bootstrap** — `src/lib/firebase/admin.ts`: lazy-init `firebase-admin` from `FIREBASE_SERVICE_ACCOUNT_JSON` + `FIREBASE_DATABASE_URL`; export `adminDb` (Firestore) and `adminRtdb` (RTDB). Singleton-safe across hot reloads.
2. **Session cookie helper** — `src/lib/tracking/session.ts`: read/set httpOnly `ppmh_sid` cookie (UUID, 1y expiry, SameSite=Lax). Returns `{ sid, isNew }`. Replaces client-side localStorage uniqueness logic.
3. **Rewrite tracking API routes** to RTDB buffer pushes only (no Firestore I/O):
  - `app/api/track-visit/route.ts` — push `{ path, sid, isUnique:isNew, ts }`.
  - `app/api/track-article/route.ts` — validates `postId`, pushes under `/buffer/article_views/{postId}`. Per-session dedupe via cookie key `ppmh_read_{postId}` (httpOnly, 24h) so reloads still count as raw hits but unique reader is cookie-bound.
  - `app/api/events/route.ts` — push to `/buffer/events`. Keep response shape.
  - All routes: 204/200 fast return, no awaits beyond the RTDB push, CORS preserved.
4. **Cron aggregator** — `app/api/cron/flush-tracking/route.ts`:
  - Auth: require `Authorization: Bearer ${CRON_SECRET}`.
  - Read each buffer subtree once (`adminRtdb.ref(...).once('value')`).
  - **Page views**: group by date → upsert `page_views/{date}` with `FieldValue.increment(hits)`, `FieldValue.increment(uniques)`, and per-path increments via dot-notation `by_path.{safePath}`.
  - **Article views**: per postId → `posts/{id}.update({ organic_views: FieldValue.increment(n) })`. **Never reads or writes `offset_views**`. Uses `WriteBatch` (≤450 ops per batch, chunked).
  - **Events**: chunked `batch.set(doc, ...)` into `app_events`.
  - After successful commit, `ref.remove()` each consumed buffer node. On partial failure, leave node intact for retry idempotency.
  - Returns `{ flushed: { visits, articles, events }, durationMs }`.
5. **Vercel cron config** — `vercel.json`: schedule `/api/cron/flush-tracking` every 5 minutes.
6. **Client cleanup**:
  - `src/components/Tracker.tsx` — drop localStorage `ppmh_visitor_id`; let server cookie decide uniqueness. Keep per-pathname dedupe in `useRef` only.
  - `src/components/pages/BlogPostPage.tsx` — drop `sessionStorage` gate (server cookie handles it); still fire-and-forget on mount.
  - `src/lib/analytics.ts` — unchanged contract; remove `getSessionId` localStorage (server cookie is the source of truth) but keep a transient client id for `metadata` if needed.
7. **Secrets** (request via `add_secret`): `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_DATABASE_URL`, `CRON_SECRET`.

## Guarantees

- **Atomicity**: `FieldValue.increment` on `posts/{id}` only — impossible to leak to other posts (no read-modify-write of the list).
- `**offset_views` untouched**: aggregator never references the field; only `organic_views` is in any update payload.
- **Reload = raw hit**: every request pushes to RTDB; uniqueness is a separate boolean derived from cookie.
- **Cost**: ~N RTDB pushes per 5 min collapse into O(distinct posts/dates) Firestore writes.

## Files

## Add: `src/lib/firebase/admin.ts`, `src/lib/tracking/session.ts`, `app/api/cron/flush-tracking/route.ts`, `vercel.json`.  
Edit: `app/api/track-visit/route.ts`, `app/api/track-article/route.ts`, `app/api/events/route.ts`, `src/components/Tracker.tsx`, `src/components/pages/BlogPostPage.tsx`, `src/lib/analytics.ts`.  
Deps: `firebase-admin`.  
  
this is the .env   
# Server-side secrets (DO NOT EXPOSE TO CLIENT)

FIREBASE_PROJECT_ID=ngambonpesantren

FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDI0O82gFdaMHz4\nPb0eKHOKVIxF8zMbquVFIpLdXkZ61ij70cGz8m8Q/l0AC2xNCC4l9kgwNtErvc+s\nfU8hJtbiypcw08PEw0AOahDzL3JrOPbhk25xI+HqZWZEQrUh1igvV9JOs3DlZmPI\npNjAq0wmxF6uH0CioAOQZaBuw4I0a0YV3dp5uYMxT5I21fWsH740SpshUbMPquHS\nI4Jbe/KaM3nHQm/UCmRoDOUqITCr+Y/p9HGDoSPKs8Ua8VO6xVOxYX85e9dXOgY8\nY7r5cDE2i15152ZDlWWN8TRhtzLJROVJEARmY9Ht0PKpoLAectyvMwQZKHsmU3sW\n0CiHlJ4xAgMBAAECgf9QeOmWil4QfKQxSXK8eX+55aFD2e4xHo3U41xXH60lEsBG\ndgsmQSoHQhpvWiSCk5sEO2oFaCVW+GLjjGBmHvPqdHGbb3QtjtCsj6e0zBHd32xc\nTBuF2z5wEt8Lm6Lz3EErBG/44CkgxHC+htCu5MLin7tEeEgLSadXLGJ0Zuq83H1Q\nArqR0If0lWFoyNNeUUMo89tc41s9E0IIZNL4Ml9YPqYuosLyXL15ZsIg5+IVXTRy\ns8yWS1UiK7ue49epaXNjL7QwVmBegzhGwjCYCs/U56DSGRldc7iyFOMa1U7/sjCx\nhbF8jFSWvr8MpwAWO2zrR9Y0KAk/At8bsr45igECgYEA7wmxW6bG3Ny5jJ1zjC+B\nGtc1k6YM1J70FDAdpjABMx/ePA+nC+VuL8eb1ekk7J+yzP7xofTEWAIRpn/NXgaM\nrbc+I8gAPtrCQI06XtKAmce3IO/c/Ckkrm/StGxM0Hccqs0hM/ZX09bB8ED18a7j\n0d+4rW40c8x6L4ssIwO8hDECgYEA1xDqK3aqJ+MR5I12abql/Dnj+67v2fm6VjTf\n4ZBmFk8WhwwFdkE2RNF/e6sBihpR9SOznnSlSTwR18HLLvBBublKBuEE5lu+I7oi\nDTJduCA2cS2DHN5ENJzJKv3xWnlS5YJ7xtbxN8xRtKidpLqHHqVqKomoCXc9OWe4\nOzv1OgECgYB7dM4dP+3FdFqAvXFIHeDYM/5/22sVBWOaaZ9mjbSQ6wykiJEGG+Dk\n3Hsn59oiO/jk12eE9h3SNn9XNvqibU+LCPEXGdzGmcVqAYb8Ikw5IGT8peXEdptz\nXF2+wZCKunob3QYhCEIkLu7LX0GnKWSQqLOBH0IH7LvOglqxWuSqgQKBgQCXF2EM\na++a2iIF6YRZPzHBg4IxnXMQNiu8yKTIuUOfRKzU75Mewy23J19iqH8KYPdXO1/D\nYLuGOddnNtTiAxSJwCzLrGZe1/E69Fdb4hiJdMgKtyi3rUdJlySVOZbIMxgT+Zmv\n1e3df4OfYh5uTkUDOL7fZ5pQHB89Jyr9ImBkAQKBgBikn3UYjyzmLnXGUr5+pyKW\n741s4E0HHeou20V2/l1kVC+NWVmNMYJIiBOuvL3auwEej3mIp1ehkameKY53yBnd\nSv12X2TsY/0HPud5LvKSKdHnlmeBESyM65pA9TTJhpfC3ATqdkVQS5ZdE3jhqggb\nWmIlmzY3mwTJG7KxSACQ\n-----END PRIVATE KEY-----\n"

[FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@ngambonpesantren.iam.gserviceaccount.com](mailto:FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@ngambonpesantren.iam.gserviceaccount.com)

UPSTASH_REDIS_REST_URL=[https://first-caribou-116704.upstash.io](https://first-caribou-116704.upstash.io)

UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAcfgAAIgcDI5MTk5ZjEzMTU3Nzc0YmU4YmZmODc1ZTI5YTU5YzUxYw

CRON_SECRET=QQt4zFYo5PnV1k4xw4TQi2Zhs

# Client-side configuration (Public)

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBd7GSBo-TX1jq5owp0umA_LfORfqnYMZ0

NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=[ngambonpesantren.firebaseapp.com](http://ngambonpesantren.firebaseapp.com)

NEXT_PUBLIC_FIREBASE_PROJECT_ID=ngambonpesantren

NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=[ngambonpesantren.firebasestorage.app](http://ngambonpesantren.firebasestorage.app)

NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=910820220862

NEXT_PUBLIC_FIREBASE_APP_ID=1:910820220862:web:567e3698c39c0c574023ef

NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-LQDLTGW94C