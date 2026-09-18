/**
 * VaultBackupService - Automatic Backup Management
 * 
 * Handles automatic snapshots triggered by time intervals or change counts
 */

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

interface BackupConfig {
  timeIntervalMinutes: number; // 0 = disabled
  changeThreshold: number; // 0 = disabled
  maxSnapshots: number;
}

export class VaultBackupService {
  private timers: Map<string, number> = new Map();
  private changeCounts: Map<string, number> = new Map();
  private configs: Map<string, BackupConfig> = new Map();
  private lastBackupTimes: Map<string, number> = new Map();

  constructor() {
    this.loadConfigs();
  }

  private loadConfigs(): void {
    try {
      const stored = localStorage.getItem('vault_backup_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        Object.entries(configs).forEach(([vaultId, config]) => {
          this.configs.set(vaultId, config as BackupConfig);
        });
      }
    } catch (error) {
      console.error('Failed to load backup configs:', error);
    }
  }

  private saveConfigs(): void {
    try {
      const configs: Record<string, BackupConfig> = {};
      this.configs.forEach((config, vaultId) => {
        configs[vaultId] = config;
      });
      localStorage.setItem('vault_backup_configs', JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save backup configs:', error);
    }
  }

  getConfig(vaultId: string): BackupConfig {
    return this.configs.get(vaultId) || {
      timeIntervalMinutes: 5,
      changeThreshold: 10,
      maxSnapshots: 30,
    };
  }

  setConfig(vaultId: string, config: BackupConfig): void {
    this.configs.set(vaultId, config);
    this.saveConfigs();
    
    // Restart timer with new config
    this.stopAutoBackup(vaultId);
    this.startAutoBackup(vaultId, async () => {
      // This callback will be set by the caller
    });
  }

  startAutoBackup(vaultId: string, onBackup: () => Promise<void>): void {
    const config = this.getConfig(vaultId);
    
    // Initialize change counter
    this.changeCounts.set(vaultId, 0);
    this.lastBackupTimes.set(vaultId, Date.now());

    // Start time-based backup if enabled
    if (config.timeIntervalMinutes > 0) {
      const intervalMs = config.timeIntervalMinutes * 60 * 1000;
      const timerId = window.setInterval(async () => {
        await onBackup();
        this.changeCounts.set(vaultId, 0);
        this.lastBackupTimes.set(vaultId, Date.now());
      }, intervalMs);
      
      this.timers.set(vaultId, timerId);
    }
  }

  stopAutoBackup(vaultId: string): void {
    const timerId = this.timers.get(vaultId);
    if (timerId !== undefined) {
      window.clearInterval(timerId);
      this.timers.delete(vaultId);
    }
    this.changeCounts.delete(vaultId);
  }

  async recordChange(vaultId: string, onBackup: () => Promise<void>): Promise<void> {
    const config = this.getConfig(vaultId);
    
    if (config.changeThreshold <= 0) return;

    const currentCount = (this.changeCounts.get(vaultId) || 0) + 1;
    this.changeCounts.set(vaultId, currentCount);

    // Trigger backup if threshold reached
    if (currentCount >= config.changeThreshold) {
      await onBackup();
      this.changeCounts.set(vaultId, 0);
      this.lastBackupTimes.set(vaultId, Date.now());
    }
  }

  createSnapshot(vaultId: string, nodes: any[], links: any[]): BackupSnapshot {
    return {
      id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vaultId,
      timestamp: Date.now(),
      nodes: JSON.parse(JSON.stringify(nodes)),
      links: JSON.parse(JSON.stringify(links)),
      nodeCount: nodes.length,
      linkCount: links.length,
      description: `Auto backup - ${new Date().toLocaleString()}`,
    };
  }

  getTimeSinceLastBackup(vaultId: string): number {
    const lastBackup = this.lastBackupTimes.get(vaultId);
    if (!lastBackup) return 0;
    return Date.now() - lastBackup;
  }

  getChangeCount(vaultId: string): number {
    return this.changeCounts.get(vaultId) || 0;
  }

  cleanup(): void {
    this.timers.forEach((timerId) => window.clearInterval(timerId));
    this.timers.clear();
    this.changeCounts.clear();
  }
}
