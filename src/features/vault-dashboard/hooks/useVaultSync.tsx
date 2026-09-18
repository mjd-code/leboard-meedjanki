/**
 * useVaultSync - Hook for managing vault cloud synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { vaultSyncService, SyncStatus } from '@/core/vault/VaultSyncService';
import { getVaultManager } from '@/core/vault/VaultManagerSingleton';
import { toast } from 'sonner';

interface SyncProgress {
  total: number;
  current: number;
  message: string;
}

interface SyncResult {
  success: boolean;
  error?: string;
  syncedVaults?: number;
}

interface UseVaultSyncReturn {
  syncStatus: SyncStatus;
  syncProgress: SyncProgress | null;
  lastSyncTime: Date | null;
  isAuthenticated: boolean;
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  fullSync: () => Promise<void>;
  syncCurrentVault: () => Promise<void>;
  syncVaultToCloud: (vaultId: string) => Promise<SyncResult>;
  deleteCloudVault: (cloudId: string) => Promise<SyncResult>;
}

export function useVaultSync(): UseVaultSyncReturn {
  const { user, session } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const vaultManager = getVaultManager();

  const isAuthenticated = !!user && !!session;

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribeStatus = vaultSyncService.onStatusChange(setSyncStatus);
    const unsubscribeProgress = vaultSyncService.onProgressChange(setSyncProgress);
    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
    };
  }, []);

  // Update last sync time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSyncTime(vaultSyncService.getLastSyncTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync from cloud when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      const autoSync = async () => {
        await vaultManager.initialize();
        const result = await vaultSyncService.syncFromCloud(vaultManager);
        if (result.success && result.syncedVaults && result.syncedVaults > 0) {
          toast.success(`Synced ${result.syncedVaults} vault(s) from cloud`);
        }
      };
      autoSync();
    }
  }, [isAuthenticated]);

  const syncToCloud = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to sync vaults');
      return;
    }

    const result = await vaultSyncService.syncToCloud(vaultManager);
    if (result.success) {
      toast.success(`Synced ${result.syncedVaults || 0} vault(s) to cloud`);
    } else {
      toast.error(result.error || 'Sync failed');
    }
  }, [isAuthenticated, vaultManager]);

  const syncFromCloud = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to sync vaults');
      return;
    }

    const result = await vaultSyncService.syncFromCloud(vaultManager);
    if (result.success) {
      toast.success(`Pulled ${result.syncedVaults || 0} vault(s) from cloud`);
    } else {
      toast.error(result.error || 'Sync failed');
    }
  }, [isAuthenticated, vaultManager]);

  const fullSync = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to sync vaults');
      return;
    }

    const result = await vaultSyncService.fullSync(vaultManager);
    if (result.success) {
      toast.success('Full sync completed');
    } else {
      toast.error(result.error || 'Sync failed');
    }
  }, [isAuthenticated, vaultManager]);

  const syncCurrentVault = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to sync vaults');
      return;
    }

    const activeVault = vaultManager.getActiveVault();
    if (!activeVault) {
      toast.error('No active vault to sync');
      return;
    }

    const result = await vaultSyncService.syncVaultToCloud(vaultManager, activeVault.id);
    if (result.success) {
      toast.success('Vault synced to cloud');
    } else {
      toast.error(result.error || 'Sync failed');
    }
  }, [isAuthenticated, vaultManager]);

  const syncVaultToCloud = useCallback(async (vaultId: string): Promise<SyncResult> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }
    return await vaultSyncService.syncVaultToCloud(vaultManager, vaultId);
  }, [isAuthenticated, vaultManager]);

  const deleteCloudVault = useCallback(async (cloudId: string): Promise<SyncResult> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }
    return await vaultSyncService.deleteCloudVault(cloudId);
  }, [isAuthenticated]);

  return {
    syncStatus,
    syncProgress,
    lastSyncTime,
    isAuthenticated,
    syncToCloud,
    syncFromCloud,
    fullSync,
    syncCurrentVault,
    syncVaultToCloud,
    deleteCloudVault,
  };
}
