import { useMemo, useSyncExternalStore } from 'react';
import { metadataCache } from '@/core/metadata/MetadataCache';
import type { Node } from '@/shared/stores/types';

/** Re-renders when the metadata index changes. */
export function useMetadataVersion(): number {
  return useSyncExternalStore(
    (listener) => metadataCache.subscribe(listener),
    () => metadataCache.getVersion(),
    () => metadataCache.getVersion()
  );
}

/**
 * Indexes the given nodes and returns them enriched with derived
 * tags / wikilinks from note content.
 */
export function useIndexedNodes(nodes: Node[]): Node[] {
  return useMemo(() => metadataCache.index(nodes), [nodes]);
}
