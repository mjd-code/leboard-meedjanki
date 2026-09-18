/**
 * Link router — boundary-to-boundary paths, per layout.
 *
 * Anchors sit on the node's edge (never its centre) so thick strokes and
 * arrowheads never disappear underneath a node.
 */

import type { LinkRouting } from './types';
import { path as createPath } from 'd3-path';

export interface Point {
  x: number;
  y: number;
}

export interface RoutedEnd extends Point {
  radius: number;
}

/** Move a point from a node centre onto its boundary, facing `towards`. */
export function anchor(from: RoutedEnd, towards: Point): Point {
  const dx = towards.x - from.x;
  const dy = towards.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / len) * from.radius, y: from.y + (dy / len) * from.radius };
}

export function routingForLayout(kind: string): LinkRouting {
  switch (kind) {
    case 'tree':
    case 'fishbone':
      return 'elbow';
    case 'timeline':
      return 'bezier';
    default:
      return 'straight';
  }
}

/** Build a path between two nodes using d3-path and the requested routing. */
export function routeLink(
  source: RoutedEnd,
  target: RoutedEnd,
  routing: LinkRouting
): Path2D {
  const a = anchor(source, target);
  const b = anchor(target, source);
  const path = createPath();
  path.moveTo(a.x, a.y);

  switch (routing) {
    case 'elbow': {
      const midY = (a.y + b.y) / 2;
      path.lineTo(a.x, midY);
      path.lineTo(b.x, midY);
      path.lineTo(b.x, b.y);
      break;
    }
    case 'bezier': {
      const dx = Math.abs(b.x - a.x);
      const lift = Math.min(120, Math.max(30, dx / 2));
      path.bezierCurveTo(a.x + lift, a.y, b.x - lift, b.y, b.x, b.y);
      break;
    }
    default:
      path.lineTo(b.x, b.y);
  }

  return new Path2D(path.toString());
}
