/**
 * Projects the vault graph (store shape) into the headless engine model.
 */

import { parse as parseYaml } from 'yaml';
import type { Link, Node } from '@/shared/stores/types';
import type { EngineLink, EngineNode, GraphModel } from './types';

const idOf = (end: string | Node) => (typeof end === 'string' ? end : end.id);

/** Best-effort date extraction from a note's frontmatter. */
export function noteTime(content: string, field: string): number | undefined {
  if (!content.startsWith('---')) return undefined;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return undefined;
  try {
    const fm = (parseYaml(content.slice(content.indexOf('\n') + 1, end)) ?? {}) as Record<string, unknown>;
    const raw = fm[field] ?? fm.date ?? fm.created ?? fm.year;
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw === 'number') return new Date(String(raw).padStart(4, '0') + '-01-01').getTime();
    const t = new Date(String(raw)).getTime();
    return Number.isFinite(t) ? t : undefined;
  } catch {
    return undefined;
  }
}

/** Top-most ancestor id, used as the fishbone category. */
function rootOf(node: Node, byId: Map<string, Node>): string {
  let current = node;
  const seen = new Set<string>();
  while (current.parentId && byId.has(current.parentId) && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current.id;
}

export function buildGraphModel(
  nodes: Node[],
  links: Link[],
  options: { baseRadius?: number; timeField?: string; sizeByDepth?: boolean; depthSizeInterval?: number } = {}
): GraphModel {
  const baseRadius = options.baseRadius ?? 6;
  const timeField = options.timeField ?? 'date';
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const engineNodes: EngineNode[] = nodes.map((n) => ({
    id: n.id,
    name: n.name,
    type: n.type,
    parentId: n.parentId,
    depth: n.depth ?? 0,
    radius: nodeRadiusForDepth(n.type, n.depth ?? 0, baseRadius, options.sizeByDepth, options.depthSizeInterval),
    time: n.type === 'folder' ? undefined : noteTime(n.content ?? '', timeField),
    category: rootOf(n, byId),
    tags: n.tags ?? [],
  }));

  const engineLinks: EngineLink[] = links.map((l) => ({
    source: idOf(l.source),
    target: idOf(l.target),
    type: l.type,
  }));

  return { nodes: engineNodes, links: engineLinks };
}

/** Shared node sizing used by every renderer. Positive intervals shrink deeper levels. */
export function nodeRadiusForDepth(
  type: Node['type'],
  depth: number,
  baseRadius = 6,
  enabled = false,
  interval = 1
): number {
  const typeRadius = type === 'folder' ? baseRadius * 1.4 : baseRadius;
  return Math.max(2, enabled ? typeRadius - Math.max(0, depth) * interval : typeRadius);
}
