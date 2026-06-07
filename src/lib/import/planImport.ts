/**
 * Pure, dependency-free planner for the Smart Data Import feature.
 *
 * Given a list of incoming CSV/JSON rows + the current in-memory snapshot,
 * returns an `ImportPlan` describing exactly what would change:
 *   - `toCreate`  : rows with no id, or id not found in existing data
 *   - `toUpdate`  : rows whose id exists AND at least one field differs
 *   - `unchanged` : rows whose id exists and all fields match
 *   - `invalid`   : rows that failed schema/relationship validation
 *
 * The planner NEVER produces deletions. Rows that exist in `existing` but
 * are absent from `incoming` are simply left alone — round-trip safe.
 */

import { z } from "zod";

export type ImportMode = "students" | "goals" | "categories" | "groups";

export interface InvalidRow {
  row: number; // 1-based index into the incoming list (header is row 0)
  id?: string;
  reason: string;
}

export interface UpdatePlan<T> {
  id: string;
  before: T;
  after: T;
  changedFields: string[];
}

export interface CreatePlan<T> {
  /** May be empty — commit step assigns a fresh id if so. */
  id?: string;
  data: T;
  /** 1-based source row for error reporting. */
  row: number;
}

export interface ImportPlan<T> {
  mode: ImportMode;
  toCreate: CreatePlan<T>[];
  toUpdate: UpdatePlan<T>[];
  unchanged: number;
  invalid: InvalidRow[];
}

// ---------------------------------------------------------------------------
// Per-mode normalization + zod schemas
// ---------------------------------------------------------------------------

const trim = (v: any) => (typeof v === "string" ? v.trim() : v);
const toInt = (v: any): number | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
};
const toTags = (v: any): string[] | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  return String(v)
    .split(/[|,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const pick = (row: Record<string, any>, ...keys: string[]) => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
    // case-insensitive fallback
    const lk = Object.keys(row).find(
      (rk) => rk.toLowerCase() === k.toLowerCase(),
    );
    if (lk && row[lk] !== undefined && row[lk] !== "") return row[lk];
  }
  return undefined;
};

const studentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "name is required"),
  bio: z.string().optional(),
  photo: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const goalSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "title is required"),
  points: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  order: z.number().int().optional(),
});

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "name is required"),
  groupId: z.string().optional(),
  order: z.number().int().optional(),
});

const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "name is required"),
  order: z.number().int().optional(),
  isSystem: z.boolean().optional(),
});

function normalize(mode: ImportMode, raw: Record<string, any>): any {
  switch (mode) {
    case "students":
      return {
        id: trim(pick(raw, "id")) || undefined,
        name: trim(pick(raw, "name", "student_name", "full_name")) || "",
        bio: trim(pick(raw, "bio", "description")) ?? undefined,
        photo: trim(pick(raw, "photo", "avatar", "image")) ?? undefined,
        tags: toTags(pick(raw, "tags")),
      };
    case "goals":
      return {
        id: trim(pick(raw, "id")) || undefined,
        title: trim(pick(raw, "title", "goal", "name")) || "",
        points: toInt(pick(raw, "points", "pts")) ?? 0,
        description: trim(pick(raw, "description", "desc")) ?? undefined,
        categoryId:
          trim(pick(raw, "category_id", "categoryId", "categoryid")) ||
          undefined,
        categoryName:
          trim(pick(raw, "category_name", "category", "categoryName")) ||
          undefined,
        order: toInt(pick(raw, "order", "sort_order", "position")),
      };
    case "categories":
      return {
        id: trim(pick(raw, "id")) || undefined,
        name: trim(pick(raw, "name", "category", "category_name")) || "",
        groupId:
          trim(pick(raw, "group_id", "groupId", "groupid")) || undefined,
        order: toInt(pick(raw, "order", "sort_order", "position")),
      };
    case "groups": {
      const sys = pick(raw, "is_system", "isSystem");
      return {
        id: trim(pick(raw, "id")) || undefined,
        name: trim(pick(raw, "name", "group", "group_name")) || "",
        order: toInt(pick(raw, "order", "sort_order", "position")),
        isSystem:
          sys === undefined || sys === ""
            ? undefined
            : String(sys).toLowerCase() === "true" || sys === true,
      };
    }
  }
}

function validate(mode: ImportMode, normalized: any) {
  switch (mode) {
    case "students":
      return studentSchema.safeParse(normalized);
    case "goals":
      return goalSchema.safeParse(normalized);
    case "categories":
      return categorySchema.safeParse(normalized);
    case "groups":
      return groupSchema.safeParse(normalized);
  }
}

// Shallow diff: returns the list of fields where `next[field]` differs from
// `prev[field]`. Fields present on prev but missing/undefined on next are
// preserved (we never overwrite with undefined — that's the "merge" promise).
export function diffFields(
  prev: Record<string, any>,
  next: Record<string, any>,
  fields: string[],
): string[] {
  const changed: string[] = [];
  for (const f of fields) {
    const a = prev?.[f];
    const b = next?.[f];
    if (b === undefined) continue; // unspecified in CSV → leave alone
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length || a.some((v, i) => v !== b[i])) changed.push(f);
      continue;
    }
    // coerce numeric strings vs numbers
    if (typeof a === "number" || typeof b === "number") {
      if (Number(a ?? 0) !== Number(b ?? 0)) changed.push(f);
      continue;
    }
    if ((a ?? "") !== (b ?? "")) changed.push(f);
  }
  return changed;
}

const MODE_FIELDS: Record<ImportMode, string[]> = {
  students: ["name", "bio", "photo", "tags"],
  goals: [
    "title",
    "points",
    "description",
    "categoryId",
    "categoryName",
    "order",
  ],
  categories: ["name", "groupId", "order"],
  groups: ["name", "order", "isSystem"],
};

export interface PlanContext {
  /** Existing records currently in the DB, indexed for FK validation. */
  existing: any[];
  /** Optional related sets for FK checks. */
  categories?: any[];
  groups?: any[];
  masterGoals?: any[];
}

export function planImport(
  mode: ImportMode,
  incoming: Record<string, any>[],
  ctx: PlanContext,
): ImportPlan<any> {
  const plan: ImportPlan<any> = {
    mode,
    toCreate: [],
    toUpdate: [],
    unchanged: 0,
    invalid: [],
  };

  const existingById = new Map<string, any>();
  for (const e of ctx.existing || []) {
    if (e?.id != null) existingById.set(String(e.id), e);
  }
  const knownCategoryIds = new Set(
    (ctx.categories || []).map((c) => String(c.id)),
  );
  const knownGroupIds = new Set((ctx.groups || []).map((g) => String(g.id)));

  const fields = MODE_FIELDS[mode];

  incoming.forEach((raw, idx) => {
    const rowNum = idx + 1;
    const normalized = normalize(mode, raw);
    const parsed = validate(mode, normalized);
    if (!parsed.success) {
      const issues = (parsed.error as any).issues ?? (parsed.error as any).errors ?? [];
      plan.invalid.push({
        row: rowNum,
        id: normalized.id,
        reason: issues.map((e: any) => e.message).join(", ") || "invalid",
      });
      return;
    }
    const data = parsed.data as any;

    // Relationship checks
    if (mode === "goals" && data.categoryId && knownCategoryIds.size > 0) {
      if (!knownCategoryIds.has(String(data.categoryId))) {
        plan.invalid.push({
          row: rowNum,
          id: data.id,
          reason: `categoryId "${data.categoryId}" not found`,
        });
        return;
      }
    }
    if (mode === "categories" && data.groupId && knownGroupIds.size > 0) {
      if (!knownGroupIds.has(String(data.groupId))) {
        plan.invalid.push({
          row: rowNum,
          id: data.id,
          reason: `groupId "${data.groupId}" not found`,
        });
        return;
      }
    }

    if (data.id && existingById.has(String(data.id))) {
      const before = existingById.get(String(data.id));
      const changedFields = diffFields(before, data, fields);
      if (changedFields.length === 0) {
        plan.unchanged++;
      } else {
        // Build `after` = before ⊕ only-the-changed-fields (no destructive undefineds)
        const after = { ...before };
        for (const f of changedFields) after[f] = data[f];
        plan.toUpdate.push({
          id: String(data.id),
          before,
          after,
          changedFields,
        });
      }
    } else {
      // No id, or id provided but not in DB → treat as create.
      // (User-provided id will be honored at commit time when present.)
      plan.toCreate.push({ id: data.id, data, row: rowNum });
    }
  });

  return plan;
}

// ---------------------------------------------------------------------------
// API endpoint mapping (so the commit step is a single switch)
// ---------------------------------------------------------------------------

export const API_PATH: Record<ImportMode, string> = {
  students: "/api/students",
  goals: "/api/masterGoals",
  categories: "/api/categories",
  groups: "/api/groups",
};
