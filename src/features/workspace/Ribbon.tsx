/**
 * Left ribbon plus the expandable side panel. Reads everything it needs from
 * the vault session, so no props are drilled through the workspace.
 */

import { useNavigate } from 'react-router-dom';
import { IconRibbon, type RibbonTool } from './IconRibbon';
import { SidebarPanel } from './SidebarPanel';
import { GraphConfigPanel } from '@/features/graph/config-panel';
import { useGraphStore, useUIStore } from '@/shared/stores';
import { toast } from 'sonner';
import { useVaultSession } from './VaultSessionContext';
import { useWorkspaceStore } from './store/useWorkspaceStore';

function GraphConfigTrigger() {
  const { nodes, setSelectedNode } = useVaultSession();
  const config = useGraphStore((s) => s.config);
  const stats = useGraphStore((s) => s.stats);
  const updateNodeConfig = useGraphStore((s) => s.updateNodeConfig);
  const updateLinkConfig = useGraphStore((s) => s.updateLinkConfig);
  const updateTopologyConfig = useGraphStore((s) => s.updateTopologyConfig);
  const updateTopologyStyle = useGraphStore((s) => s.updateTopologyStyle);
  const updateForceConfig = useGraphStore((s) => s.updateForceConfig);
  const resetConfig = useGraphStore((s) => s.resetConfig);

  return (
    <GraphConfigPanel
      config={config}
      stats={stats}
      onNodeConfigUpdate={updateNodeConfig}
      onLinkConfigUpdate={updateLinkConfig}
      onTopologyConfigUpdate={updateTopologyConfig}
      onTopologyStyleUpdate={updateTopologyStyle}
      onForceConfigUpdate={updateForceConfig}
      onReset={resetConfig}
      onReheatSimulation={() => toast.info('Simulation reheated')}
      onStopSimulation={() => toast.info('Simulation stopped')}
      onNodeSelect={(nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) setSelectedNode(node);
      }}
      variant="compact"
    />
  );
}

export function Ribbon() {
  const navigate = useNavigate();
  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const openView = useWorkspaceStore((s) => s.openView);
  const {
    nodes,
    selectedNode,
    setSelectedNode,
    onNodeMove,
    onAddNode,
    onImportComplete,
    onCloseVault,
    currentVaultId,
    vaultName,
    vaultType,
  } = useVaultSession();

  const handleToolSelect = (tool: RibbonTool) => {
    if (tool === 'vaults' || tool === 'account') {
      navigate('/vaults');
      return;
    }
    if (tool === 'graph') {
      openView({ type: 'graph', title: 'Graph View' });
      return;
    }
    if (tool === 'settings') {
      openView({ type: 'settings', title: 'Settings' });
      return;
    }
    setActiveTool(activeTool === tool ? null : tool);
  };

  return (
    <>
      <IconRibbon activeTool={activeTool} onToolSelect={handleToolSelect} />
      {activeTool && (
        <SidebarPanel
          activeTool={activeTool}
          onClose={() => setActiveTool(null)}
          nodes={nodes}
          selectedNode={selectedNode}
          onNodeSelect={(node) => {
            setSelectedNode(node);
            if (node.type !== 'folder') openView({ type: 'markdown', nodeId: node.id, title: node.name });
          }}
          onNodeMove={onNodeMove}
          onAddNode={onAddNode}
          isVaultMode={!!currentVaultId}
          vaultName={vaultName}
          vaultType={vaultType}
          onCloseVault={onCloseVault}
          graphConfigTrigger={<GraphConfigTrigger />}
          onImportComplete={onImportComplete}
        />
      )}
    </>
  );
}
