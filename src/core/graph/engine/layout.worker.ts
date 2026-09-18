/// <reference lib="webworker" />
/**
 * Layout worker — keeps force/tree/timeline/fishbone maths off the main thread.
 * Positions travel back as transferable Float32Arrays.
 */

import { computeLayout } from './layouts';
import type { LayoutRequest } from './types';

self.onmessage = (event: MessageEvent<LayoutRequest>) => {
  const { id, model, options } = event.data;
  const result = computeLayout(id, model, options);
  (self as unknown as Worker).postMessage(result, [result.x.buffer, result.y.buffer]);
};
