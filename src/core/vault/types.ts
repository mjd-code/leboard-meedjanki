/**
 * Vault Types - Shared type definitions for vault system
 */

export type StorageStrategy = 'memory' | 'cloud' | 'filesystem';

export interface VaultMetadata {
  id: string;
  name: string;
  type: 'in-memory' | 'local-folder';
  storageStrategy: StorageStrategy;
  createdAt: number;
  lastModified: number;
  nodeCount: number;
  linkCount: number;
  cloudId?: string; // UUID from Supabase when synced to cloud
}

export interface BackupConfig {
  timeIntervalMinutes: number;
  changeThreshold: number;
  maxSnapshots: number;
}

export interface VaultGraphConfig {
  nodes?: any;
  links?: any;
  topology?: any;
  forces?: any;
}

export interface VaultData {
  metadata: VaultMetadata;
  graphData: {
    nodes: any[];
    links: any[];
  };
  history: {
    past: any[];
    future: any[];
  };
  graphConfig?: VaultGraphConfig;
  backupConfig?: BackupConfig;
}

export const STORAGE_STRATEGY_LABELS: Record<StorageStrategy, string> = {
  memory: 'Local Only',
  cloud: 'Cloud Sync',
  filesystem: 'File System',
};

export const STORAGE_STRATEGY_DESCRIPTIONS: Record<StorageStrategy, string> = {
  memory: 'Stored in browser, never syncs to cloud',
  cloud: 'Auto-syncs to your cloud account',
  filesystem: 'Stored in local folder on your computer',
};
