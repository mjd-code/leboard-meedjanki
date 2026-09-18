/**
 * Maps a leaf view type to the component that renders it.
 * Views are lazy so a leaf only pulls in the code it needs.
 */

import { lazy, Suspense, type ComponentType } from 'react';
import type { ViewType, WorkspaceLeaf } from './store/types';

export type LeafViewProps = { leaf: WorkspaceLeaf };

const registry: Record<ViewType, ComponentType<LeafViewProps>> = {
  markdown: lazy(() => import('./views/MarkdownLeaf')),
  graph: lazy(() => import('./views/GraphLeaf')),
  backlinks: lazy(() => import('./views/BacklinksLeaf')),
  settings: lazy(() => import('./views/SettingsLeaf')),
  empty: lazy(() => import('./views/EmptyLeaf')),
};

export function LeafView({ leaf }: LeafViewProps) {
  const Component = registry[leaf.view.type] ?? registry.empty;
  return (
    <Suspense
      fallback={<div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}
    >
      <Component leaf={leaf} />
    </Suspense>
  );
}
