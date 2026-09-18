/**
 * Single entry point for deterministic layout: picks a strategy, runs it in a
 * memo over a stable signature and returns geometry only (never React state).
 */

import { useMemo } from 'react';
import type {
  GraphProjection,
  LayoutContext,
  LayoutGeometry,
  LayoutMode,
  MindmapOrientation,
  NodeMetric,
} from '../model/graphTypes';
import { mindmapLayout } from './mindmap';
import { timelineLayout } from './timeline';
import { fishboneLayout } from './fishbone';
import { freeForceLayout } from './freeForce';

export interface LayoutEngineOptions {
  mode: LayoutMode;
  width: number;
  height: number;
  orientation: MindmapOrientation;
  levelGap: number;
  siblingGap: number;
  laneGap: number;
  ribAngle: number;
  rootId?: string;
  visibleIds: string[];
  nodeMetrics: Map<string, NodeMetric>;
}

export function computeLayout(
  projection: GraphProjection,
  options: LayoutEngineOptions
): LayoutGeometry {
  const context: LayoutContext = {
    width: options.width,
    height: options.height,
    rootId: options.rootId,
    orientation: options.orientation,
    levelGap: options.levelGap,
    siblingGap: options.siblingGap,
    laneGap: options.laneGap,
    ribAngle: options.ribAngle,
    nodeMetrics: options.nodeMetrics,
  };

  const visible = new Set(options.visibleIds);
  const childrenOf = (id: string) =>
    (projection.childrenByParent.get(id) ?? []).filter((child) => visible.has(child));
  const roots = options.visibleIds.filter((id) => {
    const parent = projection.parentByChild.get(id) ?? null;
    return !parent || !visible.has(parent);
  });

  switch (options.mode) {
    case 'timeline':
      return timelineLayout({
        nodes: options.visibleIds.map((id) => ({
          id,
          time: projection.byId.get(id)?.time,
        })),
        parentOf: (id) => projection.parentByChild.get(id) ?? null,
        context,
      });
    case 'fishbone':
      return fishboneLayout({ ids: options.visibleIds, roots, childrenOf, context });
    case 'free-force':
      return freeForceLayout();
    case 'mindmap':
    default:
      return mindmapLayout({ ids: options.visibleIds, roots, childrenOf, context });
  }
}

export function useLayoutEngine(
  projection: GraphProjection,
  options: LayoutEngineOptions
): LayoutGeometry {
  const signature = [
    options.mode,
    options.orientation,
    options.rootId ?? '',
    Math.round(options.width),
    Math.round(options.height),
    options.levelGap,
    options.siblingGap,
    options.laneGap,
    options.ribAngle.toFixed(3),
    options.visibleIds.join(','),
    projection.links.length,
  ].join('|');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => computeLayout(projection, options), [signature, projection]);
}
