## Goal
Refactor data model from 2-tier (Category → Goal) to 3-tier (Group → Category → Goal) with strict user-defined `order` on every level, and update all consuming UI surfaces.

## 1. Schema (`src/lib/types.ts`)

```ts
export interface Group {
  id: string;
  name: string;
  order: number;
  isSystem?: boolean;
}

export interface Category {
  id: string;
  name: string;
  groupId: string;     // NEW: parent
  order: number;       // NEW: manual sort
}

export interface MasterGoal {
  id: string;
  categoryId: string;  // NEW: canonical FK (keep `categoryName` as denormalized read-only)
  categoryName: string;
  title: string;
  points: number;
  description: string;
  order: number;       // NEW
}
```

`AssignedGoal` and `StudentAchievement` are unchanged (they reference `goalId`).

### Backwards compatibility
- Read paths: when `categoryId`/`groupId`/`order` are absent, fallback to current `categoryName` lookup and synthesize `order = createdAt` index. This keeps the existing dataset rendering while migration runs.
- A one-time migration helper (client-side, optional) assigns sequential `order` to existing Categories/Goals and creates a default Group `Umum` (`isSystem: true`) for orphans.

## 2. API contract (Go backend — payload shape only)

New REST endpoints (mirroring `/api/categories`):

- `GET/POST /api/groups`, `PUT/DELETE /api/groups/:id`
- `POST /api/groups/reorder`     body: `{ items: [{id, order}, ...] }`
- `POST /api/categories/reorder` body: `{ groupId, items: [{id, order}, ...] }`
- `POST /api/masterGoals/reorder` body: `{ categoryId, items: [{id, order}, ...] }`

Bulk reorder uses a single transactional write so partial failures don't leave gaps. Frontend sends the full ordered ID list after every move; backend overwrites `order` to the array index. This is simpler & idempotent vs. swap semantics.

## 3. `AdminGoalsTab.tsx` — 3-tier accordion

Split into sub-components (kept in same file for simplicity):

```text
<GroupAccordion>
  ├── header: name, +Category btn, ▲▼ reorder, edit/delete menu
  └── <CategoryAccordion> (sorted by order)
        ├── header: name, +Goal btn, ▲▼ reorder, edit/delete menu
        └── <GoalCard grid>  (sorted by order)
              └── card: title, points, ▲▼ reorder, edit/delete menu
```

- Top toolbar: "Group Baru" input + button (replaces standalone Category input).
- "Category Baru" lives inside each Group header.
- "Tugas Baru" modal gains a `Group` dropdown that filters the `Category` dropdown.
- Reorder handlers call `moveItem(list, idx, dir)` then POST to the relevant `/reorder` endpoint with optimistic local update + `refreshData()` on success.
- All three render passes use `[...arr].sort((a,b)=>a.order-b.order)`.

## 4. `AdminStudentsTab.tsx`

- `groupedGoalsByGroup` memo: builds `Group → Category → MasterGoal[]`, all sorted by `order`.
- `StudentAdminModal` goal selector becomes a 3-tier collapsible list (reuses GoalAuditCard inside Category accordions inside Group accordions). Bulk-assign buttons live at Group **and** Category headers ("Tugaskan semua di Adab").
- Filter/search input filters at goal level but preserves parent groupings (hide empty parents).

## 5. `StudentProfilePage.tsx` — Papan Tugas

- Render Groups (sorted) → Categories (sorted) → Goals (sorted).
- Per-Category progress bar: `completed / assigned in that category`.
- Per-Group summary chip showing aggregate `done/total` and total points earned.
- Wrap each Group panel in `<motion.div layout>` and goal list in `<AnimatePresence>` for smooth expand/collapse, matching existing framer-motion patterns.

## 6. File touch list

- `src/lib/types.ts` — extend interfaces
- `src/components/admin/AdminGoalsTab.tsx` — full rewrite of layout, add Group CRUD + reorder, extract `<GroupAccordion>`, `<CategoryAccordion>`, `<GoalCard>` sub-components within the file
- `src/components/admin/AdminStudentsTab.tsx` — refactor `groupedGoals`, update `StudentAdminModal` goal selector to 3-tier
- `src/components/pages/StudentProfilePage.tsx` — refactor Papan Tugas section
- `src/hooks/useAppQueries.ts` — add `groups` query + `useReorderMutation` helpers (if pattern exists)
- New: `src/lib/hierarchy.ts` — pure helpers (`buildHierarchy`, `sortByOrder`, `moveItem`) reused by all three components

No CSV/import-export changes required — those operate on flat collections and will pick up new columns automatically (verified against existing `AdminImportExportTab`).

## Risks / notes
- Existing data lacks `groupId`/`order`. The fallback layer in `buildHierarchy` keeps the UI usable on day 1; admins gradually assign Groups via the new UI, or you run the optional migration helper.
- Reorder endpoint is the only new backend contract — everything else is additive fields on existing endpoints.
- This is purely the frontend refactor; the Go backend handlers must be implemented separately to honor `groupId`/`order` and the three `/reorder` endpoints.
