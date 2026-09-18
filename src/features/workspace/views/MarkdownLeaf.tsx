import { NodePanel } from '@/features/graph/NodePanel';
import { useVaultSession } from '../VaultSessionContext';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import type { WorkspaceLeaf } from '../store/types';

export default function MarkdownLeaf({ leaf }: { leaf: WorkspaceLeaf }) {
  const {
    nodes,
    getNodePath,
    getBacklinksForNode,
    onNodeUpdate,
    onNodeDelete,
    onWikilinkClick,
    onTagClick,
    setSelectedNode,
  } = useVaultSession();
  const closeLeaf = useWorkspaceStore((s) => s.closeLeaf);

  const node = nodes.find((n) => n.id === leaf.view.nodeId) ?? null;
  if (!node) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        This note is no longer available.
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <NodePanel
        node={node}
        nodePath={getNodePath(node.id)}
        onClose={() => closeLeaf(leaf.id)}
        onUpdate={onNodeUpdate}
        onDelete={onNodeDelete}
        backlinks={getBacklinksForNode(node)}
        onWikilinkClick={onWikilinkClick}
        onBacklinkClick={(nodeId) => {
          const target = nodes.find((n) => n.id === nodeId);
          if (target) {
            setSelectedNode(target);
            useWorkspaceStore.getState().openFile(target.id, target.name);
          }
        }}
        onTagClick={onTagClick}
      />
    </div>
  );
}
