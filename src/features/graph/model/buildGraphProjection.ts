/**
 * Normalizes vault graph data into the render model plus hierarchy indexes.
 * Dangling parents are ignored and cycles are cut at their first repeat, so a
 * malformed vault still produces a deterministic forest.
 */

import { parse as parseYaml } from 'yaml';
import type { Link, Node } from '@/shared/stores/types';
import type { GraphProjection, RenderLink, RenderNode } from './graphTypes';

export const endpointId = (end: string | { id: string }) =>
  typeof end === 'string' ? end : end.id;

/** Best-effort date extraction from a note's frontmatter. */
export function noteTime(content: string, field: string): number | undefined {
  if (!content.startsWith('---')) return undefined;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return undefined;
  try {
    const fm = (parseYaml(content.slice(content.indexOf('\n') + 1, end)) ?? {}) as Record<
      string,
      unknown
    >;
    const raw = fm[field] ?? fm.date ?? fm.created ?? fm.year;
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw === 'number')
      return new Date(`${String(raw).padStart(4, '0')}-01-01`).getTime();
    const time = new Date(String(raw)).getTime();
    return Number.isFinite(time) ? time : undefined;
  } catch {
    return undefined;
  }
}

export function buildGraphProjection(
  nodes: Node[],
  links: Link[],
  options: { timeField?: string } = {}
): GraphProjection {
  const timeField = options.timeField ?? 'date';
  const ids = new Set(nodes.map((node) => node.id));

  const parentByChild = new Map<string, string | null>();
  for (const node of nodes) {
    const parent = node.parentId && ids.has(node.parentId) ? node.parentId : null;
    parentByChild.set(node.id, parent === node.id ? null : parent);
  }

  // Cut cycles: walking up must always terminate at a root.
  for (const node of nodes) {
    const seen = new Set<string>([node.id]);
    let current = parentByChild.get(node.id) ?? null;
    while (current) {
      if (seen.has(current)) {
        parentByChild.set(current, null);
        break;
      }
      seen.add(current);
      current = parentByChild.get(current) ?? null;
    }
  }

  const childrenByParent = new Map<string, string[]>();
  const roots: string[] = [];
  for (const node of nodes) {
    const parent = parentByChild.get(node.id) ?? null;
    if (parent === null) roots.push(node.id);
    else {
      const list = childrenByParent.get(parent);
      if (list) list.push(node.id);
      else childrenByParent.set(parent, [node.id]);
    }
  }

  // Depth follows the repaired hierarchy, not the stored value.
  const depthOf = new Map<string, number>();
  const assignDepth = (id: string, depth: number) => {
    depthOf.set(id, depth);
    for (const child of childrenByParent.get(id) ?? []) assignDepth(child, depth + 1);
  };
  roots.forEach((id) => assignDepth(id, 0));

  const rootOf = (id: string): string => {
    let current = id;
    let parent = parentByChild.get(current) ?? null;
    while (parent) {
      current = parent;
      parent = parentByChild.get(current) ?? null;
    }
    return current;
  };

  const renderNodes: RenderNode[] = nodes.map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    parentId: parentByChild.get(node.id) ?? null,
    depth: depthOf.get(node.id) ?? 0,
    tags: node.tags ?? [],
    content: node.content ?? '',
    time: node.type === 'folder' ? undefined : noteTime(node.content ?? '', timeField),
    category: rootOf(node.id),
    childCount: (childrenByParent.get(node.id) ?? []).length,
  }));

  const byId = new Map(renderNodes.map((node) => [node.id, node]));

  const renderLinks: RenderLink[] = links
    .filter((link) => ids.has(endpointId(link.source)) && ids.has(endpointId(link.target)))
    .map((link) => ({
      source: endpointId(link.source),
      target: endpointId(link.target),
      type: link.type,
    }));

  return { nodes: renderNodes, links: renderLinks, byId, childrenByParent, parentByChild, roots };
}

/** Subtree weight: max(1, sum of visible children weights). */
export function subtreeWeights(
  roots: string[],
  childrenOf: (id: string) => string[]
): Map<string, number> {
  const weights = new Map<string, number>();
  const visit = (id: string): number => {
    const cached = weights.get(id);
    if (cached !== undefined) return cached;
    weights.set(id, 1); // guards against re-entry
    const children = childrenOf(id);
    const total = children.reduce((sum, child) => sum + visit(child), 0);
    const weight = Math.max(1, total);
    weights.set(id, weight);
    return weight;
  };
  roots.forEach(visit);
  return weights;
}
