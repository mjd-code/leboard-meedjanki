/**
 * Graph engine settings: which projection is active, how links are routed,
 * per-depth sub-layout rules and the renderer switch.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DepthRule, LayoutKind, LinkRouting } from '@/core/graph/engine/types';

export interface GraphEngineState {
  /** Use the new Canvas engine instead of react-force-graph-2d. */
  useCanvasEngine: boolean;
  layout: LayoutKind;
  /** 'auto' picks the routing that fits the active layout. */
  routing: LinkRouting | 'auto';
  timeField: string;
  linkDistance: number;
  chargeStrength: number;
  laneHeight: number;
  levelDistance: number;
  showLabels: boolean;
  labelZoomThreshold: number;
  
  depthRules: DepthRule[];
  setLayout: (layout: LayoutKind) => void;
  patch: (partial: Partial<Omit<GraphEngineState, 'patch' | 'setLayout'>>) => void;
  addDepthRule: () => void;
  updateDepthRule: (id: string, partial: Partial<DepthRule>) => void;
  removeDepthRule: (id: string) => void;
}

export const useGraphEngineStore = create<GraphEngineState>()(
  persist(
    (set) => ({
      useCanvasEngine: true,
      layout: 'force',
      routing: 'auto',
      timeField: 'date',
      linkDistance: 60,
      chargeStrength: -180,
      laneHeight: 46,
      levelDistance: 110,
      showLabels: true,
      labelZoomThreshold: 0.7,
      
      depthRules: [],
      setLayout: (layout) => set({ layout }),
      patch: (partial) => set(partial),
      addDepthRule: () =>
        set((s) => ({
          depthRules: [
            ...s.depthRules,
            {
              id: crypto.randomUUID(),
              fromDepth: 0,
              toDepth: 2,
              kind: 'force' as LayoutKind,
            },
          ],
        })),
      updateDepthRule: (id, partial) =>
        set((s) => ({
          depthRules: s.depthRules.map((r) => (r.id === id ? { ...r, ...partial } : r)),
        })),
      removeDepthRule: (id) =>
        set((s) => ({ depthRules: s.depthRules.filter((r) => r.id !== id) })),
    }),
    { name: 'graph-engine-storage' }
  )
);
