// ---------------------------------------------------------------------------
// Pure helpers for the 3-tier Group → Category → Goal hierarchy.
// Backend-agnostic: operates on the domain types defined in src/lib/types.ts.
// ---------------------------------------------------------------------------
import type { Group, Category, MasterGoal } from "@/types";
import { bulkWrite } from "@/lib/firebase/queries";
import {
  categoriesCol,
  goalsCol,
  groupsCol,
} from "@/lib/firebase/collections";

/** Stable id used to bucket orphaned Categories (no groupId). */
export const FALLBACK_GROUP_ID = "__ungrouped__";
/** Stable id used to bucket orphaned Goals (no resolvable category). */
export const FALLBACK_CATEGORY_ID = "__uncategorized__";

export const sortByOrder = <T extends { order?: number; name?: string; title?: string }>(
  arr: T[],
): T[] =>
  [...arr].sort((a, b) => {
    const ao = a.order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    const an = (a.name ?? a.title ?? "").toString();
    const bn = (b.name ?? b.title ?? "").toString();
    return an.localeCompare(bn);
  });

/** Move helper for ▲▼ buttons. Returns a NEW array; caller persists. */
export function moveItem<T extends { id: string }>(
  list: T[],
  id: string,
  dir: -1 | 1,
): T[] {
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return list;
  const next = idx + dir;
  if (next < 0 || next >= list.length) return list;
  const copy = [...list];
  [copy[idx], copy[next]] = [copy[next], copy[idx]];
  return copy;
}

export interface HierarchyCategoryNode {
  category: Category;
  goals: MasterGoal[];
}
export interface HierarchyGroupNode {
  group: Group;
  categories: HierarchyCategoryNode[];
}

/**
 * Builds the Group → Category → Goal tree. Backwards compatible:
 *  - Categories without `groupId` go into a synthesized "Tanpa Grup" bucket.
 *  - Goals are linked by `categoryId` first, falling back to `categoryName`.
 *  - Empty system buckets are hidden so the UI stays clean.
 */
export function buildHierarchy(
  groups: Group[],
  categories: Category[],
  goals: MasterGoal[],
): HierarchyGroupNode[] {
  const norm = (s?: string) => (s || "").toLowerCase().trim();

  // Map category lookup helpers.
  const catById = new Map<string, Category>();
  const catByName = new Map<string, Category>();
  categories.forEach((c) => {
    catById.set(c.id, c);
    if (c.name) catByName.set(norm(c.name), c);
  });

  // Bucket goals into categories.
  const goalsByCat = new Map<string, MasterGoal[]>();
  const orphanGoals: MasterGoal[] = [];
  goals.forEach((g) => {
    const cat =
      (g.categoryId && catById.get(g.categoryId)) ||
      catByName.get(norm(g.categoryName));
    if (!cat) {
      orphanGoals.push(g);
      return;
    }
    const list = goalsByCat.get(cat.id) ?? [];
    list.push(g);
    goalsByCat.set(cat.id, list);
  });

  // Bucket categories into groups.
  const groupById = new Map<string, Group>();
  groups.forEach((g) => groupById.set(g.id, g));
  const catsByGroup = new Map<string, Category[]>();
  categories.forEach((c) => {
    const gid = c.groupId && groupById.has(c.groupId) ? c.groupId : FALLBACK_GROUP_ID;
    const list = catsByGroup.get(gid) ?? [];
    list.push(c);
    catsByGroup.set(gid, list);
  });

  // Synthesize fallback containers.
  const fallbackGroup: Group = {
    id: FALLBACK_GROUP_ID,
    name: "Tanpa Grup",
    order: Number.MAX_SAFE_INTEGER,
    isSystem: true,
  };
  const fallbackCategory: Category = {
    id: FALLBACK_CATEGORY_ID,
    name: "Kategori Tidak Diketahui",
    order: Number.MAX_SAFE_INTEGER,
  };

  const allGroups: Group[] = [...groups];
  if (catsByGroup.has(FALLBACK_GROUP_ID)) allGroups.push(fallbackGroup);

  const nodes: HierarchyGroupNode[] = sortByOrder(allGroups).map((group) => {
    const cats = sortByOrder(catsByGroup.get(group.id) ?? []);
    const categoryNodes: HierarchyCategoryNode[] = cats.map((category) => ({
      category,
      goals: sortByOrder(goalsByCat.get(category.id) ?? []),
    }));
    return { group, categories: categoryNodes };
  });

  if (orphanGoals.length) {
    const orphanCatNode: HierarchyCategoryNode = {
      category: fallbackCategory,
      goals: sortByOrder(orphanGoals),
    };
    const existingFallback = nodes.find((n) => n.group.id === FALLBACK_GROUP_ID);
    if (existingFallback) {
      existingFallback.categories.push(orphanCatNode);
    } else {
      nodes.push({ group: fallbackGroup, categories: [orphanCatNode] });
    }
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Reorder API helpers — matches the contract documented in the plan.
// Backend should overwrite `order` to the array index transactionally.
// ---------------------------------------------------------------------------
export interface ReorderItem { id: string; order: number }

export async function persistReorder(
  endpoint: "/api/groups/reorder" | "/api/categories/reorder" | "/api/masterGoals/reorder",
  items: { id: string }[],
  _parent?: { groupId?: string; categoryId?: string },
): Promise<void> {
  const ref =
    endpoint === "/api/groups/reorder"
      ? groupsCol
      : endpoint === "/api/categories/reorder"
      ? categoriesCol
      : goalsCol;
  const rows = items.map((it, idx) => ({ id: it.id, order: idx } as any));
  try {
    await bulkWrite(ref, rows, "merge");
  } catch (err) {
    console.warn("[persistReorder]", endpoint, err);
    throw err;
  }
}
