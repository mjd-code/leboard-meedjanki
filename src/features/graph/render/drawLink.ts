/** Layout-aware link rendering: bezier branches, timeline arches, fishbone ribs. */

import type { LayoutMode, NodeMetric, RenderNode } from '../model/graphTypes';
import { anchorOnCard } from '../layout/layoutMath';
import { dim, type GraphTheme } from './theme';

export interface DrawLinkState {
  mode: LayoutMode;
  theme: GraphTheme;
  color: string;
  width: number;
  opacity: number;
  dash: number[];
  dimmed: boolean;
  showArrow: boolean;
  arrowLength: number;
  metricOf: (node: RenderNode) => NodeMetric;
}

export function drawLink(
  ctx: CanvasRenderingContext2D,
  source: RenderNode,
  target: RenderNode,
  state: DrawLinkState
) {
  const sx = source.x ?? 0;
  const sy = source.y ?? 0;
  const tx = target.x ?? 0;
  const ty = target.y ?? 0;
  if (!Number.isFinite(sx) || !Number.isFinite(tx)) return;

  const start = anchorOnCard({ x: sx, y: sy }, state.metricOf(source), { x: tx, y: ty });
  const end = anchorOnCard({ x: tx, y: ty }, state.metricOf(target), { x: sx, y: sy });

  ctx.save();
  ctx.setLineDash(state.dash);
  ctx.lineWidth = Math.max(0.4, state.width - source.depth * 0.15);
  ctx.strokeStyle = dim(state.color, state.dimmed ? 0.08 : state.opacity);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);

  let tangent = Math.atan2(end.y - start.y, end.x - start.x);

  if (state.mode === 'mindmap') {
    const dx = end.x - start.x;
    const k = 0.45;
    ctx.bezierCurveTo(start.x + k * dx, start.y, end.x - k * dx, end.y, end.x, end.y);
    tangent = Math.atan2(end.y - (end.y + (start.y - end.y) * 0.05), end.x - (end.x - k * dx));
  } else if (state.mode === 'timeline') {
    const dx = end.x - start.x;
    const lift = Math.min(90, Math.max(18, Math.abs(dx) * 0.35));
    const midY = (start.y + end.y) / 2 - Math.sign(start.y || 1) * lift * 0.25;
    ctx.bezierCurveTo(start.x, midY, end.x, midY, end.x, end.y);
  } else if (state.mode === 'fishbone') {
    ctx.lineTo(end.x, end.y);
  } else {
    ctx.lineTo(end.x, end.y);
  }
  ctx.stroke();

  if (state.showArrow && state.arrowLength > 0 && !state.dimmed) {
    const len = state.arrowLength;
    ctx.setLineDash([]);
    ctx.fillStyle = dim(state.color, state.opacity);
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - len * Math.cos(tangent - Math.PI / 7),
      end.y - len * Math.sin(tangent - Math.PI / 7)
    );
    ctx.lineTo(
      end.x - len * Math.cos(tangent + Math.PI / 7),
      end.y - len * Math.sin(tangent + Math.PI / 7)
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
