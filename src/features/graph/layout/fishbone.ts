/** Ishikawa (fishbone) layout: spine, alternating major ribs and sub-branches. */

import { subtreeWeights } from '../model/buildGraphProjection';
import type {
  FishboneRib,
  FishboneSpine,
  LayoutContext,
  LayoutDecoration,
  LayoutGeometry,
  NodeTarget,
} from '../model/graphTypes';
import { boundsOf } from './layoutMath';

export interface FishboneInput {
  ids: string[];
  roots: string[];
  childrenOf: (id: string) => string[];
  context: LayoutContext;
}

export function fishboneLayout({ ids, roots, childrenOf, context }: FishboneInput): LayoutGeometry {
  const targets = new Map<string, NodeTarget>();
  const decorations: LayoutDecoration[] = [];
  if (!ids.length) {
    return { mode: 'fishbone', targets, bounds: boundsOf(targets), decorations };
  }

  const visible = new Set(ids);
  const children = (id: string) => childrenOf(id).filter((child) => visible.has(child));
  const visibleRoots = roots.filter((id) => visible.has(id));
  const weights = subtreeWeights(visibleRoots, children);

  const effect = context.rootId && visible.has(context.rootId) ? context.rootId : visibleRoots[0];
  const categories = effect
    ? children(effect)
    : visibleRoots;

  const alpha = context.ribAngle;
  const y0 = 0;
  const x0 = 0;
  const L = Math.max(600, context.width * 1.2);
  const x1 = x0 + L;

  if (effect) targets.set(effect, { x: x1 + context.levelGap, y: y0, side: 0 });
  decorations.push({ kind: 'fishbone-spine', x1: x0, y1: y0, x2: x1, y2: y0 } as FishboneSpine);

  const count = Math.max(1, categories.length);
  categories.forEach((categoryId, index) => {
    const anchorX = x0 + ((index + 1) * L) / (count + 1);
    const sign: 1 | -1 = index % 2 === 0 ? -1 : 1;
    const ribLength = Math.max(
      context.levelGap * 1.5,
      context.levelGap + (weights.get(categoryId) ?? 1) * context.siblingGap
    );
    const cx = anchorX - ribLength * Math.cos(alpha);
    const cy = y0 + sign * ribLength * Math.sin(alpha);
    targets.set(categoryId, { x: cx, y: cy, side: sign });
    decorations.push({
      kind: 'fishbone-rib',
      x1: anchorX,
      y1: y0,
      x2: cx,
      y2: cy,
      major: true,
    } as FishboneRib);

    const kids = children(categoryId);
    const m = kids.length;
    kids.forEach((kid, k) => {
      const t = (k + 1) / (m + 1);
      const baseX = anchorX - t * ribLength * Math.cos(alpha);
      const baseY = y0 + sign * t * ribLength * Math.sin(alpha);
      placeSubBranch(kid, baseX, baseY, sign, 1);
      decorations.push({
        kind: 'fishbone-rib',
        x1: baseX,
        y1: baseY,
        x2: targets.get(kid)!.x,
        y2: targets.get(kid)!.y,
        major: false,
      } as FishboneRib);
    });
  });

  function placeSubBranch(id: string, baseX: number, baseY: number, sign: 1 | -1, depth: number) {
    const px = -sign * Math.sin(alpha);
    const py = -Math.cos(alpha);
    const offset = depth * context.levelGap * 0.6;
    const x = baseX + offset * px;
    const y = baseY + offset * py * sign * -1;
    targets.set(id, { x, y, side: sign });
    const kids = children(id);
    kids.forEach((kid, index) => {
      placeSubBranch(
        kid,
        x + (index + 1) * context.siblingGap * Math.cos(alpha) * -1,
        y,
        sign,
        depth + 1
      );
    });
  }

  // Any node not reached above (detached branches) lands under the spine.
  let stray = 0;
  for (const id of ids) {
    if (targets.has(id)) continue;
    targets.set(id, {
      x: x0 + (stray % 6) * context.siblingGap * 4,
      y: y0 + context.levelGap * (3 + Math.floor(stray / 6)),
    });
    stray += 1;
  }

  return { mode: 'fishbone', targets, bounds: boundsOf(targets, context.nodeMetrics), decorations };
}
