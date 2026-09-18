/**
 * Drives the layout worker and returns positions for the current projection.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GraphModel, LayoutOptions, LayoutResponse, Positions } from './types';

export interface LayoutState extends Positions {
  kind: LayoutResponse['kind'];
  ticks?: LayoutResponse['ticks'];
  spine?: LayoutResponse['spine'];
  computing: boolean;
}

const EMPTY: LayoutState = {
  kind: 'force',
  index: {},
  x: new Float32Array(0),
  y: new Float32Array(0),
  computing: false,
};

export function useGraphLayout(model: GraphModel, options: LayoutOptions): LayoutState {
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const [state, setState] = useState<LayoutState>(EMPTY);

  useEffect(() => {
    const worker = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<LayoutResponse>) => {
      const res = event.data;
      if (res.id !== requestId.current) return; // stale result
      const index: Record<string, number> = {};
      res.ids.forEach((id, i) => (index[id] = i));
      setState({
        kind: res.kind,
        index,
        x: res.x,
        y: res.y,
        ticks: res.ticks,
        spine: res.spine,
        computing: false,
      });
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Recompute whenever the model or the projection changes.
  const signature = useMemo(
    () =>
      JSON.stringify({
        n: model.nodes.map((n) => n.id),
        l: model.links.length,
        o: options,
      }),
    [model, options]
  );

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !model.nodes.length) {
      if (!model.nodes.length) setState((s) => ({ ...s, computing: false }));
      return;
    }
    requestId.current += 1;
    setState((s) => ({ ...s, computing: true }));
    worker.postMessage({ id: requestId.current, model, options });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return state;
}
