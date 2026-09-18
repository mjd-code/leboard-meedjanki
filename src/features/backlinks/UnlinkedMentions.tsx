/**
 * Notes that mention this note's title in plain text without linking it.
 * "Link" rewrites the mention into a wikilink in the source note.
 */

import { FileText, Link2 } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import type { Node } from '@/shared/stores/types';
import { useUnlinkedMentions } from './useUnlinkedMentions';

interface UnlinkedMentionsProps {
  node: Node;
  nodes: Node[];
  onOpenNode: (nodeId: string) => void;
  onLinkMention: (sourceNodeId: string, targetName: string) => void;
}

export function UnlinkedMentions({
  node,
  nodes,
  onOpenNode,
  onLinkMention,
}: UnlinkedMentionsProps) {
  const mentions = useUnlinkedMentions(nodes, node.id);

  return (
    <section>
      <h4 className="text-xs font-medium text-muted-foreground mb-2">
        Unlinked mentions ({mentions.length})
      </h4>
      {mentions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No unlinked mentions.</p>
      ) : (
        <div className="space-y-1">
          {mentions.map((hit) => (
            <div
              key={hit.nodeId}
              className="p-2 rounded-md border border-border/60 hover:bg-accent/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                <button
                  onClick={() => onOpenNode(hit.nodeId)}
                  className="text-sm truncate text-left flex-1"
                >
                  {hit.nodeName}
                </button>
                {hit.count > 1 && (
                  <Badge variant="outline" className="text-[10px]">
                    {hit.count}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => onLinkMention(hit.nodeId, node.name)}
                >
                  <Link2 className="w-3 h-3 mr-1" />
                  Link
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{hit.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
