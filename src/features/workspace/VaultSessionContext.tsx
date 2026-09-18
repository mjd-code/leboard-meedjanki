/**
 * Vault session — owns all vault side effects and note mutations that used to
 * live in Index.tsx, and exposes them through context so workspace leaves can
 * consume them without prop drilling.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { extractMentions } from '@/core/metadata/markdown-parser';
import { enrichNode, metadataCache } from '@/core/metadata/MetadataCache';
import { linkMentions, renameNode } from '@/core/file-manager/FileManager';
import { useIndexedNodes, useMetadataVersion } from '@/core/metadata/useMetadataCache';
import { getVaultManager } from '@/core/vault/VaultManagerSingleton';
import { vaultSyncService } from '@/core/vault/VaultSyncService';
import { syncEngine } from '@/core/sync/SyncEngine';
import { isFeatureEnabled } from '@/core/plugins/feature-toggles';
import { useFeatureEnabled } from '@/core/plugins/useFeatureEnabled';
import { useAutoLinks } from '@/features/graph/hooks/useAutoLinks';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useGraphStore,
  useNodeStore,
  useVaultStore,
  type Backlink,
  type GraphData,
  type Node,
} from '@/shared/stores';
import { useWorkspaceStore } from './store/useWorkspaceStore';

interface VaultSessionValue {
  nodes: Node[];
  graphData: GraphData;
  selectedNode: Node | null;
  currentVaultId: string | null;
  vaultName: string | null;
  vaultType?: 'in-memory' | 'local-folder';
  saveStatus: ReturnType<typeof useVaultStore.getState>['saveStatus'];
  lastSaved: Date | null;
  setSelectedNode: (node: Node | null) => void;
  setGraphData: (data: GraphData) => void;
  getNodePath: (nodeId: string) => string;
  getBacklinksForNode: (node: Node) => Backlink[];
  onNodeUpdate: (node: Node) => Promise<void>;
  onNodeDelete: (nodeId: string) => Promise<void>;
  onNodeMove: (nodeId: string, newParentId: string | null) => Promise<void>;
  onAddNode: (type: 'folder' | 'file') => Promise<void>;
  onImportComplete: (importedNodes: Node[], updatedNodes?: Node[]) => Promise<void>;
  onCloseVault: () => Promise<void>;
  onWikilinkClick: (target: string) => void;
  onTagClick: (tag: string) => void;
  onLinkMention: (sourceNodeId: string, targetName: string) => Promise<void>;
}

const VaultSessionContext = createContext<VaultSessionValue | null>(null);

export function useVaultSession(): VaultSessionValue {
  const ctx = useContext(VaultSessionContext);
  if (!ctx) throw new Error('useVaultSession must be used inside VaultSessionProvider');
  return ctx;
}

export function VaultSessionProvider({ children }: { children: ReactNode }) {
  const vaultManager = getVaultManager();
  const { user, session } = useAuth();
  const isAuthenticated = !!user && !!session;

  const nodes = useNodeStore((s) => s.nodes);
  const selectedNode = useNodeStore((s) => s.selectedNode);
  const setNodes = useNodeStore((s) => s.setNodes);
  const setSelectedNode = useNodeStore((s) => s.setSelectedNode);
  const updateNode = useNodeStore((s) => s.updateNode);
  const deleteNodes = useNodeStore((s) => s.deleteNodes);
  const addNodeToStore = useNodeStore((s) => s.addNode);
  const moveNodeInStore = useNodeStore((s) => s.moveNode);
  const getNodePath = useNodeStore((s) => s.getNodePath);
  const getDescendants = useNodeStore((s) => s.getDescendants);
  const resetNodes = useNodeStore((s) => s.reset);

  const currentVaultId = useVaultStore((s) => s.currentVaultId);
  const saveStatus = useVaultStore((s) => s.saveStatus);
  const lastSaved = useVaultStore((s) => s.lastSaved);
  const setCurrentVaultId = useVaultStore((s) => s.setCurrentVaultId);
  const setVaultGraphConfig = useVaultStore((s) => s.setVaultGraphConfig);
  const setSaveStatus = useVaultStore((s) => s.setSaveStatus);
  const setLastSaved = useVaultStore((s) => s.setLastSaved);
  const updateUndoRedoState = useVaultStore((s) => s.updateUndoRedoState);
  const resetVault = useVaultStore((s) => s.reset);

  const graphConfig = useGraphStore((s) => s.config);
  const isDirty = useGraphStore((s) => s.isDirty);
  const loadConfig = useGraphStore((s) => s.loadConfig);
  const computeStats = useGraphStore((s) => s.computeStats);
  const markClean = useGraphStore((s) => s.markClean);

  const loadVaultLayout = useWorkspaceStore((s) => s.loadVaultLayout);
  const closeLeavesForNode = useWorkspaceStore((s) => s.closeLeaf);
  const renameLeaf = useWorkspaceStore((s) => s.renameLeaf);

  const saveVault = useCallback(async () => {
    if (!currentVaultId) return;
    setSaveStatus('saving');
    try {
      await vaultManager.saveCurrentVault();
      await vaultManager.recordVaultChange(currentVaultId);
      if (isAuthenticated && isFeatureEnabled('cloud-sync')) {
        const result = await syncEngine.syncVault(vaultManager, currentVaultId);
        if (result.conflicts?.length) {
          toast.warning(
            `Saved with ${result.conflicts.length} conflict cop${result.conflicts.length === 1 ? 'y' : 'ies'}`,
            { description: result.conflicts.join(', ') }
          );
        }
      }
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      setSaveStatus('error');
      console.error('Save failed:', error);
    }
  }, [currentVaultId, vaultManager, isAuthenticated, setSaveStatus, setLastSaved]);

  useEffect(() => {
    if (isDirty && currentVaultId) {
      vaultManager.setGraphConfig(currentVaultId, graphConfig).then(markClean);
    }
  }, [isDirty, currentVaultId, graphConfig, vaultManager, markClean]);

  const indexedNodes = useIndexedNodes(nodes);
  const metadataVersion = useMetadataVersion();

  // Graph edges come from the MetadataCache link index, not a second parse.
  const resolvedLinks = useMemo(
    () => metadataCache.resolvedLinks,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metadataVersion, indexedNodes]
  );

  const autoLinksEnabled = useFeatureEnabled('auto-links');

  const autoLinks = useAutoLinks(
    indexedNodes,
    {
      hierarchy: autoLinksEnabled && graphConfig.topology.showHierarchy,
      tags: autoLinksEnabled && graphConfig.topology.showTags,
      backlinks: autoLinksEnabled && graphConfig.topology.showBacklinks,
      tagThreshold: graphConfig.topology.tagThreshold,
    },
    resolvedLinks
  );

  useEffect(() => {
    computeStats(indexedNodes, autoLinks);
  }, [indexedNodes, autoLinks, computeStats]);

  const graphData = useMemo<GraphData>(
    () => ({
      nodes: indexedNodes,
      links: autoLinks.map((link) => ({
        source: link.source,
        target: link.target,
        type: link.type,
      })),
    }),
    [indexedNodes, autoLinks]
  );

  const setGraphData = useCallback((data: GraphData) => setNodes(data.nodes), [setNodes]);

  const refreshUndoRedoState = useCallback(
    (vaultId: string) => {
      updateUndoRedoState(vaultManager.canUndo(vaultId), vaultManager.canRedo(vaultId));
    },
    [vaultManager, updateUndoRedoState]
  );

  const loadActiveVault = useCallback(() => {
    const activeVault = vaultManager.getActiveVault();
    if (activeVault) {
      setCurrentVaultId(activeVault.id);
      setNodes(activeVault.graphService.getGraphData().nodes);
      const savedGraphConfig = vaultManager.getGraphConfig(activeVault.id);
      setVaultGraphConfig(savedGraphConfig);
      loadConfig(savedGraphConfig);
      refreshUndoRedoState(activeVault.id);
      loadVaultLayout(activeVault.id);
    } else {
      resetVault();
      resetNodes();
      loadConfig(null);
      loadVaultLayout(null);
    }
  }, [
    vaultManager,
    setCurrentVaultId,
    setNodes,
    setVaultGraphConfig,
    loadConfig,
    refreshUndoRedoState,
    resetVault,
    resetNodes,
    loadVaultLayout,
  ]);

  useEffect(() => {
    vaultManager.initialize().then(loadActiveVault);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleFocus = () => loadActiveVault();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadActiveVault]);

  useEffect(() => {
    const reloadVaults = async () => {
      if (isAuthenticated) {
        await vaultManager.initialize();
        await vaultSyncService.syncFromCloud(vaultManager);
        loadActiveVault();
      } else {
        resetVault();
        resetNodes();
      }
    };
    reloadVaults();
  }, [isAuthenticated, vaultManager, loadActiveVault, resetVault, resetNodes]);

  // Keep tab titles in sync with note names.
  useEffect(() => {
    nodes.forEach((node) => renameLeaf(node.id, node.name));
  }, [nodes, renameLeaf]);

  const getBacklinksForNode = useCallback(
    (targetNode: Node): Backlink[] => {
      if (!targetNode || targetNode.type === 'folder') return [];
      const links: Backlink[] = [];
      const linked = new Set(
        metadataCache.getBacklinks(targetNode.id).map((ref) => ref.nodeId)
      );

      indexedNodes.forEach((node) => {
        if (node.id === targetNode.id || node.type === 'folder') return;
        if (linked.has(node.id)) {
          links.push({
            nodeId: node.id,
            nodeName: node.name,
            nodePath: getNodePath(node.id),
            isWikilink: true,
          });
        } else if (extractMentions(node.content, targetNode.name)) {
          links.push({
            nodeId: node.id,
            nodeName: node.name,
            nodePath: getNodePath(node.id),
            isWikilink: false,
          });
        }
      });

      return links;
      // metadataVersion keeps this in sync with re-indexing.
    },
    [indexedNodes, metadataVersion, getNodePath]
  );

  const onCloseVault = useCallback(async () => {
    if (!currentVaultId) return;
    await vaultManager.deleteVault(currentVaultId);
    resetVault();
    resetNodes();
    toast.info('Vault closed');
  }, [currentVaultId, vaultManager, resetVault, resetNodes]);

  /** Commit a full node list to the vault as one history entry. */
  const commitNodes = useCallback(
    async (nextNodes: Node[]) => {
      setNodes(nextNodes);
      if (!currentVaultId) return;
      const vault = vaultManager.getVault(currentVaultId);
      if (!vault) return;
      nextNodes.forEach((n) => vault.graphService.setNode(n));
      vault.history.addState(nextNodes, []);
      await saveVault();
      refreshUndoRedoState(currentVaultId);
    },
    [currentVaultId, setNodes, vaultManager, saveVault, refreshUndoRedoState]
  );

  const onNodeUpdate = useCallback(
    async (incomingNode: Node) => {
      const previous = nodes.find((n) => n.id === incomingNode.id);
      const updatedNode = enrichNode(
        incomingNode,
        metadataCache.parse(incomingNode.content ?? '')
      );

      // A rename must rewrite every wikilink pointing at the old title,
      // in a single undo step.
      if (previous && previous.type !== 'folder' && previous.name !== updatedNode.name) {
        const base = nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n));
        const { nodes: renamed, updatedFiles } = renameNode(
          base,
          updatedNode.id,
          updatedNode.name
        );
        await commitNodes(renamed);
        if (updatedFiles.length > 0) {
          toast.success(
            `Updated links in ${updatedFiles.length} note${updatedFiles.length > 1 ? 's' : ''}`
          );
        }
        return;
      }

      updateNode(updatedNode);

      if (currentVaultId) {
        syncEngine.markDirty(currentVaultId, updatedNode.id);
        const vault = vaultManager.getVault(currentVaultId);
        if (vault) {
          vault.graphService.setNode(updatedNode);
          vault.history.addState(
            nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)),
            []
          );
          await saveVault();
          refreshUndoRedoState(currentVaultId);
        }
      }
    },
    [
      currentVaultId,
      nodes,
      saveVault,
      updateNode,
      vaultManager,
      refreshUndoRedoState,
      commitNodes,
    ]
  );

  /** Turn plain mentions of `targetName` inside `sourceNodeId` into wikilinks. */
  const onLinkMention = useCallback(
    async (sourceNodeId: string, targetName: string) => {
      const source = nodes.find((n) => n.id === sourceNodeId);
      if (!source) return;
      const content = linkMentions(source.content ?? '', targetName);
      if (content === source.content) return;
      const updated = enrichNode({ ...source, content }, metadataCache.parse(content));
      await commitNodes(nodes.map((n) => (n.id === sourceNodeId ? updated : n)));
      toast.success(`Linked "${targetName}" in ${source.name}`);
    },
    [nodes, commitNodes]
  );


  const onNodeDelete = useCallback(
    async (nodeId: string) => {
      const nodeToDelete = nodes.find((n) => n.id === nodeId);
      const nodesToDelete = new Set<string>([nodeId]);
      if (nodeToDelete?.type === 'folder') {
        getDescendants(nodeId).forEach((d) => nodesToDelete.add(d.id));
      }
      deleteNodes(nodesToDelete);

      // Close any leaves showing deleted notes.
      const { root } = useWorkspaceStore.getState();
      const stack = [root];
      while (stack.length) {
        const current = stack.pop()!;
        if (current.kind === 'split') stack.push(...current.children);
        else
          current.leaves
            .filter((l) => l.view.nodeId && nodesToDelete.has(l.view.nodeId))
            .forEach((l) => closeLeavesForNode(l.id));
      }

      if (currentVaultId) {
        const vault = vaultManager.getVault(currentVaultId);
        if (vault) {
          nodesToDelete.forEach((id) => vault.graphService.deleteNode(id));
          vault.history.addState(
            nodes.filter((node) => !nodesToDelete.has(node.id)),
            []
          );
          await saveVault();
          refreshUndoRedoState(currentVaultId);
        }
      }
    },
    [
      nodes,
      getDescendants,
      deleteNodes,
      currentVaultId,
      vaultManager,
      saveVault,
      refreshUndoRedoState,
      closeLeavesForNode,
    ]
  );

  const onNodeMove = useCallback(
    async (nodeId: string, newParentId: string | null) => {
      const node = nodes.find((n) => n.id === nodeId);
      const newParent = newParentId ? nodes.find((n) => n.id === newParentId) : null;
      if (!node) return;
      if (newParent && newParent.type !== 'folder') {
        toast.error('Only folders can contain children');
        return;
      }

      moveNodeInStore(nodeId, newParentId, newParent ? newParent.depth + 1 : 0);

      if (currentVaultId) {
        const vault = vaultManager.getVault(currentVaultId);
        if (vault) {
          const updatedNodes = useNodeStore.getState().nodes;
          updatedNodes.forEach((n) => vault.graphService.setNode(n));
          vault.history.addState(updatedNodes, []);
          await saveVault();
          refreshUndoRedoState(currentVaultId);
        }
      }

      toast.success(`Moved "${node.name}" to ${newParent ? newParent.name : 'root'}`);
    },
    [nodes, moveNodeInStore, currentVaultId, vaultManager, saveVault, refreshUndoRedoState]
  );

  const onAddNode = useCallback(
    async (type: 'folder' | 'file') => {
      const parentNode = selectedNode && selectedNode.type === 'folder' ? selectedNode : null;
      if (selectedNode && selectedNode.type === 'file') {
        toast.error(
          'Files cannot contain children. Please select a folder or create at root level.'
        );
        return;
      }

      const newNode: Node = {
        id: `node-${Date.now()}`,
        name:
          type === 'folder'
            ? `New Folder ${nodes.filter((n) => n.type === 'folder').length + 1}`
            : `New File ${nodes.filter((n) => n.type === 'file').length + 1}`,
        content: '',
        type,
        parentId: parentNode?.id || null,
        depth: parentNode ? parentNode.depth + 1 : 0,
        tags: [],
      };

      addNodeToStore(newNode);
      setSelectedNode(newNode);
      if (type === 'file') {
        useWorkspaceStore.getState().openFile(newNode.id, newNode.name);
      }

      if (currentVaultId) {
        const vault = vaultManager.getVault(currentVaultId);
        if (vault) {
          vault.graphService.setNode(newNode);
          vault.history.addState([...nodes, newNode], []);
          await saveVault();
          refreshUndoRedoState(currentVaultId);
        }
      }

      toast.success(`${type === 'folder' ? 'Folder' : 'File'} created!`);
    },
    [
      selectedNode,
      nodes,
      addNodeToStore,
      setSelectedNode,
      currentVaultId,
      vaultManager,
      saveVault,
      refreshUndoRedoState,
    ]
  );

  const onImportComplete = useCallback(
    async (importedNodes: Node[], updatedNodes?: Node[]) => {
      let result = [...nodes, ...importedNodes];
      if (updatedNodes && updatedNodes.length > 0) {
        const updateMap = new Map(updatedNodes.map((n) => [n.id, n]));
        result = result.map((node) => updateMap.get(node.id) || node);
      }
      setNodes(result);

      if (currentVaultId) {
        const vault = vaultManager.getVault(currentVaultId);
        if (vault) {
          result.forEach((n) => vault.graphService.setNode(n));
          vault.history.addState(result, []);
          await saveVault();
        }
      }
    },
    [nodes, setNodes, currentVaultId, vaultManager, saveVault]
  );

  const onWikilinkClick = useCallback(
    (target: string) => {
      const targetNode = graphData.nodes.find(
        (node) => node.name.toLowerCase() === target.toLowerCase() && node.type === 'file'
      );
      if (targetNode) {
        setSelectedNode(targetNode);
        useWorkspaceStore.getState().openFile(targetNode.id, targetNode.name);
      } else {
        toast.error(`Note "${target}" not found`);
      }
    },
    [graphData.nodes, setSelectedNode]
  );

  const onTagClick = useCallback(
    (tag: string) => {
      const nodesWithTag = graphData.nodes.filter((node) => node.tags.includes(tag));
      if (nodesWithTag.length > 0) {
        toast.info(`Found ${nodesWithTag.length} note(s) with tag #${tag}`);
      } else {
        toast.error(`No notes found with tag #${tag}`);
      }
    },
    [graphData.nodes]
  );

  const vault = currentVaultId ? vaultManager.getVault(currentVaultId) : null;

  const value: VaultSessionValue = {
    nodes: graphData.nodes,
    graphData,
    selectedNode,
    currentVaultId,
    vaultName: vault?.name ?? null,
    vaultType: vault?.type,
    saveStatus,
    lastSaved,
    setSelectedNode,
    setGraphData,
    getNodePath,
    getBacklinksForNode,
    onNodeUpdate,
    onNodeDelete,
    onNodeMove,
    onAddNode,
    onImportComplete,
    onCloseVault,
    onWikilinkClick,
    onTagClick,
    onLinkMention,
  };

  return <VaultSessionContext.Provider value={value}>{children}</VaultSessionContext.Provider>;
}
