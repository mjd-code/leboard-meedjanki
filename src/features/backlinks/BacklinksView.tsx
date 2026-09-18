/**
 * Backlinks for the active note, read straight from the MetadataCache,
 * plus worker-computed unlinked mentions.
 */

import { FileText, Link as LinkIcon } from 'lucide-react';
import { metadataCache } from '@/core/metadata/MetadataCache';
import { useMetadataVersion } from '@/core/metadata/useMetadataCache';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from '@/shared/ui/scroll-area';
import type { Node } from '@/shared/stores/types';
import { UnlinkedMentions } from './UnlinkedMentions';

interface BacklinksViewProps {
  node: Node;
  nodes: Node[];
  onOpenNode: (nodeId: string) => void;
  onLinkMention: (sourceNodeId: string, targetName: string) => void;
}

export function BacklinksView({ node, nodes, onOpenNode, onLinkMention }: BacklinksViewProps) {
  // Re-render when the index changes.
  useMetadataVersion();
  const backlinks = metadataCache.getBacklinks(node.id);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <LinkIcon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{node.name}</span>
        <Badge variant="secondary" className="ml-auto">
          {backlinks.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <section>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Linked mentions ({backlinks.length})
            </h4>
            {backlinks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No notes link here yet.</p>
            ) : (
              <div className="space-y-1">
                {backlinks.map((ref) => (
                  <button
                    key={ref.nodeId}
                    onClick={() => onOpenNode(ref.nodeId)}
                    className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <FileText className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-sm truncate">{ref.nodeName}</span>
                    {ref.count > 1 && (
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {ref.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          <UnlinkedMentions
            node={node}
            nodes={nodes}
            onOpenNode={onOpenNode}
            onLinkMention={onLinkMention}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
