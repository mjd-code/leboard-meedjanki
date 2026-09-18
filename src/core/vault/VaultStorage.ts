/**
 * VaultStorage - IndexedDB Persistence Layer
 * 
 * Handles persistent storage of vault metadata, graph data, and history
 */

import { 
  VaultMetadata, 
  VaultData, 
  VaultGraphConfig, 
  BackupConfig,
  StorageStrategy 
} from './types';

// Re-export for backwards compatibility
export type { VaultGraphConfig, BackupConfig as VaultBackupConfig };

interface BackupSnapshot {
  id: string;
  vaultId: string;
  timestamp: number;
  nodes: any[];
  links: any[];
  nodeCount: number;
  linkCount: number;
  description: string;
}

const DB_NAME = 'VaultManagerDB';
const DB_VERSION = 2;
const VAULT_STORE = 'vaults';
const BACKUP_STORE = 'backups';

export class VaultStorage {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("VaultStorage: Initializing IndexedDB", DB_NAME, "version", DB_VERSION);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("VaultStorage: Failed to open IndexedDB", request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log("VaultStorage: IndexedDB opened successfully");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log("VaultStorage: Upgrading database schema");
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(VAULT_STORE)) {
          console.log("VaultStorage: Creating vaults store");
          const vaultStore = db.createObjectStore(VAULT_STORE, { keyPath: 'metadata.id' });
          vaultStore.createIndex('type', 'metadata.type', { unique: false });
          vaultStore.createIndex('lastModified', 'metadata.lastModified', { unique: false });
        }

        if (!db.objectStoreNames.contains(BACKUP_STORE)) {
          console.log("VaultStorage: Creating backups store");
          const backupStore = db.createObjectStore(BACKUP_STORE, { keyPath: 'id' });
          backupStore.createIndex('vaultId', 'vaultId', { unique: false });
          backupStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveVault(vaultData: VaultData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        console.log("VaultStorage: Saving vault", vaultData.metadata.id);
        const transaction = this.db!.transaction([VAULT_STORE], 'readwrite');
        const store = transaction.objectStore(VAULT_STORE);
        const request = store.put(vaultData);

        request.onerror = () => {
          console.error("VaultStorage: Save error", request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          console.log("VaultStorage: Vault saved successfully");
          resolve();
        };
      } catch (error) {
        console.error("VaultStorage: Transaction error", error);
        reject(error);
      }
    });
  }

  async getVault(vaultId: string): Promise<VaultData | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VAULT_STORE], 'readonly');
      const store = transaction.objectStore(VAULT_STORE);
      const request = store.get(vaultId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllVaults(): Promise<VaultMetadata[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VAULT_STORE], 'readonly');
      const store = transaction.objectStore(VAULT_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const vaults = request.result.map((v: VaultData) => v.metadata);
        resolve(vaults);
      };
    });
  }

  async deleteVault(vaultId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VAULT_STORE], 'readwrite');
      const store = transaction.objectStore(VAULT_STORE);
      const request = store.delete(vaultId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async updateVaultMetadata(vaultId: string, updates: Partial<VaultMetadata>): Promise<void> {
    const vaultData = await this.getVault(vaultId);
    if (!vaultData) throw new Error('Vault not found');

    vaultData.metadata = { ...vaultData.metadata, ...updates, lastModified: Date.now() };
    await this.saveVault(vaultData);
  }

  // Backup Management
  async saveBackup(snapshot: BackupSnapshot): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BACKUP_STORE], 'readwrite');
      const store = transaction.objectStore(BACKUP_STORE);
      const request = store.put(snapshot);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getBackups(vaultId: string, maxSnapshots: number): Promise<BackupSnapshot[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BACKUP_STORE], 'readonly');
      const store = transaction.objectStore(BACKUP_STORE);
      const index = store.index('vaultId');
      const request = index.getAll(vaultId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Sort by timestamp descending and limit to maxSnapshots
        const backups = request.result
          .sort((a: BackupSnapshot, b: BackupSnapshot) => b.timestamp - a.timestamp)
          .slice(0, maxSnapshots);
        resolve(backups);
      };
    });
  }

  async deleteBackup(backupId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BACKUP_STORE], 'readwrite');
      const store = transaction.objectStore(BACKUP_STORE);
      const request = store.delete(backupId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteVaultBackups(vaultId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const backups = await this.getBackups(vaultId, 1000);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BACKUP_STORE], 'readwrite');
      const store = transaction.objectStore(BACKUP_STORE);
      
      let completed = 0;
      let hasError = false;

      backups.forEach(backup => {
        const request = store.delete(backup.id);
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
        request.onsuccess = () => {
          completed++;
          if (completed === backups.length && !hasError) {
            resolve();
          }
        };
      });

      if (backups.length === 0) {
        resolve();
      }
    });
  }

  async pruneOldBackups(vaultId: string, maxSnapshots: number): Promise<void> {
    const backups = await this.getBackups(vaultId, 1000);
    
    if (backups.length > maxSnapshots) {
      const toDelete = backups.slice(maxSnapshots);
      await Promise.all(toDelete.map(backup => this.deleteBackup(backup.id)));
    }
  }
}
