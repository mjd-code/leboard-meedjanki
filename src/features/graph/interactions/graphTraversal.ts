/** Hierarchy traversal helpers: O(V+E) preprocessing, O(path) per query. */

import type { GraphProjection } from '../model/graphTypes';

export function ancestorsOf(projection: GraphProjection, id: string): Set<string> {
  const result = new Set<string>();
  let current = projection.parentByChild.get(id) ?? null;
  while (current && !result.has(current)) {
    result.add(current);
    current = projection.parentByChild.get(current) ?? null;
  }
  return result;
}

export function descendantsOf(projection: GraphProjection, id: string): Set<string> {
  const result = new Set<string>();
  const stack = [...(projection.childrenByParent.get(id) ?? [])];
  while (stack.length) {
    const next = stack.pop() as string;
    if (result.has(next)) continue;
    result.add(next);
    stack.push(...(projection.childrenByParent.get(next) ?? []));
  }
  return result;
}

/** Ids hidden because an ancestor is collapsed. */
export function hiddenByCollapse(
  projection: GraphProjection,
  collapsedIds: Iterable<string>
): Set<string> {
  const hidden = new Set<string>();
  for (const id of collapsedIds) {
    descendantsOf(projection, id).forEach((child) => hidden.add(child));
  }
  return hidden;
}

/** node ∪ ancestors ∪ descendants — the hover pathway. */
export function pathwayOf(projection: GraphProjection, id: string | null): Set<string> {
  if (!id) return new Set();
  const set = new Set<string>([id]);
  ancestorsOf(projection, id).forEach((item) => set.add(item));
  descendantsOf(projection, id).forEach((item) => set.add(item));
  return set;
}

export function subtreeOf(projection: GraphProjection, id: string): Set<string> {
  const set = descendantsOf(projection, id);
  set.add(id);
  return set;
}
