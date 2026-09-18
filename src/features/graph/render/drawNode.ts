/** Card node renderer with level-of-detail and a collapse toggle hit region. */

import type { RenderNode } from '../model/graphTypes';
import { cardFont, cardLayout, CARD_FONT_SIZE } from './textLayout';
import { accentFor, dim, type GraphTheme } from './theme';

export interface DrawNodeState {
  theme: GraphTheme;
  zoom: number;
  selected: boolean;
  hovered: boolean;
  dimmed: boolean;
  collapsed: boolean;
  isRoot: boolean;
  showLabels: boolean;
  labelThreshold: number;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: RenderNode,
  state: DrawNodeState
) {
  const { theme, zoom } = state;
  const accent = accentFor(node, theme, state.selected);
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const alpha = state.dimmed ? 0.18 : theme.nodeOpacity;

  // Below the threshold only a marker is drawn.
  if (zoom < state.labelThreshold * 0.6) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    node.toggle = null;
    return;
  }

  const fontSize = state.isRoot ? CARD_FONT_SIZE + 2 : CARD_FONT_SIZE;
  const layout = cardLayout(node.name, {
    root: state.isRoot,
    badge: node.childCount > 0,
    fontSize,
  });
  const w = layout.width;
  const h = layout.height;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (state.selected || state.hovered) {
    ctx.shadowBlur = 14;
    ctx.shadowColor = dim(accent, 0.75);
  }
  roundedRect(ctx, x - w / 2, y - h / 2, w, h, 8);
  ctx.fillStyle = dim(accent, state.selected ? 0.32 : 0.16);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = state.selected ? 2 : 1;
  ctx.strokeStyle = state.selected ? accent : dim(accent, 0.6);
  ctx.stroke();

  // Type accent bar.
  ctx.fillStyle = accent;
  roundedRect(ctx, x - w / 2, y - h / 2, 3, h, 2);
  ctx.fill();

  if (state.showLabels && zoom >= state.labelThreshold * 0.6) {
    ctx.font = cardFont(fontSize, state.isRoot ? '600' : '500');
    ctx.fillStyle = theme.label;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const lineHeight = fontSize + 4;
    const startY = y - ((layout.lines.length - 1) * lineHeight) / 2;
    const textX = x - w / 2 + 12;
    layout.lines.forEach((line, index) => {
      ctx.fillText(line, textX, startY + index * lineHeight);
    });
  }

  // Child-count badge.
  if (node.childCount > 0 && zoom >= state.labelThreshold) {
    ctx.font = cardFont(9, '600');
    ctx.fillStyle = dim(accent, 0.9);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(node.childCount), x + w / 2 - 14, y - h / 2 + 8);
  }

  ctx.restore();

  // Collapse toggle on the outward edge of branch nodes.
  if (node.childCount > 0) {
    const r = 6;
    const tx = x + w / 2 + r + 2;
    const ty = y;
    ctx.save();
    ctx.globalAlpha = state.dimmed ? 0.25 : 1;
    ctx.beginPath();
    ctx.arc(tx, ty, r, 0, Math.PI * 2);
    ctx.fillStyle = theme.card;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = dim(accent, 0.8);
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tx - 3, ty);
    ctx.lineTo(tx + 3, ty);
    if (state.collapsed) {
      ctx.moveTo(tx, ty - 3);
      ctx.lineTo(tx, ty + 3);
    }
    ctx.stroke();
    ctx.restore();
    node.toggle = { x: tx, y: ty, r: r + 3 };
  } else {
    node.toggle = null;
  }
}

/** Pointer area covers the card plus its toggle. */
export function paintNodePointerArea(
  ctx: CanvasRenderingContext2D,
  node: RenderNode,
  color: string,
  isRoot: boolean
) {
  const layout = cardLayout(node.name, {
    root: isRoot,
    badge: node.childCount > 0,
  });
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const extra = node.childCount > 0 ? 18 : 0;
  ctx.fillStyle = color;
  ctx.fillRect(
    x - layout.width / 2,
    y - layout.height / 2,
    layout.width + extra,
    layout.height
  );
}
