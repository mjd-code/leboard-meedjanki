/**
 * useVault Hook - Orchestrates Persistence and Graph Services
 * 
 * This hook serves as the interface between the UI and the service layers,
 * coordinating the Persistence Service (filesystem operations) and 
 * Graph Service (graph computation and relationships).
 * 
 * Graph configuration is stored inside the vault as .vault-config.json
 * making it portable with the vault folder.
 */

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { FileSystemService } from '@/core/persistence/FileSystemService';
import { GraphService } from '@/core/graph/GraphService';
import type { GraphConfigState } from "@/shared/stores/useGraphStore";

interface Node {
  id: string;
  name: string;
  content: string;
  type: "folder" | "file" | "media";
  parentId: string | null;
  depth: number;
  tags: string[];
  wikilinks?: string[];
  mediaType?: "image" | "audio" | "video";
}

interface Link {
  source: string | Node;
  target: string | Node;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface VaultHandle {
  directoryHandle: FileSystemDirectoryHandle | null;
  vaultName: string | null;
}

interface VaultConfig {
  graphConfig?: GraphConfigState;
  backupConfig?: {
    autoBackup: boolean;
    backupInterval: number;
    maxBackups: number;
  };
  [key: string]: any;
}

export const useVault = () => {
  const [vaultHandle, setVaultHandle] = useState<VaultHandle>({
    directoryHandle: null,
    vaultName: null,
  });
  const [vaultConfig, setVaultConfig] = useState<VaultConfig | null>(null);

  // Service instances
  const persistenceService = useRef(new FileSystemService());
  const graphService = useRef(new GraphService());

  const selectVault = async (): Promise<GraphData | null> => {
    try {
      // Initialize graph service to listen for events
      graphService.current.initialize();

      // Open vault using persistence service (emits events)
      const result = await persistenceService.current.openVault();
      if (!result) return null;

      setVaultHandle({
        directoryHandle: result.handle,
        vaultName: result.vaultName,
      });

      // Load vault config from .vault-config.json
      const config = await persistenceService.current.readVaultConfig();
      setVaultConfig(config);

      toast.success(`Vault "${result.vaultName}" opened successfully`);

      // Read vault structure (persistence service emits events as it reads)
      await persistenceService.current.readVaultStructure(result.handle);

      // Finalize graph construction (add semantic links)
      graphService.current.finalizeGraph();

      // Get the computed graph data
      const graphData = graphService.current.getGraphData();

      return graphData;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to open vault: ' + error.message);
      }
      return null;
    }
  };

  /**
   * Get the current vault's graph configuration
   */
  const getGraphConfig = useCallback((): GraphConfigState | null => {
    return vaultConfig?.graphConfig || null;
  }, [vaultConfig]);

  /**
   * Save graph configuration to the vault's .vault-config.json
   */
  const saveGraphConfig = useCallback(async (graphConfig: GraphConfigState): Promise<boolean> => {
    const newConfig: VaultConfig = {
      ...vaultConfig,
      graphConfig,
    };
    
    const success = await persistenceService.current.writeVaultConfig(newConfig);
    if (success) {
      setVaultConfig(newConfig);
    }
    return success;
  }, [vaultConfig]);

  /**
   * Get backup configuration
   */
  const getBackupConfig = useCallback(() => {
    return vaultConfig?.backupConfig || null;
  }, [vaultConfig]);

  /**
   * Save backup configuration to the vault
   */
  const saveBackupConfig = useCallback(async (backupConfig: VaultConfig['backupConfig']): Promise<boolean> => {
    const newConfig: VaultConfig = {
      ...vaultConfig,
      backupConfig,
    };
    
    const success = await persistenceService.current.writeVaultConfig(newConfig);
    if (success) {
      setVaultConfig(newConfig);
    }
    return success;
  }, [vaultConfig]);

  const saveNodeToFile = async (node: Node): Promise<boolean> => {
    if (!persistenceService.current.isOpen()) {
      toast.error('No vault is currently open');
      return false;
    }

    try {
      const filePath = await findNodePath(node);
      if (!filePath) {
        toast.error('Could not locate file in vault');
        return false;
      }

      // Use persistence service to save (emits NOTE_UPDATED event)
      await persistenceService.current.saveFile(filePath, node.content);

      toast.success('File saved to vault');
      return true;
    } catch (error) {
      toast.error('Failed to save file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    }
  };

  const findNodePath = async (node: Node): Promise<string[] | null> => {
    // For now, return simple path. In full implementation, traverse parent structure
    return [node.name + '.md'];
  };

  const closeVault = () => {
    // Cleanup services
    graphService.current.cleanup();
    persistenceService.current.closeVault();

    setVaultHandle({ directoryHandle: null, vaultName: null });
    setVaultConfig(null);
    toast.info('Vault closed');
  };

  return {
    vaultHandle,
    vaultConfig,
    selectVault,
    saveNodeToFile,
    closeVault,
    isVaultMode: !!vaultHandle.directoryHandle,
    getGraphConfig,
    saveGraphConfig,
    getBackupConfig,
    saveBackupConfig,
  };
};
