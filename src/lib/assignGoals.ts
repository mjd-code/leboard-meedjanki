import type { AssignedGoal } from "./types";

/**
 * Collapse an assigned-goals array by `goalId`, preferring the entry that
 * carries the richest completion state when duplicates exist.
 *
 * Precedence (highest wins):
 *   1. completed === true with a completedAt timestamp
 *   2. completed === true
 *   3. has a completionNote / markedByAdminId
 *   4. first occurrence
 */
export function dedupeAssignments(list: AssignedGoal[] | undefined | null): AssignedGoal[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  const byId = new Map<string, AssignedGoal>();
  const score = (a: AssignedGoal) =>
    (a.completed && a.completedAt ? 4 : 0) +
    (a.completed ? 2 : 0) +
    (a.completionNote || a.markedByAdminId ? 1 : 0);
  for (const a of list) {
    if (!a || !a.goalId) continue;
    const prev = byId.get(a.goalId);
    if (!prev || score(a) > score(prev)) {
      byId.set(a.goalId, a);
    }
  }
  return Array.from(byId.values());
}

/**
 * Idempotently merge a set of goalIds into an existing assignment list.
 * Existing completion state is preserved; new goalIds get a fresh entry.
 */
export function mergeAssignments(
  existing: AssignedGoal[] | undefined | null,
  goalIdsToAdd: string[],
): AssignedGoal[] {
  const base = dedupeAssignments(existing);
  const byId = new Map(base.map((a) => [a.goalId, a]));
  for (const id of goalIdsToAdd) {
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, { goalId: id, completed: false });
  }
  return Array.from(byId.values());
}

/** True iff the array contains two or more entries with the same `goalId`. */
export function hasDuplicateAssignments(list: AssignedGoal[] | undefined | null): boolean {
  if (!Array.isArray(list)) return false;
  const seen = new Set<string>();
  for (const a of list) {
    if (!a?.goalId) continue;
    if (seen.has(a.goalId)) return true;
    seen.add(a.goalId);
  }
  return false;
}
