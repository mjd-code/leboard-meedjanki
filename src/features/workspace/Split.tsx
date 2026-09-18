/** Renders the workspace tree: splits become resizable panel groups. */

import { Fragment } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/ui/resizable';
import { Group } from './Group';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import type { WorkspaceNode } from './store/types';

export function WorkspaceTree({ node }: { node: WorkspaceNode }) {
  const activeGroupId = useWorkspaceStore((s) => s.activeGroupId);
  const setSizes = useWorkspaceStore((s) => s.setSizes);

  if (node.kind === 'group') {
    return <Group group={node} isActive={node.id === activeGroupId} />;
  }

  return (
    <ResizablePanelGroup direction={node.direction} onLayout={(sizes) => setSizes(node.id, sizes)}>
      {node.children.map((child, index) => (
        <Fragment key={child.id}>
          {index > 0 && <ResizableHandle withHandle />}
          <ResizablePanel
            defaultSize={node.sizes[index] ?? 100 / node.children.length}
            minSize={15}
          >
            <WorkspaceTree node={child} />
          </ResizablePanel>
        </Fragment>
      ))}
    </ResizablePanelGroup>
  );
}
