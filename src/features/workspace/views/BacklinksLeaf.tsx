import { BacklinksView } from '@/features/backlinks/BacklinksView';
import { useVaultSession } from '../VaultSessionContext';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { WorkspaceLeaf } from '../store/types';

export default function BacklinksLeaf({ leaf }: { leaf: WorkspaceLeaf }) {
  const { nodes, selectedNode, setSelectedNode, onLinkMention } = useVaultSession();
  const node = nodes.find((n) => n.id === (leaf.view.nodeId ?? selectedNode?.id)) ?? null;

  if (!node || node.type === 'folder') {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Open a note to see its backlinks.
      </div>
    );
  }

  return (
    <BacklinksView
      node={node}
      nodes={nodes}
      onLinkMention={onLinkMention}
      onOpenNode={(nodeId) => {
        const target = nodes.find((n) => n.id === nodeId);
        if (target) {
          setSelectedNode(target);
          useWorkspaceStore.getState().openFile(target.id, target.name);
        }
      }}
    />
  );
}
