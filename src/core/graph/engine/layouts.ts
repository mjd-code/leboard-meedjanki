/**
 * Layout strategies. Pure functions: model + options -> positions.
 * Executed inside the layout worker (see layout.worker.ts).
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
} from 'd3-force';
import { stratify, tree as d3tree, type HierarchyPointNode } from 'd3-hierarchy';
import type { EngineNode, GraphModel, LayoutKind, LayoutOptions, LayoutResponse } from './types';

interface SimNode extends SimulationNodeDatum {
  id: string;
  radius: number;
}

const toResponse = (
  id: number,
  kind: LayoutKind,
  ids: string[],
  xs: number[],
  ys: number[],
  extra: Partial<LayoutResponse> = {}
): LayoutResponse => ({
  id,
  kind,
  ids,
  x: Float32Array.from(xs),
  y: Float32Array.from(ys),
  ...extra,
});

/** Elastic force-directed layout (d3-force). */
export function forceLayout(id: number, model: GraphModel, o: LayoutOptions): LayoutResponse {
  const nodes: SimNode[] = model.nodes.map((n) => ({ id: n.id, radius: n.radius }));
  const byId = new Set(nodes.map((n) => n.id));
  const links = model.links
    .filter((l) => byId.has(l.source) && byId.has(l.target))
    .map((l) => ({ source: l.source, target: l.target }));

  const sim = forceSimulation(nodes)
    .force('link', forceLink(links).id((d: SimNode) => d.id).distance(o.linkDistance))
    .force('charge', forceManyBody().strength(o.chargeStrength))
    .force('center', forceCenter(o.width / 2, o.height / 2).strength(o.centerStrength))
    .force('collide', forceCollide<SimNode>((d) => d.radius + 4))
    .alphaDecay(o.alphaDecay)
    .velocityDecay(o.velocityDecay)
    .stop();

  sim.tick(Math.max(o.warmupTicks, o.cooldownTicks));

  return toResponse(
    id,
    'force',
    nodes.map((n) => n.id),
    nodes.map((n) => n.x ?? 0),
    nodes.map((n) => n.y ?? 0)
  );
}

/** Chronological layout: X from a time value, lane packing on Y. */
export function timelineLayout(id: number, model: GraphModel, o: LayoutOptions): LayoutResponse {
  const padX = 80;
  const usable = Math.max(200, o.width - padX * 2);

  const withTime = model.nodes.filter((n) => typeof n.time === 'number');
  const times = withTime.map((n) => n.time as number);
  const min = times.length ? Math.min(...times) : 0;
  const max = times.length ? Math.max(...times) : 1;
  const span = max - min || 1;

  // Undated notes are placed on a reserved lane before the axis.
  const ordered = [...model.nodes].sort(
    (a, b) => (a.time ?? Number.POSITIVE_INFINITY) - (b.time ?? Number.POSITIVE_INFINITY)
  );

  const laneEnds: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  const ids: string[] = [];

  for (const n of ordered) {
    const x =
      typeof n.time === 'number'
        ? padX + ((n.time - min) / span) * usable
        : padX / 2;
    const halfW = Math.max(n.radius, n.name.length * 3.2);
    let lane = laneEnds.findIndex((end) => x - halfW > end);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = x + halfW;
    ids.push(n.id);
    xs.push(x);
    ys.push(o.height / 2 + (lane - laneEnds.length / 2) * o.laneHeight);
  }

  const ticks: { x: number; label: string }[] = [];
  if (times.length) {
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = min + (span * i) / steps;
      ticks.push({
        x: padX + (usable * i) / steps,
        label: new Date(t).toISOString().slice(0, 10),
      });
    }
  }

  return toResponse(id, 'timeline', ids, xs, ys, { ticks });
}

/** Hierarchical org-chart layout (d3-hierarchy). Forests get a virtual root. */
export function treeLayout(id: number, model: GraphModel, o: LayoutOptions): LayoutResponse {
  const ROOT = '__virtual_root__';
  const known = new Set(model.nodes.map((n) => n.id));
  const rows = [
    { id: ROOT, parentId: null as string | null },
    ...model.nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId && known.has(n.parentId) ? n.parentId : ROOT,
    })),
  ];

  try {
    const root = stratify<{ id: string; parentId: string | null }>()
      .id((d) => d.id)
      .parentId((d) => d.parentId)(rows);

    const layout = d3tree<{ id: string; parentId: string | null }>()
      .nodeSize([70, o.levelDistance]);
    const positioned = layout(root);

    const ids: string[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    positioned.each((d: HierarchyPointNode<{ id: string }>) => {
      if (d.data.id === ROOT) return;
      ids.push(d.data.id);
      xs.push(o.width / 2 + d.x);
      ys.push(80 + d.y);
    });
    return toResponse(id, 'tree', ids, xs, ys);
  } catch {
    // Cycles or duplicate ids: fall back to force so the view never breaks.
    return { ...forceLayout(id, model, o), kind: 'tree' };
  }
}

/** Ishikawa layout: a horizontal spine with angled ribs per category and depth. */
export function fishboneLayout(id: number, model: GraphModel, o: LayoutOptions): LayoutResponse {
  const spineY = o.height / 2;
  const padX = 100;
  const usable = Math.max(240, o.width - padX * 2);

  const categories = new Map<string, EngineNode[]>();
  for (const n of model.nodes) {
    const key = n.category ?? n.parentId ?? 'root';
    const list = categories.get(key) ?? [];
    list.push(n);
    categories.set(key, list);
  }

  const ids: string[] = [];
  const xs: number[] = [];
  const ys: number[] = [];

  const keys = Array.from(categories.keys());
  keys.forEach((key, ci) => {
    const members = categories.get(key);
    if (!members) return;
    const anchorX = padX + (usable * (ci + 1)) / (keys.length + 1);
    const up = ci % 2 === 0 ? -1 : 1;

    members
      .slice()
      .sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name))
      .forEach((n, i) => {
        const step = i + 1;
        ids.push(n.id);
        // Ribs run at ~55 degrees off the spine, spreading with depth.
        xs.push(anchorX - step * 26 - n.depth * 6);
        ys.push(spineY + up * (step * 38 + n.depth * 10));
      });
  });

  return toResponse(id, 'fishbone', ids, xs, ys, {
    spine: { x1: padX, y1: spineY, x2: padX + usable, y2: spineY },
  });
}

const STRATEGIES: Record<LayoutKind, (id: number, m: GraphModel, o: LayoutOptions) => LayoutResponse> = {
  force: forceLayout,
  timeline: timelineLayout,
  tree: treeLayout,
  fishbone: fishboneLayout,
};

/** Resolve the layout for a node depth using the configured depth rules. */
export function kindForDepth(depth: number, o: LayoutOptions): LayoutKind {
  const rule = o.depthRules.find((r) => depth >= r.fromDepth && depth <= r.toDepth);
  return rule?.kind ?? o.kind;
}

/**
 * Run the layout. When depth rules exist, each depth band is laid out with its
 * own strategy inside a horizontal band, then merged into one position set.
 */
export function computeLayout(id: number, model: GraphModel, o: LayoutOptions): LayoutResponse {
  if (!o.depthRules.length) return STRATEGIES[o.kind](id, model, o);

  const bands = new Map<LayoutKind, GraphModel>();
  for (const n of model.nodes) {
    const kind = kindForDepth(n.depth, o);
    const band = bands.get(kind) ?? { nodes: [], links: [] };
    band.nodes.push(n);
    bands.set(kind, band);
  }
  for (const link of model.links) {
    for (const band of bands.values()) {
      const has = (nid: string) => band.nodes.some((n) => n.id === nid);
      if (has(link.source) && has(link.target)) band.links.push(link);
    }
  }

  const ids: string[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  const entries = Array.from(bands.entries());
  const bandHeight = o.height / Math.max(1, entries.length);
  let ticks: LayoutResponse['ticks'];
  let spine: LayoutResponse['spine'];

  entries.forEach(([kind, band], i) => {
    const res = STRATEGIES[kind](id, band, { ...o, kind, height: bandHeight });
    const offset = i * bandHeight;
    res.ids.forEach((nid, j) => {
      ids.push(nid);
      xs.push(res.x[j]);
      ys.push(res.y[j] + offset);
    });
    if (res.ticks && !ticks) ticks = res.ticks;
    if (res.spine && !spine) spine = { ...res.spine, y1: res.spine.y1 + offset, y2: res.spine.y2 + offset };
  });

  return toResponse(id, o.kind, ids, xs, ys, { ticks, spine });
}
