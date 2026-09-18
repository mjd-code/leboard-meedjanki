/** Chronological timeline layout with collision-aware alternating lanes. */

import type { LayoutContext, LayoutGeometry, NodeTarget, TimelineAxis } from '../model/graphTypes';
import { boundsOf, formatTimeLabel, niceInterval } from './layoutMath';

export interface TimelineInput {
  nodes: { id: string; time?: number }[];
  parentOf: (id: string) => string | null;
  context: LayoutContext;
}

export function timelineLayout({ nodes, parentOf, context }: TimelineInput): LayoutGeometry {
  const targets = new Map<string, NodeTarget>();
  if (!nodes.length) {
    return { mode: 'timeline', targets, bounds: boundsOf(targets), decorations: [] };
  }

  const axisLeft = 0;
  const axisWidth = Math.max(600, context.width * 1.4);
  const baselineY = 0;
  const laneGap = context.laneGap;
  const metric = (id: string) => context.nodeMetrics.get(id) ?? { width: 120, height: 36 };

  const visible = new Set(nodes.map((n) => n.id));
  const milestones = nodes.filter((node) => {
    const parent = parentOf(node.id);
    return !parent || !visible.has(parent);
  });
  const details = nodes.filter((node) => !milestones.includes(node));

  const dated = milestones.filter((n) => Number.isFinite(n.time));
  const times = dated.map((n) => n.time as number);
  const timeMin = times.length ? Math.min(...times) : 0;
  const timeMax = times.length ? Math.max(...times) : 0;
  const span = Math.max(0, timeMax - timeMin);

  const ordered = [...milestones].sort((a, b) => {
    const at = Number.isFinite(a.time) ? (a.time as number) : Infinity;
    const bt = Number.isFinite(b.time) ? (b.time as number) : Infinity;
    if (at === bt) return 0;
    return at - bt;
  });

  const xOf = (node: { id: string; time?: number }, index: number) => {
    if (span > 0 && Number.isFinite(node.time)) {
      return axisLeft + (((node.time as number) - timeMin) / span) * axisWidth;
    }
    return axisLeft + (index * axisWidth) / Math.max(1, ordered.length - 1);
  };

  const laneEnd = new Map<number, number>();
  ordered.forEach((node, index) => {
    const x = xOf(node, index);
    const half = metric(node.id).width / 2;
    let lane = 1;
    for (let step = 1; step <= ordered.length + 1; step += 1) {
      for (const candidate of [step, -step]) {
        const end = laneEnd.get(candidate) ?? -Infinity;
        if (x - half >= end + context.siblingGap) {
          lane = candidate;
          step = ordered.length + 2;
          break;
        }
      }
    }
    laneEnd.set(lane, x + half);
    const y = baselineY + Math.sign(lane) * Math.ceil(Math.abs(lane) / 2) * laneGap;
    targets.set(node.id, { x, y, lane });
  });

  // Detail nodes stack outward from their milestone, on the same side.
  const stackIndex = new Map<string, number>();
  const maxColumns = 2;
  for (const detail of details) {
    const parent = parentOf(detail.id);
    const anchor = parent ? targets.get(parent) : undefined;
    if (!anchor) {
      targets.set(detail.id, { x: axisLeft, y: baselineY + laneGap * 3, lane: 3 });
      continue;
    }
    const k = stackIndex.get(parent as string) ?? 0;
    stackIndex.set(parent as string, k + 1);
    const direction = 1;
    const side = anchor.y >= baselineY ? 1 : -1;
    targets.set(detail.id, {
      x: anchor.x + direction * Math.min(k, maxColumns) * (metric(detail.id).width * 0.8),
      y: anchor.y + side * (1 + Math.floor(k / maxColumns)) * laneGap * 0.8,
      lane: anchor.lane,
    });
  }

  const axis: TimelineAxis = {
    kind: 'timeline-axis',
    y: baselineY,
    x1: axisLeft,
    x2: axisLeft + axisWidth,
    ticks: [],
  };

  if (span > 0) {
    const step = niceInterval(span);
    const start = Math.ceil(timeMin / step) * step;
    for (let t = start; t <= timeMax; t += step) {
      axis.ticks.push({
        x: axisLeft + ((t - timeMin) / span) * axisWidth,
        label: formatTimeLabel(t, span),
      });
    }
  }

  return {
    mode: 'timeline',
    targets,
    bounds: boundsOf(targets, context.nodeMetrics),
    decorations: [axis],
  };
}
