/**
 * Render/layout contracts for the unified graph engine.
 *
 * The engine never owns graph content: it projects vault nodes/links into a
 * render model and computes deterministic coordinates for it.
 */

import type { Link, Node } from '@/shared/stores/types';

export type LayoutMode = 'mindmap' | 'timeline' | 'fishbone' | 'free-force';
export type MindmapOrientation = 'balanced' | 'radial';

export interface LayoutPoint {
  x: number;
  y: number;
}

export interface NodeTarget extends LayoutPoint {
  side?: -1 | 0 | 1;
  angle?: number;
  lane?: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface TimelineAxis {
  kind: 'timeline-axis';
  y: number;
  x1: number;
  x2: number;
  ticks: { x: number; label: string }[];
}

export interface FishboneSpine {
  kind: 'fishbone-spine';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FishboneRib {
  kind: 'fishbone-rib';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
}

export type LayoutDecoration = TimelineAxis | FishboneSpine | FishboneRib;

export interface LayoutGeometry {
  mode: LayoutMode;
  targets: Map<string, NodeTarget>;
  bounds: Bounds;
  decorations: LayoutDecoration[];
}

export interface NodeMetric {
  width: number;
  height: number;
}

export interface LayoutContext {
  width: number;
  height: number;
  rootId?: string;
  orientation: MindmapOrientation;
  levelGap: number;
  siblingGap: number;
  laneGap: number;
  ribAngle: number;
  nodeMetrics: Map<string, NodeMetric>;
}

/** Mutable object handed to ForceGraph2D — it writes x/y/fx/fy in place. */
export interface RenderNode {
  id: string;
  name: string;
  type: Node['type'];
  parentId: string | null;
  depth: number;
  tags: string[];
  content: string;
  time?: number;
  category?: string;
  childCount: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  /** Toggle hit region in graph space, written by the node renderer. */
  toggle?: { x: number; y: number; r: number } | null;
}

export interface RenderLink {
  source: string | RenderNode;
  target: string | RenderNode;
  type?: Link['type'];
  role?: 'hierarchy' | 'milestone' | 'rib';
}

export interface GraphProjection {
  nodes: RenderNode[];
  links: RenderLink[];
  byId: Map<string, RenderNode>;
  childrenByParent: Map<string, string[]>;
  parentByChild: Map<string, string | null>;
  roots: string[];
}

export const emptyBounds = (): Bounds => ({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
