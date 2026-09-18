/**
 * Unified graph engine — headless model shared by every layout projection.
 *
 * The model never changes when the projection changes; only positions do.
 */

export type LayoutKind = 'force' | 'timeline' | 'tree' | 'fishbone';

export type LinkRouting = 'straight' | 'elbow' | 'bezier';

export interface EngineNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'media';
  parentId: string | null;
  depth: number;
  /** Radius in graph units, used for boundary anchoring. */
  radius: number;
  /** Time value (epoch ms) used by the timeline layout, when resolvable. */
  time?: number;
  /** Grouping key used by the fishbone layout (top-level ancestor). */
  category?: string;
  tags: string[];
}

export interface EngineLink {
  source: string;
  target: string;
  type?: 'hierarchy' | 'tag' | 'backlink' | 'semantic' | 'custom';
}

export interface GraphModel {
  nodes: EngineNode[];
  links: EngineLink[];
}

export interface LayoutOptions {
  kind: LayoutKind;
  width: number;
  height: number;
  /** Force layout tuning. */
  linkDistance: number;
  chargeStrength: number;
  centerStrength: number;
  alphaDecay: number;
  velocityDecay: number;
  warmupTicks: number;
  cooldownTicks: number;
  /** Timeline: name of the frontmatter/date field already resolved into `time`. */
  laneHeight: number;
  /** Tree / fishbone spacing. */
  levelDistance: number;
  /**
   * Per-depth sub-layout rules: the first matching rule wins, otherwise `kind`.
   * Example: depth 1-3 fishbone, depth 4+ force.
   */
  depthRules: DepthRule[];
}

export interface DepthRule {
  id: string;
  fromDepth: number;
  toDepth: number;
  kind: LayoutKind;
}

export interface Positions {
  /** Node id -> index into the coordinate arrays. */
  index: Record<string, number>;
  x: Float32Array;
  y: Float32Array;
}

export interface LayoutResult extends Positions {
  kind: LayoutKind;
  /** Axis ticks for layouts that have one (timeline). */
  ticks?: { x: number; label: string }[];
  /** Spine geometry for the fishbone layout. */
  spine?: { x1: number; y1: number; x2: number; y2: number };
}

export interface LayoutRequest {
  id: number;
  model: GraphModel;
  options: LayoutOptions;
}

export interface LayoutResponse {
  id: number;
  kind: LayoutKind;
  ids: string[];
  x: Float32Array;
  y: Float32Array;
  ticks?: { x: number; label: string }[];
  spine?: { x1: number; y1: number; x2: number; y2: number };
}

export const defaultLayoutOptions = (
  width: number,
  height: number
): LayoutOptions => ({
  kind: 'force',
  width,
  height,
  linkDistance: 60,
  chargeStrength: -180,
  centerStrength: 1,
  alphaDecay: 0.02,
  velocityDecay: 0.3,
  warmupTicks: 100,
  cooldownTicks: 100,
  laneHeight: 46,
  levelDistance: 110,
  depthRules: [],
});
