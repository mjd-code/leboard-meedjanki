/**
 * Global graph interaction state.
 *
 * Graph *content* stays in the vault session; this store only holds view state
 * (layout mode, collapse set, selection, hover, focus, transition status).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LayoutMode, MindmapOrientation } from './graphTypes';

export type TransitionStatus = 'idle' | 'animating';
export type HighlightMode = 'off' | 'pathway';

/** Legacy persisted names from the worker engine. */
const LEGACY_MODES: Record<string, LayoutMode> = {
  force: 'free-force',
  tree: 'mindmap',
  mindmap: 'mindmap',
  timeline: 'timeline',
  fishbone: 'fishbone',
  'free-force': 'free-force',
};

export const normalizeLayoutMode = (value: unknown): LayoutMode =>
  LEGACY_MODES[String(value)] ?? 'mindmap';

export interface GraphInteractionState {
  layoutMode: LayoutMode;
  orientation: MindmapOrientation;
  highlightMode: HighlightMode;
  collapsedIds: string[];
  selectedId: string | null;
  hoveredId: string | null;
  focusedRootId: string | null;
  transitionStatus: TransitionStatus;

  setLayoutMode: (mode: LayoutMode) => void;
  setOrientation: (orientation: MindmapOrientation) => void;
  setHighlightMode: (mode: HighlightMode) => void;
  toggleCollapsed: (id: string) => void;
  setCollapsed: (ids: string[]) => void;
  expandAll: () => void;
  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setFocusedRoot: (id: string | null) => void;
  setTransitionStatus: (status: TransitionStatus) => void;
}

export const useGraphInteractionStore = create<GraphInteractionState>()(
  persist(
    (set) => ({
      layoutMode: 'mindmap',
      orientation: 'balanced',
      highlightMode: 'pathway',
      collapsedIds: [],
      selectedId: null,
      hoveredId: null,
      focusedRootId: null,
      transitionStatus: 'idle',

      setLayoutMode: (layoutMode) => set({ layoutMode: normalizeLayoutMode(layoutMode) }),
      setOrientation: (orientation) => set({ orientation }),
      setHighlightMode: (highlightMode) => set({ highlightMode }),
      toggleCollapsed: (id) =>
        set((state) => ({
          collapsedIds: state.collapsedIds.includes(id)
            ? state.collapsedIds.filter((item) => item !== id)
            : [...state.collapsedIds, id],
        })),
      setCollapsed: (collapsedIds) => set({ collapsedIds }),
      expandAll: () => set({ collapsedIds: [] }),
      setSelected: (selectedId) => set({ selectedId }),
      setHovered: (hoveredId) => set({ hoveredId }),
      setFocusedRoot: (focusedRootId) => set({ focusedRootId }),
      setTransitionStatus: (transitionStatus) => set({ transitionStatus }),
    }),
    {
      name: 'graph-interaction-storage',
      version: 1,
      partialize: (state) => ({
        layoutMode: state.layoutMode,
        orientation: state.orientation,
        highlightMode: state.highlightMode,
        collapsedIds: state.collapsedIds,
      }),
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<GraphInteractionState>;
        return { ...state, layoutMode: normalizeLayoutMode(state.layoutMode) };
      },
    }
  )
);
