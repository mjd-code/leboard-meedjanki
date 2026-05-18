# Backend Flow — End to End

This document explains how the backend of this app works, from the browser's UI
all the way down to Firestore documents. Despite living in a Next.js project,
**all backend logic runs client‑side** through a Firebase Web SDK adapter that
emulates a REST API. There is no Node server, no edge function, and no Express
process. Understanding that one fact is the key to everything else.

---

## 1. Architectural Map

```text
┌──────────────────────────────────────────────────────────────────┐
│  React components (app/*, src/components/*)                      │
│   └─ TanStack Query hooks (src/hooks/useAppQueries.ts)           │
│        └─ apiFetch('/api/...')          ← src/lib/api.ts         │
│             ├─ if URL starts with /api/ →                        │
│             │     firebaseApiFetch()    ← src/lib/firebaseApi.ts │
│             │        └─ runRouter() — emulated REST router       │
│             │             └─ conn* helpers ← dbConnections.ts    │
│             │                   └─ fs* helpers ← firestoreDriver │
│             │                         └─ Firebase Web SDK        │
│             │                               └─ Cloud Firestore   │
│             └─ else → native fetch() to a real URL               │
└──────────────────────────────────────────────────────────────────┘
```

Key files:

| Layer | File | Role |
|---|---|---|
| UI queries | `src/hooks/useAppQueries.ts` | TanStack Query wrappers (`useAppDataQuery`, `useAuthQuery`, mutations) |
| Fetch facade | `src/lib/api.ts` | Single entry point. Adds auth token, timeouts, retries, and routes `/api/*` to the in‑browser router |
| REST emulator | `src/lib/firebaseApi.ts` | The "backend". A long `runRouter()` switch that handles every `/api/...` path |
| Connection helpers | `src/lib/dbConnections.ts` | Generic `connSelect / connInsert / connUpdate / connDelete` over the active connection |
| Firestore driver | `src/lib/firestoreDriver.ts` | Initializes named `FirebaseApp` + `Firestore` instances, executes the actual SDK calls |
| Firebase config | `firebase-applet-config.json` + `src/lib/firebase/firebase.ts` (Phase 0 SSOT) | The publishable Web SDK config (apiKey, projectId, etc.) |
| Local cache | `src/lib/localCache.ts` | Per‑connection localStorage cache for the cacheable GETs |
| Real route | `src/app/api/data/route.ts` | The only real Next.js route handler — a CORS pre‑flight stub. Not used by the app's data flow |

> The `src/app/api/data/route.ts` file exists only as a CORS health‑check stub.
> Every other "`/api/...`" path you see in the codebase is **never** an HTTP
> request — it is dispatched in‑process by `runRouter()`.

---

## 2. Request Lifecycle

A typical read on the home page (`/leaderboard`) walks through every layer:

1. `LeaderboardPage` component mounts and calls `useAppDataQuery()`.
2. TanStack Query checks its cache; if stale, it calls `fetchAppData()`
   (`src/lib/api.ts`).
3. `fetchAppData` fires five parallel `apiFetch('/api/...')` calls
   (`categories`, `masterGoals`, `students`, `settings`, `groups`).
4. For each URL, `apiFetch`:
   - Reads `admin_token` from `localStorage` (or an in‑memory fallback).
   - Attaches `Authorization: Bearer <token>` if present.
   - Sets an abort timeout: **5 s for GET, 10 s for write** methods.
   - Because the URL starts with `/api/`, it delegates to `firebaseApiFetch()`
     instead of doing a real `fetch()`.
   - On a transient error for a GET, it retries **once** after 300 ms.
   - On `401`, it removes the token and dispatches an `auth-expired` event.
5. `firebaseApiFetch()`:
   - Looks up `getActiveConnection()` (currently always the default Firebase
     project — see §6).
   - Determines whether the path is cacheable (the read‑only GETs of
     `students/categories/masterGoals/groups/settings/admin_users/posts/logs/events`).
   - Calls `runRouter(url, init, conn)` to execute the request in‑process.
   - On success of a cacheable GET, it clones the response and persists it via
     `writeCache(conn.id, 'read::<url>', data)` in localStorage.
   - On failure: it first tries to **serve a stale value from localCache** (so
     the UI never goes blank); otherwise, if the active connection is not the
     default one, it marks it failed and retries against the default. This is
     the resilience tail that lets the app survive a broken external
     connection.
6. `runRouter()` matches the path/method and calls the appropriate
   `connSelect / connInsert / connUpdate / connDelete` helpers, which call
   `fsSelect / fsInsert / fsUpdate / fsDeleteById` against Firestore through
   the cached `Firestore` instance.
7. Rows are translated by **mappers** (snake_case ↔ camelCase). Examples:
   `mapStudentRow / mapStudentInput`, `mapGoalRow / mapGoalInput`,
   `mapCategoryRow / mapCategoryInput`, `mapGroupRow / mapGroupInput`,
   `normalizePostRow / normalizePostWrite`.
8. The synthetic `Response` (a real `Response` object built from JSON) bubbles
   back up to the component.

A write (POST / PUT / DELETE) follows the same chain but additionally:

- Sets the longer 10 s timeout.
- Skips local‑cache serving on failure (writes must round‑trip to Firestore).
- Calls `logAction(...)` so meaningful changes land in the `activity_logs`
  collection for the Admin dashboard.

---

## 3. Authentication Flow

Authentication is **password‑based and presentation‑level** — it is not Firebase
Auth. The "token" is a deterministic string stored in `localStorage` and used by
`runRouter()` to identify the user.

```text
Login form ──POST /api/login──> runRouter
                                  ├─ if body.password matches ADMIN_PASSWORD ("janki_app")
                                  │     return { token: "client-admin-token", role: "super_admin" }
                                  │
                                  └─ else lookup admin_users by email + password
                                        return { token: "usr_<id>", role, id }
```

- `setLocalToken()` writes the token to both `localStorage` **and** a `document.cookie`
  (so SSR pages can read it). `getLocalToken()` falls back to
  `window.__inMemoryToken` if storage is blocked.
- `/api/me` (GET) re‑hydrates the user from the token:
  - `client-admin-token` → synthetic super admin record.
  - `usr_<id>` → looks up the record in `admin_users` and strips the password.
- `/api/logout` simply writes a log entry; the client clears its own token.
- `useAuthQuery()` caches the `/api/me` result for 5 min.

> Because the entire router runs in the browser, the password check happens on
> the client. This is acceptable only because the **real** access boundary is
> Firestore Security Rules. Phase G of the plan will lock those down (currently
> `firestore.rules` allows all reads/writes — see §10).

---

## 4. Domain Model (Firestore collections)

| Collection | Maps to | Shape (selected fields) |
|---|---|---|
| `admin_users` | `AdminUser` | `id, email, password, full_name, role, privileges[], created_at` |
| `groups` | `Group` | `id, name, order, is_system` |
| `categories` | `Category` | `id, name, group_id, order` |
| `master_goals` | `MasterGoal` | `id, title, points, description, category_id, category_name, order` |
| `students` | `Student` | `id, name, bio, photo, tags[], assigned_goals[], total_points, previous_rank, created_at` |
| `posts` | `Post` | `id, title, slug, content, excerpt, cover_image, author, status, category, tags[], organic_views, offset_views, published_at, …` |
| `settings` | App settings | Single doc `id="appearance"` with `{ data: {...themes, branding} }` |
| `activity_logs` | Audit log | `id, action, details, type ("system" \| "education"), timestamp` |
| `app_events` | Analytics | UUID id (server‑generated), `created_at`, payload |
| `page_views` | Traffic | Doc per day: `date, hits, unique_hits, article_reads` |

Hierarchy: **Group → Category → MasterGoal**. A `Student.assignedGoals[]`
references `goalId` plus per‑student completion state (`completed`,
`completedAt`, `completionNote`, marker admin).

Mappers convert between Firestore's `snake_case` and the app's `camelCase`. New
fields require both directions to be updated — that's a common source of bugs.

---

## 5. Route Catalogue (`runRouter`)

All paths below are emulated. Auth column shows the practical requirement
(enforced today only by UI gating).

| Method + Path | Purpose | Notes |
|---|---|---|
| `POST /api/login` | Sign in | Super‑admin password or admin email+password |
| `POST /api/logout` | Sign out (audit) | Token cleared client‑side |
| `GET  /api/me` | Hydrate session from token | Used by `useAuthQuery` |
| `GET/POST/PUT/DELETE /api/admin_users` | CRUD admins | Password stripped on GET |
| `GET /api/settings`, `PUT /api/settings` | Read/write the `appearance` settings document | Single‑row upsert keyed on `id` |
| `GET/POST /api/students`, `PUT/DELETE /api/students/:id` | Student CRUD | `assigned_goals` round‑trips as JSON |
| `POST /api/students/snapshot-ranks` | Snapshot the current ranking into `previous_rank` for rank‑change indicators | Concurrency capped at 4 to avoid Firestore throttling |
| `GET/POST /api/categories`, `PUT/DELETE /api/categories/:id` | Category CRUD | |
| `GET/POST /api/masterGoals`, `PUT/DELETE /api/masterGoals/:id` | Goal CRUD | |
| `GET/POST /api/groups`, `PUT/DELETE /api/groups/:id` | Group CRUD | DELETE detaches child categories instead of cascading |
| `POST /api/groups/reorder` | Persist drag‑and‑drop order across the Groups list | Bulk update via `runWithConcurrency` |
| `POST /api/categories/reorder` | Persist order; optionally re‑parents to a new `groupId` | Used by the cross‑group drag in Admin |
| `POST /api/masterGoals/reorder` | Persist order; optionally re‑parents to a new `categoryId` | Used by cross‑category goal drag |
| `POST /api/track-visit` | Increment daily `hits` / `unique_hits` | Upserts the day's `page_views` row |
| `POST /api/track-article` | Increment `article_reads` + the post's `organic_views` | Two‑step write |
| `GET/POST /api/logs` | Read/append `activity_logs` | GET limited to 500, ordered desc |
| `GET/POST /api/events` | Read/append `app_events` | POST strips client `id` so Firestore generates a UUID |
| `GET /api/stats?range=&from=&to=` | Aggregate stats for the admin dashboard | Range presets: `today / 1w / month / year / all` plus `from`/`to` overrides; computes `computeStats()` from `page_views` |
| `GET/POST /api/posts`, `PUT/DELETE /api/posts/:id` | Blog CRUD | `normalizePostRow/Write` reconcile legacy `author/cover_image` columns |
| `POST /api/seeding` | First‑run seed: creates default categories, goals, students, posts, and the master admin if missing | Idempotent — checks emptiness before inserting |
| `POST /api/snapshot/restore` | Re‑insert a JSON snapshot (categories, masterGoals, students, posts, logs) | Used by Admin Import/Export |

Unmatched paths return `404 No handler for <method> <path>`.

---

## 6. Connection Strategy

The app supports multiple Firestore connections, but in practice it always
uses one:

- `DEFAULT_CONNECTION_ID = "lovable-cloud-firebase"`.
- `getActiveConnection()` returns the singleton built from
  `firebase-applet-config.json`.
- `firestoreDriver` keeps two caches keyed by `connId`: `appCache` of
  `FirebaseApp` instances and `dbCache` of `Firestore` instances. This means
  the SDK is initialized **once per connection**, no matter how many calls go
  through it.
- `initializeFirestore(app, { experimentalForceLongPolling: true }, databaseId)`
  is preferred over `getFirestore()` so the named database id from
  `firestoreDatabaseId` (currently `"ngambonpesantren-db-firebase-01"`) is
  honoured. Phase 0 hardens this in `src/lib/firebase/firebase.ts` with
  `persistentLocalCache + persistentMultipleTabManager` (multi‑tab IndexedDB
  offline persistence) and a Safari private‑mode fallback to memory.
- Failure fallback: if a non‑default connection fails, `markConnectionFailed`
  is called and the request is retried against the default. Today this is a
  no‑op because only the default exists; the hook is preserved for the
  multi‑connection feature.

---

## 7. Caching Layers

Three caches stack on top of the same data:

1. **TanStack Query** (`useAppDataQuery` etc.) — in‑memory, governs UI refetch
   timing (`staleTime: 60–120 s`). Mutations invalidate the `app-data` key.
2. **`localCache` (`src/lib/localCache.ts`)** — `localStorage`‑backed, keyed
   per connection (`read::<url>`). Written automatically after a successful
   GET; read only on network failure to keep the UI alive offline (Phase H
   will extend this with Service Worker rules).
3. **Firestore SDK persistence** — once Phase 0 lands,
   `persistentLocalCache` keeps a full IndexedDB mirror, sharing it across
   tabs via `persistentMultipleTabManager`. The SDK also queues writes while
   offline and replays them on reconnect (the foundation for Phase H
   background sync).

---

## 8. Bulk & Concurrency Patterns

Many flows fan out into hundreds of writes (rank snapshots, snapshot restore,
DnD reorders). To avoid hammering Firestore and the proxy, all of them route
through `runWithConcurrency(items, worker, limit = 4)`. It runs at most four
workers in parallel and never lets one failed item poison the batch
(failures are logged and the slot is set to `undefined`).

Touchpoints:

- `POST /api/students/snapshot-ranks` — one UPDATE per ranked student.
- `POST /api/groups/reorder`, `POST /api/categories/reorder`,
  `POST /api/masterGoals/reorder` — one UPDATE per moved item.
- Snapshot restore inserts each collection as a single batch via
  `connInsertReturning`.

The dependency order for restores is **groups → categories → master_goals →
students → posts → logs** so foreign keys (`group_id`, `category_id`,
`category_name`) resolve correctly. The Import/Export tab enforces the same
order when ingesting a `2.1-relational-groups` snapshot.

---

## 9. Analytics & Telemetry Flow

- `POST /api/track-visit` is called from the landing page on first paint, with
  `isUnique` toggled by a localStorage flag.
- `POST /api/track-article` is called once per session per article from
  `BlogPostPage` (gated by `sessionStorage` to prevent double counting).
- Both write into the daily `page_views` doc keyed on `date` (`YYYY‑MM‑DD`)
  using upsert semantics so concurrent visitors merge cleanly.
- `computeStats(range, from, to)` aggregates `page_views` rows into the shape
  the Admin Statistics tab expects (`totalHits, articleReads, chartData[]`).
- Per‑post `organic_views` is incremented directly on the `posts` row inside
  `/api/track-article`.
- `app_events` is the open‑ended event sink (custom UI events). Inserts strip
  any client `id` so Firestore generates a real UUID.

---

## 10. Security Posture (today vs. planned)

**Today** `firestore.rules` is intentionally permissive:

```text
match /{document=**} {
  allow read, write: if true;
}
```

Combined with client‑side password auth, this means anyone with the Firebase
project's publishable config can read or mutate any document. That is the
single biggest risk in the app, and is why **Phase G** of the plan is to
introduce:

- Strict per‑collection rules gated by `request.auth` (or App Check tokens
  while we still rely on the client password scheme).
- Firebase App Check to block usage of the config from outside the app.
- A migration path toward Firebase Auth so rules can use `request.auth.uid`
  directly.

Until Phase G ships, treat the backend as **client‑trusted**.

---

## 11. Failure Modes and Resilience

| Failure | Behaviour |
|---|---|
| Timeout on a GET | One automatic retry, then served from `localCache` if available |
| Timeout on a write | Bubbles up to the mutation; UI rolls back optimistic update via `onError` |
| `401 Unauthorized` | Token cleared, `auth-expired` event fired, user re‑routed to `/login` |
| Active connection 5xx | `markConnectionFailed` → retry against `DEFAULT_CONNECTION_ID` |
| Firestore unreachable (cold offline) | SDK serves IndexedDB cache (Phase 0); cacheable GETs additionally fall back to `localCache` |
| Firestore DB id missing | `testFirestore` returns an actionable error with rules + console guidance |
| Bulk write partial failure | `runWithConcurrency` keeps going; failed items are logged but do not abort the batch |

---

## 12. How to Add a New Endpoint

1. Decide the URL (e.g. `POST /api/notes`).
2. Add a `mapNoteRow` / `mapNoteInput` pair if the Firestore shape differs
   from the app shape.
3. Add a branch to `runRouter()` in `src/lib/firebaseApi.ts` that calls
   `connSelect / connInsert / connUpdate / connDelete` as appropriate.
4. If it's a GET that the UI reads often, add it to the cacheable‑path list
   inside `firebaseApiFetch` so it benefits from `localCache` fallbacks.
5. Add the collection name to `FIREBASE_APP_COLLECTIONS` in
   `firestoreDriver.ts` so the connection probe and seeder know about it.
6. Wrap the call in a TanStack Query hook in `src/hooks/useAppQueries.ts`
   (with `onMutate` optimistic updates if it's a write).
7. Update `firestore.rules` (and the upcoming Phase G rule set) so the
   collection is actually reachable.
8. Update `AdminImportExportTab.tsx` if the new collection should be part of
   the snapshot.

---

## 13. TL;DR

- There is **no server**. Every `/api/...` call is intercepted in the browser
  and translated into Firebase Web SDK calls against Firestore.
- `src/lib/firebaseApi.ts` is the entire backend. Read it like you would read
  `routes.ts` in an Express app.
- Auth is a password‑gated localStorage token, not Firebase Auth.
- Resilience comes from three layered caches (TanStack Query → localCache →
  Firestore IndexedDB) plus a 4‑wide concurrency limiter for bulk writes.
- The current Firestore rules are wide open; locking them down is Phase G,
  and the offline/PWA work that builds on the SDK's persistence layer is
  Phase H.
