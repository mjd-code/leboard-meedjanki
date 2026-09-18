/**
 * VaultSyncService - Bridges local VaultManager with Cloud storage
 * 
 * Handles bidirectional sync between IndexedDB and Supabase with proper
 * conflict resolution and session-based data isolation.
 * 
 * IMPORTANT: Only syncs vaults with storageStrategy === 'cloud'
 */

import { supabase } from "@/integrations/supabase/client";
import { cloudVaultService, CloudVault } from './CloudVaultService';
import { VaultManager, Vault } from './VaultManager';
import type { Json } from "@/integrations/supabase/types";

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface SyncResult {
  success: boolean;
  error?: string;
  syncedVaults?: number;
}

interface SyncProgress {
  total: number;
  current: number;
  message: string;
}

export class VaultSyncService {
  private syncStatus: SyncStatus = 'idle';
  private lastSyncTime: Date | null = null;
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private progressListeners: Set<(progress: SyncProgress | null) => void> = new Set();
  private currentProgress: SyncProgress | null = null;
  private syncDebounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Get current sync progress
   */
  getProgress(): SyncProgress | null {
    return this.currentProgress;
  }

  /**
   * Subscribe to sync status changes
   */
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  /**
   * Subscribe to sync progress changes
   */
  onProgressChange(callback: (progress: SyncProgress | null) => void): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  private setStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.syncListeners.forEach(cb => cb(status));
  }

  private setProgress(progress: SyncProgress | null) {
    this.currentProgress = progress;
    this.progressListeners.forEach(cb => cb(progress));
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  }

  /**
   * Sync all cloud-strategy vaults to cloud
   * Only syncs vaults with storageStrategy === 'cloud'
   */
  async syncToCloud(vaultManager: VaultManager): Promise<SyncResult> {
    if (!navigator.onLine) {
      this.setStatus('offline');
      return { success: false, error: 'No internet connection' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    this.setStatus('syncing');

    try {
      // Only sync vaults with cloud strategy
      const cloudVaults = vaultManager.getCloudVaults();
      let syncedCount = 0;

      for (const vault of cloudVaults) {
        if (vault.type !== 'in-memory') continue;

        const graphData = vault.graphService.getGraphData();
        
        if (vault.cloudId) {
          // Update existing cloud vault
          const { error } = await cloudVaultService.updateVault(vault.cloudId, {
            name: vault.name,
            graph_data: graphData,
            graph_config: vault.graphConfig || {},
            backup_config: vault.backupConfig || {},
          });
          
          if (error) {
            console.error('Failed to sync vault to cloud:', error);
            continue;
          }
        } else {
          // Create new vault in cloud
          const { data, error } = await cloudVaultService.createVault(
            vault.name,
            undefined,
            graphData
          );
          
          if (error || !data) {
            console.error('Failed to create vault in cloud:', error);
            continue;
          }

          // Store cloud ID locally
          await vaultManager.setCloudId(vault.id, data.id);

          // Update vault config if exists
          if (vault.graphConfig || vault.backupConfig) {
            await cloudVaultService.updateVault(data.id, {
              graph_config: vault.graphConfig || {},
              backup_config: vault.backupConfig || {},
            });
          }
        }
        
        syncedCount++;
      }

      this.lastSyncTime = new Date();
      this.setStatus('synced');
      
      return { success: true, syncedVaults: syncedCount };
    } catch (error) {
      console.error('Sync to cloud failed:', error);
      this.setStatus('error');
      return { success: false, error: String(error) };
    }
  }

  /**
   * Pull vaults from cloud
   * Only imports vaults that don't already exist locally with cloud strategy
   */
  async syncFromCloud(vaultManager: VaultManager): Promise<SyncResult> {
    if (!navigator.onLine) {
      this.setStatus('offline');
      return { success: false, error: 'No internet connection' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    this.setStatus('syncing');

    try {
      const { data: cloudVaults, error } = await cloudVaultService.getVaults();
      
      if (error || !cloudVaults) {
        this.setStatus('error');
        return { success: false, error: error?.message || 'Failed to fetch cloud vaults' };
      }

      let syncedCount = 0;
      const existingCloudIds = new Set(
        vaultManager.getCloudVaults().map(v => v.cloudId).filter(Boolean)
      );

      for (const cloudVault of cloudVaults) {
        // Skip if vault already exists locally with this cloud ID
        if (existingCloudIds.has(cloudVault.id)) {
          // Update existing local vault if cloud is newer
          const localVault = vaultManager.getCloudVaults().find(v => v.cloudId === cloudVault.id);
          if (localVault) {
            const cloudUpdated = new Date(cloudVault.updated_at).getTime();
            if (cloudUpdated > localVault.lastModified) {
              const graphData = cloudVault.graph_data || { nodes: [], links: [] };
              localVault.graphService.clearGraph();
              graphData.nodes.forEach(node => localVault.graphService.setNode(node));
              localVault.graphService.setLinks(graphData.links || []);
              localVault.lastModified = cloudUpdated;
              syncedCount++;
            }
          }
          continue;
        }

        // Import new cloud vault
        await this.importCloudVault(vaultManager, cloudVault);
        syncedCount++;
      }

      this.lastSyncTime = new Date();
      this.setStatus('synced');
      
      return { success: true, syncedVaults: syncedCount };
    } catch (error) {
      console.error('Sync from cloud failed:', error);
      this.setStatus('error');
      return { success: false, error: String(error) };
    }
  }

  /**
   * Import a cloud vault into the local VaultManager with cloud strategy
   */
  private async importCloudVault(vaultManager: VaultManager, cloudVault: CloudVault): Promise<void> {
    // Create vault with cloud strategy
    const vaultId = await vaultManager.createInMemoryVault(cloudVault.name, 'cloud');
    const vault = vaultManager.getVault(vaultId);
    
    if (vault) {
      // Set cloud ID to link local and cloud vaults
      await vaultManager.setCloudId(vaultId, cloudVault.id);
      
      const graphData = cloudVault.graph_data || { nodes: [], links: [] };
      vault.graphService.clearGraph();
      graphData.nodes.forEach(node => vault.graphService.setNode(node));
      vault.graphService.setLinks(graphData.links || []);
      
      if (cloudVault.graph_config) {
        await vaultManager.setGraphConfig(vaultId, cloudVault.graph_config);
      }
      if (cloudVault.backup_config) {
        await vaultManager.setBackupConfig(vaultId, cloudVault.backup_config);
      }
    }
  }

  /**
   * Full bidirectional sync for cloud-strategy vaults only
   */
  async fullSync(vaultManager: VaultManager): Promise<SyncResult> {
    // First pull from cloud, then push local changes
    const pullResult = await this.syncFromCloud(vaultManager);
    if (!pullResult.success) {
      return pullResult;
    }
    
    const pushResult = await this.syncToCloud(vaultManager);
    return pushResult;
  }

  /**
   * Sync a single vault to cloud (only if it has cloud strategy)
   */
  async syncVaultToCloud(vaultManager: VaultManager, vaultId: string): Promise<SyncResult> {
    if (!navigator.onLine) {
      return { success: false, error: 'No internet connection' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const vault = vaultManager.getVault(vaultId);
    if (!vault || vault.type !== 'in-memory') {
      return { success: false, error: 'Vault not found or not syncable' };
    }

    // Check if vault has cloud strategy
    if (vault.storageStrategy !== 'cloud') {
      return { success: false, error: 'Vault is not configured for cloud sync. Change storage strategy to "Cloud Sync" first.' };
    }

    try {
      const graphData = vault.graphService.getGraphData();
      
      if (vault.cloudId) {
        const { error } = await cloudVaultService.updateVault(vault.cloudId, {
          name: vault.name,
          graph_data: graphData,
          graph_config: vault.graphConfig || {},
          backup_config: vault.backupConfig || {},
        });
        
        if (error) {
          return { success: false, error: error.message };
        }
      } else {
        const { data, error } = await cloudVaultService.createVault(
          vault.name,
          undefined,
          graphData
        );
        
        if (error || !data) {
          return { success: false, error: error?.message || 'Failed to create vault' };
        }

        // Store cloud ID
        await vaultManager.setCloudId(vaultId, data.id);

        if (vault.graphConfig || vault.backupConfig) {
          await cloudVaultService.updateVault(data.id, {
            graph_config: vault.graphConfig || {},
            backup_config: vault.backupConfig || {},
          });
        }
      }

      return { success: true, syncedVaults: 1 };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete a cloud vault
   */
  async deleteCloudVault(cloudId: string): Promise<SyncResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error } = await cloudVaultService.deleteVault(cloudId);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Debounced sync for a vault - auto-syncs after changes with delay
   */
  debouncedSyncVault(vaultManager: VaultManager, vaultId: string, delayMs: number = 2000): void {
    // Clear existing timer for this vault
    const existingTimer = this.syncDebounceTimers.get(vaultId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      this.syncDebounceTimers.delete(vaultId);
      const result = await this.syncVaultToCloud(vaultManager, vaultId);
      if (!result.success && result.error) {
        console.warn(`Auto-sync failed for vault ${vaultId}:`, result.error);
      }
    }, delayMs);

    this.syncDebounceTimers.set(vaultId, timer);
  }

  /**
   * Clear all local vault data (for logout)
   */
  async clearLocalData(): Promise<void> {
    // Clear all pending sync timers
    this.syncDebounceTimers.forEach(timer => clearTimeout(timer));
    this.syncDebounceTimers.clear();

    // Clear IndexedDB vault data
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('VaultManagerDB');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      request.onblocked = () => {
        console.warn('IndexedDB deletion blocked - will be deleted on next session');
        resolve();
      };
    });
  }
}

export const vaultSyncService = new VaultSyncService();
