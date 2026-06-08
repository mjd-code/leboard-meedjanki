# Implementation Plan — Smart Import, Image Pipeline, Idempotent Goal Assignment

> Scope: three changes against the existing Firebase / Firestore + React (Next.js) app.
> No code is being written yet — this document is the contract to approve.

---

## 0. Architecture Overview

The app already uses:

- **Firestore collections**: `students`, `master_goals`, `categories`, `groups`, plus `posts`, `student_achievements`, etc.
- **Admin surfaces**: `src/components/AdminImportExportTab.tsx` (CSV/JSON import-export), `src/components/admin/AdminStudentsTab.tsx` (assign goals), `src/components/ui/ImageUploader.tsx` + `src/lib/uploadImage.ts` (image pipeline — currently Base64 only).
- **Data layer**: `src/lib/firebaseApi.ts` and `src/hooks/useAppQueries.ts` (React Query + Firestore).

The three tasks slot in without changing the public data shape consumed by the UI:

```text
 ┌──────────────┐    CSV/JSON      ┌────────────────────┐   batched upserts   ┌────────────┐
 │  Admin UI    │ ───────────────▶ │  Import Planner    │ ──────────────────▶ │ Firestore  │
 │ (Import tab) │  diff + dry-run  │ (pure, testable)   │  writeBatch(merge)  │ collections│
 └──────────────┘                  └────────────────────┘                     └────────────┘

 ┌──────────────┐  File → Canvas → WebP   ┌──────────────────┐  putFile   ┌──────────────┐
 │ ImageUploader│ ──────────────────────▶ │ uploadImage.ts   │ ─────────▶ │ Firebase     │
 │ (cropper)    │                         │ (Storage client) │   URL      │ Storage      │
 └──────────────┘                         └──────────────────┘            └──────────────┘
                                                   │
                                                   ▼
                                         students/{id}.photo = URL

 ┌──────────────┐  click "Assign All"   ┌──────────────────────┐  arrayUnion / setDoc(merge)
 │ AdminStudents│ ────────────────────▶ │ assignGoalsIdempotent │ ──────────────────────────▶ Firestore
 └──────────────┘                       └──────────────────────┘
```

No new collections are required. One new Storage bucket path (`students/{id}/avatar.webp`) and one optional `migrations` log doc.

---

## 1. Database / Schema Adjustments

Minimal — all changes are additive and backwards compatible.

| Collection      | Field            | Change                                                                                        |
| --------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| `students`      | `photo`          | Semantics change: now a Firebase Storage URL (https://…) instead of `data:image/...;base64`. Legacy Base64 values continue to render. |
| `students`      | `photoPath`      | **NEW (optional)** — Storage object path (e.g. `students/abc123/avatar-1733600000.webp`) used for cleanup on replace. |
| `students`      | `assignedGoals`  | Invariant: array of `AssignedGoal` with **unique `goalId`**. Enforced in code (Firestore can't enforce it). |
| `master_goals`  | `id`             | Continue to be the canonical merge key for import.                                            |
| `categories`    | `id`             | Merge key.                                                                                    |
| `groups`        | `id`             | Merge key.                                                                                    |
| `migrations`    | `{name, ranAt, stats}` | **NEW (optional)** — one doc per healing run so we don't repeat the dedupe.            |

Firestore Rules: extend `students` rule to allow `photoPath` writes from admins; add `storage.rules` for `students/{uid}/**` (admin write, public read).

---

## 2. Task 1 — Smart Data Import & Synchronization (Idempotent Merge)

### 2.1 Goals
- Round-trip safe: Export → edit in Excel → Re-import.
- Never delete. Never overwrite fields the CSV doesn't carry.
- Show a dry-run diff before commit.

### 2.2 Module layout
New file: `src/lib/import/planImport.ts` — pure, unit-testable.

```ts
type Mode = "students" | "master_goals" | "categories" | "groups";

interface ImportPlan<T> {
  toCreate: T[];                 // no id, or id not found
  toUpdate: { id: string; before: T; after: T; changedFields: string[] }[];
  unchanged: number;
  invalid: { row: number; reason: string }[];
}

function planImport<T>(mode: Mode, incoming: any[], existing: T[]): ImportPlan<T>
```

- Validates each row with a **Zod schema per mode** (`studentRowSchema`, `goalRowSchema`, …).
- Compares by `id`. Missing/blank `id` → `toCreate` (a new `crypto.randomUUID()` is assigned at commit time).
- For updates: computes `changedFields` via shallow diff after coercing types. Only changed fields are written.
- Relationship integrity:
  - `master_goals.categoryId` must exist in `categories` (current or incoming). If not, row is moved to `invalid`.
  - `categories.groupId` must exist in `groups`.
  - `students.assignedGoals[].goalId` must exist in `master_goals`. Missing references → row marked invalid (never silently dropped).

### 2.3 Commit (writer)
New file: `src/lib/import/commitImport.ts`

- Uses `writeBatch` in chunks of 450 ops.
- `setDoc(ref, partial, { merge: true })` for both create and update (true upsert). Never `deleteDoc`.
- Wraps each chunk in try/catch; on failure, surfaces the failed chunk index so the user can retry without re-running the whole import.
- Writes a summary toast: `"Updated 5, Created 2, Skipped 13 unchanged"`.

### 2.4 UI changes — `AdminImportExportTab.tsx`
- Add an **"Analyze"** step: parse file → call `planImport` → show a modal:

```text
┌─ Import preview ──────────────────────────────┐
│ Students                                       │
│   + 2 new       (Ahmad, Bilal)                 │
│   ~ 5 updated   (3 photo, 2 bio, …)            │
│   = 174 unchanged                              │
│   ! 1 invalid   (row 88: groupId not found)    │
│                                                │
│ [ Cancel ]                       [ Commit ]    │
└────────────────────────────────────────────────┘
```

- "Commit" is disabled while `invalid.length > 0` unless the admin toggles "ignore invalid rows".
- Existing CSV export already includes `id` for every row, so a round-trip is naturally idempotent.

---

## 3. Task 2 — Optimized Photo & Image Management

### 3.1 Pipeline
Replace the Base64 path in `src/lib/uploadImage.ts` and `src/components/ui/ImageUploader.tsx`:

```text
File ─▶ Cropper (existing) ─▶ Canvas resize (max 800px long edge)
      ─▶ canvas.toBlob('image/webp', 0.82)
      ─▶ uploadBytesResumable(ref, blob, { contentType: 'image/webp', cacheControl: 'public,max-age=31536000,immutable' })
      ─▶ getDownloadURL  ──▶ { url, path }
```

Quality target: ~50–120 KB for avatars (100–400px), ~150–300 KB for cover images (≤1200px).

### 3.2 New / changed files
- `src/lib/storage.ts` (new) — thin wrapper around Firebase Storage: `uploadWebp(file, folder, ownerId)`, `deleteByPath(path)`.
- `src/lib/uploadImage.ts` — rewrite `uploadImageWithCompression` to:
  1. Convert to WebP blob with the canvas pipeline above.
  2. Upload to Storage at `${folder}/${ownerId ?? 'misc'}/${uuid}.webp`.
  3. Return `{ url, path }` (caller persists both).
- `ImageUploader.tsx` — `onUploadSuccess` becomes `(payload: { url: string; path: string }) => void`. Old `(url)` callers get a small shim during the transition.
- Consumers (`AdminStudentsTab`, `AdminBlogTab`, `AdminUserManagement`, `TiptapEditor`) — persist `photoPath` alongside `photo`.

### 3.3 Cleanup on replace
When saving a student/admin/post:
```ts
if (next.photoPath && next.photoPath !== prev.photoPath && prev.photoPath?.startsWith('students/')) {
  await deleteByPath(prev.photoPath); // best-effort, swallow 404
}
```
Legacy Base64 `photo` values have no `photoPath` → cleanup is a no-op, safe to leave in place.

### 3.4 Backwards compatibility
`ImageWithFallback` already handles arbitrary URLs and `data:` strings. No reader changes needed.

### 3.5 Storage rules (high level)
```text
match /students/{studentId}/{file=**} {
  allow read: if true;
  allow write: if request.auth != null && hasAdminClaim();
}
```

---

## 4. Task 3 — Fix "Assign All Goals" Duplication

### 4.1 Root cause
`AdminStudentsTab.tsx` currently does:

```ts
const newAssignedGoals = [...student.assignedGoals, ...allMasterGoals.map(g => ({ goalId: g.id, completed: false }))];
```

No dedupe → clicking twice = 2× entries (181 → 362; one student in prod shows 354 because some goals existed already).

### 4.2 Fix — single source of truth helper
New file: `src/lib/assignGoals.ts`

```ts
export function mergeAssignments(
  existing: AssignedGoal[],
  goalIdsToAdd: string[],
): AssignedGoal[] {
  const byId = new Map(existing.map(a => [a.goalId, a]));
  for (const id of goalIdsToAdd) {
    if (!byId.has(id)) byId.set(id, { goalId: id, completed: false });
  }
  return Array.from(byId.values());
}
```

All call sites (Assign-All, Assign-by-Category, Assign-by-Group, single Assign) go through this. Writes use `updateDoc({ assignedGoals: merged })` — we can't use `arrayUnion` directly because elements are objects (Firestore equality is structural and would still duplicate `{goalId, completed:false}` if `completed` differs).

### 4.3 Mirror collection (`student_achievements`)
If the achievement junction is also written on assign, use a deterministic doc id `${studentId}_${goalId}` with `setDoc(..., { merge: true })` so re-assigning is a no-op.

### 4.4 Data healing
New file: `src/lib/migrations/dedupeAssignedGoals.ts`

- Iterate all `students`.
- For each, collapse `assignedGoals` by `goalId`, **preferring the completed entry** when duplicates exist (keeps points history).
- Write back only if length changed.
- Log `{studentId, before, after}` to a `migrations/dedupe-assigned-goals-<date>` doc.

Exposed as a one-click button in `AdminDatabaseTab` ("Heal duplicate goal assignments"), gated behind a confirm modal and `super_admin` role.

---

## 5. File Touch List

| Path                                                | Action |
| --------------------------------------------------- | ------ |
| `src/lib/import/planImport.ts`                      | new    |
| `src/lib/import/commitImport.ts`                    | new    |
| `src/lib/import/schemas.ts`                         | new    |
| `src/components/AdminImportExportTab.tsx`           | edit — wire Analyze/Commit modal |
| `src/lib/storage.ts`                                | new    |
| `src/lib/uploadImage.ts`                            | rewrite |
| `src/components/ui/ImageUploader.tsx`               | edit — return `{url, path}` |
| `src/components/admin/AdminStudentsTab.tsx`         | edit — use `mergeAssignments`, persist `photoPath` |
| `src/components/admin/AdminBlogTab.tsx`             | edit — persist `photoPath` |
| `src/components/admin/AdminUserManagement.tsx`      | edit — persist `photoPath` |
| `src/lib/assignGoals.ts`                            | new    |
| `src/lib/migrations/dedupeAssignedGoals.ts`         | new    |
| `src/components/admin/AdminDatabaseTab.tsx`         | edit — Heal button |
| `src/lib/types.ts`                                  | add `photoPath?: string` to `Student`, `AdminUser`, `Post` |
| `firestore.rules` / `storage.rules`                 | edit — admin write for `students/**` storage path |

---

## 6. Verification & Testing

### Task 1 — Import
1. Export `students` CSV. Re-import unchanged → modal must show `0 created, 0 updated, N unchanged`.
2. Edit one cell in 3 rows → re-import → `0 created, 3 updated`. Confirm in Firestore that only those fields changed and `assignedGoals` is untouched.
3. Add 2 new rows without `id` → `2 created`. Confirm they have fresh UUIDs.
4. Add a row with `groupId = "nope"` → row appears under `invalid`; commit is blocked.
5. Delete a row from the CSV → re-import → record is NOT removed from Firestore (regression guard against destructive imports).

### Task 2 — Images
1. Upload a 4 MB JPEG → resulting Storage object is `.webp` and < 300 KB; download URL is saved on the student doc.
2. Replace the photo → old Storage object is deleted (`getMetadata` returns 404); new URL is on the doc.
3. Network tab: subsequent loads of the avatar hit Storage's CDN with `cache-control: immutable`.
4. Legacy student with `data:image/...;base64` still renders.

### Task 3 — Assignment
1. Pick a fresh student, click "Assign All" once → `assignedGoals.length === master_goals.length`.
2. Click "Assign All" again → length unchanged. No completed flags reset.
3. Run the healing migration on a seeded student with duplicate entries (181 → 362) → ends at 181, completed goals preserved.
4. Concurrent test: open the same student in two tabs, click Assign All in both. Final length is still equal to `master_goals.length` (the second write merges atomically because we read-merge-write inside a transaction).

### Cross-cutting
- `bunx tsc --noEmit` clean.
- Manual smoke pass: admin tabs (Students, Goals, Import/Export, Database) render with no console errors.
- Lighthouse: avatar-heavy pages (Leaderboard, Landing) show transfer-size reduction vs baseline.

---

## 7. Open Questions (please confirm before I start coding)

1. **Storage bucket**: is the existing Firebase Storage bucket already enabled and admin-writable, or do you want me to add the `storage.rules` in the same PR?
2. **Healing scope**: run the dedupe automatically on first admin login after deploy, or keep it strictly as a manual button in `AdminDatabaseTab`?
3. **Image quality**: OK with `webp @ q=0.82, max 800px long edge` as the avatar default? (Roughly 60–120 KB.)
4. **Import invalid rows**: should "ignore invalid rows" be allowed at all, or always block until the CSV is clean?

Once you confirm, I'll implement in this order: Task 3 (smallest, highest-impact bug) → Task 2 (image pipeline) → Task 1 (import planner + UI).