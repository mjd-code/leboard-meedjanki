/** Axis, spine and rib decorations, drawn once per frame before links. */

import type { LayoutDecoration } from '../model/graphTypes';
import { cardFont } from './textLayout';
import { dim, type GraphTheme } from './theme';

export function drawDecorations(
  ctx: CanvasRenderingContext2D,
  decorations: LayoutDecoration[],
  theme: GraphTheme,
  zoom: number
) {
  if (!decorations.length) return;
  ctx.save();
  for (const decoration of decorations) {
    if (decoration.kind === 'timeline-axis') {
      ctx.strokeStyle = dim(theme.decoration, 0.5);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(decoration.x1, decoration.y);
      ctx.lineTo(decoration.x2, decoration.y);
      ctx.stroke();

      ctx.font = cardFont(10, '500');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const tick of decoration.ticks) {
        ctx.strokeStyle = dim(theme.decoration, 0.25);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tick.x, decoration.y - 6);
        ctx.lineTo(tick.x, decoration.y + 6);
        ctx.stroke();
        if (zoom > 0.4) {
          ctx.fillStyle = dim(theme.label, 0.75);
          ctx.fillText(tick.label, tick.x, decoration.y + 10);
        }
      }
    } else if (decoration.kind === 'fishbone-spine') {
      ctx.strokeStyle = dim(theme.decoration, 0.8);
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(decoration.x1, decoration.y1);
      ctx.lineTo(decoration.x2, decoration.y2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = dim(theme.decoration, decoration.major ? 0.6 : 0.3);
      ctx.lineWidth = decoration.major ? 2 : 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(decoration.x1, decoration.y1);
      ctx.lineTo(decoration.x2, decoration.y2);
      ctx.stroke();
    }
  }
  ctx.restore();
}
