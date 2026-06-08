# Plan — Global Dynamic Extra Fields for Students

## 1. Goal
Add a structured, application-wide set of "extra" fields to student profiles (e.g. Tanggal Lahir, Ukuran Seragam, Riwayat Medis) where:
- Field **definitions** (id, label, isPublic) live in one global blueprint.
- Field **values** live inside each student document under a single `extraData` map.
- Admin form auto-renders inputs from the blueprint — labels are never user-typed.
- Profile view filters fields by `isPublic` for public viewers, shows all (with "Internal" badge) for admins.

No existing data is touched or migrated; the feature is purely additive and backwards compatible.

---

## 2. Configuration Location (Blueprint)

**Decision: a single TypeScript constant** at `src/lib/studentFields.ts`.

Why not Firestore?
- Zero extra reads on every page load (saves quota — aligns with the existing aggressive-caching posture).
- Type-safe: blueprint ids become a discriminated union usable across the form and the profile view.
- Changing a label or flipping `isPublic` is a one-line code edit + redeploy — acceptable for a small, slow-changing list of fields.

If the team later wants non-developer editing, this same module can be swapped for a `settings/student_fields` Firestore doc behind the same exported API — without touching consumers.

```ts
// src/lib/studentFields.ts
export interface ExtraFieldDef {
  id: string;            // stable key, never rename
  label: string;         // shown in form + profile
  isPublic: boolean;     // true → visible on public profile
  type?: "text" | "date" | "textarea"; // optional, defaults to "text"
  placeholder?: string;
}

export const GLOBAL_EXTRA_FIELDS: ExtraFieldDef[] = [
  { id: "field_birth_date",      label: "Tanggal Lahir",    isPublic: true,  type: "date" },
  { id: "field_uniform_size",    label: "Ukuran Seragam",   isPublic: false },
  { id: "field_medical_history", label: "Riwayat Medis",    isPublic: false, type: "textarea" },
];

export const PUBLIC_EXTRA_FIELDS   = GLOBAL_EXTRA_FIELDS.filter(f => f.isPublic);
export const INTERNAL_EXTRA_FIELDS = GLOBAL_EXTRA_FIELDS.filter(f => !f.isPublic);
```

---

## 3. Data Model Changes

### 3.1 `Student` type — `src/lib/types.ts`
Add one optional field. Fully backwards compatible.

```ts
export interface Student {
  // ...existing fields...
  /** Values for GLOBAL_EXTRA_FIELDS, keyed by field id. Missing keys = no value. */
  extraData?: Record<string, string>;
}
```

### 3.2 Firestore
- Collection: `students` (unchanged).
- New optional map field: `extraData: { [fieldId]: string }`.
- No migration: documents without `extraData` are treated as "no extras filled in".
- Firestore Rules: existing `students` admin-write rule already covers arbitrary fields. No rule changes required.

---

## 4. Component Updates

### 4.1 Admin Form — `src/components/admin/AdminStudentsTab.tsx`
Inside the Add/Edit Student modal, append a new section **"Informasi Tambahan"** right after the existing photo/bio block.

Behavior:
- Loop `GLOBAL_EXTRA_FIELDS.map(...)` and render the correct input per `type`:
  - `text` / `date` → `<Input type={type ?? "text"} />`
  - `textarea` → `<Textarea />`
- Each input is **controlled** against `formState.extraData?.[field.id] ?? ""`.
- On change: `setFormState(s => ({ ...s, extraData: { ...(s.extraData ?? {}), [field.id]: value } }))`.
- Render a small `Badge variant="secondary"` saying **"Internal"** next to the label when `!field.isPublic`, so the admin understands visibility.
- On submit: include `extraData` in the payload passed to the existing student-save mutation. Empty strings are kept as-is (cheap; no quota impact).

No new save/mutation code is required — the existing `updateDoc`/`setDoc` path already does `{ merge: true }` and will accept the new map verbatim.

### 4.2 Public Profile View — `src/components/pages/StudentProfilePage.tsx` (+ `StudentProfileClient.tsx`)
Add a presentational sub-component `ExtraFieldsBlock`:

```tsx
function ExtraFieldsBlock({
  student,
  mode,
}: { student: Student; mode: "public" | "admin" }) {
  const fields = mode === "public" ? PUBLIC_EXTRA_FIELDS : GLOBAL_EXTRA_FIELDS;
  const rows = fields
    .map(f => ({ f, value: student.extraData?.[f.id]?.trim() }))
    .filter(r => r.value); // hide empty values in both views

  if (rows.length === 0) return null;

  return (
    <section aria-label="Informasi Tambahan">
      <h3>Informasi Tambahan</h3>
      <dl>
        {rows.map(({ f, value }) => (
          <div key={f.id}>
            <dt>
              {f.label}
              {mode === "admin" && !f.isPublic && (
                <Badge variant="secondary">Internal</Badge>
              )}
            </dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

Determine `mode` from the existing `useAuthRole()` hook (`isAdmin ? "admin" : "public"`). This keeps the public/private filter on the **client-rendered** profile section and avoids server-side leakage because the ISR-cached server component will only ship `PUBLIC_EXTRA_FIELDS` values — see §5.

### 4.3 Server-side leak prevention — `src/lib/firebase/serverFetch.ts`
In the server fetch used by `app/student/[id]/page.tsx` (ISR-cached), strip non-public keys from `extraData` before returning to the RSC. Admins fetch the full record through the authed `/api/...` route the client already uses, so admin view still gets everything.

```ts
// inside getStudentForPublicProfile()
const allowed = new Set(PUBLIC_EXTRA_FIELDS.map(f => f.id));
if (raw.extraData) {
  raw.extraData = Object.fromEntries(
    Object.entries(raw.extraData).filter(([k]) => allowed.has(k))
  );
}
```

This guarantees internal fields never appear in HTML source, even via "view source".

---

## 5. Step-by-Step Execution

```text
Phase 1 — Blueprint & Types  (no UI yet)
  1. Create src/lib/studentFields.ts with GLOBAL_EXTRA_FIELDS + helpers.
  2. Add `extraData?: Record<string,string>` to Student in src/lib/types.ts.
  3. bunx tsc --noEmit — must pass.

Phase 2 — Admin Form
  4. In AdminStudentsTab.tsx, add "Informasi Tambahan" section that loops the blueprint.
  5. Wire controlled inputs into formState.extraData.
  6. Add "Internal" badge next to non-public labels.
  7. Manual test: add a value to each field, save, reload modal — values persist.

Phase 3 — Profile Display
  8. Build ExtraFieldsBlock component (co-located in StudentProfileClient.tsx).
  9. Render it inside the profile, passing mode based on useAuthRole().
 10. Manual test: as admin → all filled fields show, internal ones badged.
                  as anon → only public fields show.

Phase 4 — Server-Side Filter
 11. Patch serverFetch.ts to strip non-public keys for the public RSC path.
 12. View page source on /student/[id] — confirm no internal values present.

Phase 5 — Verify
 13. bunx tsc --noEmit clean.
 14. Existing students with no extraData render normally (section hidden).
 15. Existing import/export and assign-goals flows unaffected (no schema-required fields added).
```

---

## 6. Files Touched

| Path | Action |
| --- | --- |
| `src/lib/studentFields.ts` | new — blueprint + helpers |
| `src/lib/types.ts` | add `extraData?` to `Student` |
| `src/components/admin/AdminStudentsTab.tsx` | edit — render dynamic inputs |
| `src/components/pages/StudentProfilePage.tsx` | edit — render `ExtraFieldsBlock` |
| `src/components/pages/clients/StudentProfileClient.tsx` | edit — same, client island |
| `src/lib/firebase/serverFetch.ts` | edit — strip non-public keys for public RSC |

No Firestore migration, no rules change, no new collections, no breaking changes to imports/exports.

---

## 7. Open Questions

1. **Date input** — OK with native `<input type="date">` (ISO `YYYY-MM-DD`), or do you want the existing `dd-MM-yyyy` text format like the example shows?
2. **Editing the blueprint** — keep it as a code constant (developer edit + redeploy), or do you want the Phase 2 follow-up to expose a "Manage Fields" UI backed by a `settings/student_fields` Firestore doc?
3. Should empty-value fields render as a dash in the admin view, or stay hidden like the public view? (Current plan: hidden in both.)

Please confirm and I'll implement Phase 1 → 5 in order.
