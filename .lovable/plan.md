# Full Native Firebase Migration & CRUD Optimization

## Goal
Eliminate the legacy `apiFetch` / `firebaseApi` / `dbConnections` / `db/adapter` proxy stack. Every consumer talks directly to Firestore via `firebase/firestore`, wrapped in TanStack Query, with public read pages converted to Next.js RSC + ISR.

## Phase A — Firestore data access foundation

Create two new files:

**`src/lib/firebase/collections.ts`** — typed collection refs with `withConverter<T>()`:
- `studentsCol`, `goalsCol`, `categoriesCol`, `groupsCol`, `blogPostsCol`, `adminUsersCol`, `pageViewsCol`, `appEventsCol`, `activityLogsCol`
- `settingsDoc` (doc ref to `settings/app`)

**`src/lib/firebase/queries.ts`** — composable helpers:
- `listAll<T>(ref)` — full collection
- `listPaged<T>(ref, {pageSize, cursor, orderField})` — cursor pagination, default `limit(100)`
- `getById<T>(ref, id)` — `getDoc` with cache-first then network
- `countOf(ref)` — uses `getCountFromServer`
- `upsert(ref, id, data)` — `setDoc(..., {merge: true})`
- `patch(ref, id, data)` — `updateDoc`
- `remove(ref, id)` — `deleteDoc`
- `bulkWrite(ref, rows, mode)` — chunked `writeBatch` (≤450 ops/batch)

## Phase B — Domain hooks

`src/hooks/queries/` with one file per domain. Each exports `useXList`, `useX(id)`, `useCreateX`, `useUpdateX`, `useDeleteX`, `useBulkX`:

- `useStudents.ts`
- `useGoals.ts`
- `useCategories.ts`
- `useGroups.ts`
- `useBlogPosts.ts`
- `useAdminUsers.ts`
- `useAppSettings.ts`
- `useAdminStats.ts`
- `useAppEvents.ts`

Conventions:
- Query keys: `['students']`, `['students', id]`
- `staleTime` 10 min, `gcTime` 24 h (already in `ReactQueryClientProvider`)
- Mutations: optimistic via `setQueryData` + rollback in `onError`, then `invalidateQueries` in `onSettled`
- `onSnapshot` only on admin live tiles; everywhere else `getDocs`

## Phase C — Migrate consumers (20 files)

Order by blast-radius (smallest first):

1. **Public reads (will become RSC in Phase D)**: `LandingPage`, `BlogListPage`, `BlogPostPage`, `CategoryPage`, `CategoryIndexPage`, `LeaderboardPage`, `StudentProfilePage`
2. **Layout & shared**: `ClientLayout`, `Tracker`, `FloatingSettingsFab`, `useAuthRole`, `utils/hierarchy.ts`
3. **Auth**: `LoginPage` → `signInWithEmailAndPassword` direct
4. **Admin tabs**: `AdminDashboard`, `AdminStudentsTab`, `AdminGoalsTab`, `AdminBlogTab`, `AdminAppearanceTab`, `AdminUserManagement`, `AdminDatabaseTab`, `AdminImportExportTab`

For each file: swap `apiFetch(...)` for the matching hook/helper, drop dead `useEffect` plumbing, leave UI untouched.

## Phase D — Next.js App Router optimization

Convert read-only public routes to **Server Components** with ISR:

- `app/blog/page.tsx` — `revalidate = 600`
- `app/blog/[slug]/page.tsx` — `revalidate = 600` + `generateStaticParams` for popular slugs
- `app/berita/kategori/page.tsx` + `[slug]/page.tsx` — `revalidate = 600` + `generateStaticParams`
- `app/leaderboard/page.tsx` — `revalidate = 300`
- `app/student/[id]/page.tsx` — `revalidate = 300`
- `app/page.tsx` (landing) — `revalidate = 600`

Keep `app/admin/**` and interactive widgets as Client Components on Phase B hooks.

`src/app/api/data/route.ts` becomes a health endpoint only.

## Phase E — Demolition

Delete in order once Phase C is green and typecheck clean:

1. `src/lib/api.ts`
2. `src/lib/firebaseApi.ts` (801 lines)
3. `src/lib/dbConnections.ts`
4. `src/lib/firestoreDriver.ts` (re-target `AdminDatabaseTab` through Phase A first)
5. `src/lib/db/` folder (`adapter.ts`, `adapters/*`, `index.ts`, `mappers.ts`, `types.ts`, `example.server.tsx`)
6. `src/lib/firebaseClient.ts` (shim)
7. `src/integrations/supabase/*` if no imports remain
8. Stray shims in `src/lib/` whose home is `utils/` or `services/`

## Phase F — Verification

- `bunx tsc --noEmit` clean
- Manual smoke: landing, blog list+post, leaderboard, student profile, admin dashboard, students/goals/blog CRUD, import/export
- Firebase console: cold-load reads should be single-digit on cached public pages, ≤100 on admin lists
- Lighthouse on `/` and `/blog` to confirm SSR HTML without client Firestore round-trip

## Technical notes

- RSC uses the same `firebase/firestore` Web SDK with env config; no Admin SDK needed because reads are rule-gated public. If privileged reads land later, add `src/lib/firebase/admin.ts` (server-only).
- `withConverter` keeps `id` on read, strips it on write.
- All writes funnel through `bulkWrite`/`patch` — never 500 individual writes.
- `firestore.rules` untouched for now.

## Out of scope

- Firebase Admin SDK
- Schema / collection-name changes
- UI redesign of migrated screens

## Risk & sequencing

This is large (~25 files touched, ~10 new files, ~10 deletions). Phase A+B land first (additive, zero breakage). Phase C migrates in batches and runs typecheck between batches. Phases D and E only after C is fully green so we can revert any single phase cleanly.
