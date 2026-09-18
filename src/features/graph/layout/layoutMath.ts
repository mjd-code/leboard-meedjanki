/** Pure math helpers shared by every layout strategy. */

import type { Bounds, LayoutPoint, NodeTarget } from '../model/graphTypes';

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/** Nice tick interval from the {1,2,5}·10^k family. */
export function niceInterval(span: number, targetTicks = 6): number {
  if (!Number.isFinite(span) || span <= 0) return 1;
  const raw = span / Math.max(1, targetTicks);
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Formats a timeline tick label according to the visible span. */
export function formatTimeLabel(time: number, spanMs: number): string {
  const date = new Date(time);
  if (!Number.isFinite(time)) return '';
  const day = 86_400_000;
  if (spanMs > 3 * 365 * day) return String(date.getUTCFullYear());
  if (spanMs > 60 * day)
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  if (spanMs > day) return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function boundsOf(
  targets: Map<string, NodeTarget>,
  metrics?: Map<string, { width: number; height: number }>
): Bounds {
  if (targets.size === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  targets.forEach((point, id) => {
    const metric = metrics?.get(id);
    const halfW = (metric?.width ?? 0) / 2;
    const halfH = (metric?.height ?? 0) / 2;
    minX = Math.min(minX, point.x - halfW);
    minY = Math.min(minY, point.y - halfH);
    maxX = Math.max(maxX, point.x + halfW);
    maxY = Math.max(maxY, point.y + halfH);
  });
  return { minX, minY, maxX, maxY };
}

export const distance = (a: LayoutPoint, b: LayoutPoint) => Math.hypot(b.x - a.x, b.y - a.y);

/** Point on the boundary of a card, along the direction of `towards`. */
export function anchorOnCard(
  center: LayoutPoint,
  size: { width: number; height: number },
  towards: LayoutPoint
): LayoutPoint {
  const dx = towards.x - center.x;
  const dy = towards.y - center.y;
  if (dx === 0 && dy === 0) return { ...center };
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}
