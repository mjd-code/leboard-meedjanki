/**
 * Vault Management section of the Unified Settings Hub.
 * Switch, create, rename, delete vaults; manage storage adapter, backups,
 * and import / export — all inside the hub shell.
 */

import { useCallback, useEffect, useState } from 'react';
import { Plus, Database, Loader2, HardDrive, Cloud, Laptop, History, FileArchive } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Separator } from '@/shared/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { toast } from 'sonner';
import { VaultCard } from '@/features/vault-dashboard/VaultCard';
import { VaultModeSelector } from '@/features/vault-dashboard/VaultModeSelector';
import { VaultBackupPanel } from '@/features/vault-dashboard/VaultBackupPanel';
import { VaultBackupSettingsContent } from '@/features/vault-dashboard/VaultBackupSettings';
import { ExportToFileSystem } from '@/features/vault-dashboard/ExportToFileSystem';
import { ImportExportPanel } from '@/features/workspace/ImportExportPanel';
import { useVaultSync } from '@/features/vault-dashboard/hooks/useVaultSync';
import { getVaultManager } from '@/core/vault/VaultManagerSingleton';
import type { StorageStrategy } from '@/core/vault/types';

type BackupEntry = Awaited<ReturnType<ReturnType<typeof getVaultManager>['getBackups']>>[number];
type BackupConfig = ReturnType<ReturnType<typeof getVaultManager>['getBackupConfig']>;
type VaultNode = Parameters<typeof ExportToFileSystem>[0]['nodes'][number];

interface VaultRow {
  id: string;
  name: string;
  type: 'in-memory' | 'local-folder';
  storageStrategy: StorageStrategy;
  nodeCount: number;
  linkCount: number;
  lastModified: number;
  stats?: {
    fileCount: number;
    folderCount: number;
    tagCount: number;
    orphanedNodes: number;
    avgConnections: number;
  };
}

const STRATEGY_META: Record<StorageStrategy, { label: string; icon: typeof Cloud }> = {
  memory: { label: 'In-memory (browser)', icon: Laptop },
  cloud: { label: 'Cloud sync (Supabase)', icon: Cloud },
  filesystem: { label: 'Local file system', icon: HardDrive },
};

export function VaultSettings() {
  const vaultManager = getVaultManager();
  const { syncVaultToCloud, deleteCloudVault, isAuthenticated } = useVaultSync();

  const [isInitialized, setIsInitialized] = useState(false);
  const [vaults, setVaults] = useState<VaultRow[]>([]);
  const [activeVaultId, setActiveVaultId] = useState<string | null>(null);
  const [backups, setBackups] = useState<Record<string, BackupEntry[]>>({});
  const [backupConfigs, setBackupConfigs] = useState<Record<string, BackupConfig>>({});
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [backupVaultId, setBackupVaultId] = useState<string | null>(null);
  const [settingsVaultId, setSettingsVaultId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const loadVaults = useCallback(async () => {
    const all = vaultManager.getAllVaults();
    const active = vaultManager.getActiveVault();

    setVaults(
      all.map((v) => {
        const graphData = v.graphService.getGraphData();
        return {
          id: v.id,
          name: v.name,
          type: v.type,
          storageStrategy: v.storageStrategy,
          nodeCount: graphData.nodes.length,
          linkCount: graphData.links.length,
          lastModified: v.lastModified,
          stats: vaultManager.getVaultStats(v.id) || undefined,
        };
      })
    );
    setActiveVaultId(active?.id || null);

    const backupData: Record<string, BackupEntry[]> = {};
    const configData: Record<string, BackupConfig> = {};
    for (const vault of all) {
      if (vault.type === 'in-memory') {
        backupData[vault.id] = await vaultManager.getBackups(vault.id);
        configData[vault.id] = vaultManager.getBackupConfig(vault.id);
      }
    }
    setBackups(backupData);
    setBackupConfigs(configData);
  }, [vaultManager]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await vaultManager.initialize();
        if (cancelled) return;
        setIsInitialized(true);
        await loadVaults();
      } catch {
        toast.error('Failed to initialise the vault system');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultManager, loadVaults]);

  const activeVault = vaults.find((v) => v.id === activeVaultId) || null;

  const handleCreateInMemoryVault = async (name: string) => {
    const vaultId = await vaultManager.createInMemoryVault(name);
    vaultManager.startAutoBackup(vaultId);
    await loadVaults();
    toast.success(`Vault "${name}" created`);
    return vaultId;
  };

  const handleCreateLocalVault = async (folderName: string) => {
    try {
      // @ts-expect-error — File System Access API is not in the TS lib yet
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await dirHandle.getDirectoryHandle(folderName.replace(/[^a-zA-Z0-9-_\s]/g, ''), { create: true });
      const vaultId = await vaultManager.openLocalFolderVault();
      if (vaultId) {
        await loadVaults();
        toast.success(`Local vault "${folderName}" created`);
      }
      return vaultId;
    } catch {
      return null;
    }
  };

  const handleOpenLocalVault = async () => {
    const vaultId = await vaultManager.openLocalFolderVault();
    if (vaultId) {
      await loadVaults();
      toast.success('Local vault opened');
    }
    return vaultId;
  };

  const handleSelectVault = async (vaultId: string) => {
    await vaultManager.switchVault(vaultId);
    await loadVaults();
    toast.success('Vault switched');
  };

  const handleDeleteVault = async (vaultId: string) => {
    if (!confirm('Delete this vault? All of its backups will be deleted too.')) return;
    const { cloudId, wasCloudVault } = await vaultManager.deleteVault(vaultId);
    if (wasCloudVault && cloudId && isAuthenticated) {
      await deleteCloudVault(cloudId);
    }
    await loadVaults();
    toast.success('Vault deleted');
  };

  const handleRenameVault = async (vaultId: string, newName: string) => {
    const ok = await vaultManager.renameVault(vaultId, newName);
    await loadVaults();
    if (ok) toast.success(`Renamed to "${newName}"`);
    else toast.error('Rename failed');
  };

  const handleStorageStrategyChange = async (vaultId: string, strategy: StorageStrategy) => {
    const { needsCloudSync } = await vaultManager.setStorageStrategy(vaultId, strategy);
    await loadVaults();
    if (needsCloudSync && isAuthenticated) {
      const result = await syncVaultToCloud(vaultId);
      if (result.success) toast.success('Vault set to cloud sync and uploaded');
      else toast.error(`Storage updated but sync failed: ${result.error}`);
    } else {
      toast.success('Storage adapter updated');
    }
  };

  const getVaultNodes = (vaultId: string) =>
    vaultManager.getVault(vaultId)?.graphService.getGraphData().nodes ?? [];

  const handleImportComplete = async (imported: VaultNode[], updated?: VaultNode[]) => {
    const vault = activeVaultId ? vaultManager.getVault(activeVaultId) : null;
    if (!vault) {
      toast.error('No active vault to import into');
      return;
    }
    [...imported, ...(updated ?? [])].forEach((node) =>
      vault.graphService.setNode(node as Parameters<typeof vault.graphService.setNode>[0])
    );
    vault.graphService.finalizeGraph();
    await vaultManager.saveCurrentVault();
    await loadVaults();
    setImportOpen(false);
    toast.success(`Imported ${imported.length} item(s)`);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Preparing your vaults…
      </div>
    );
  }

  const StrategyIcon = activeVault ? STRATEGY_META[activeVault.storageStrategy].icon : Database;

  return (
    <div className="space-y-6">
      {/* Active vault + storage adapter status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Active vault</CardTitle>
          <CardDescription>Where the workspace currently reads and writes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeVault ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <StrategyIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{activeVault.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {STRATEGY_META[activeVault.storageStrategy].label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {activeVault.nodeCount} notes · {activeVault.linkCount} links
              </span>
              <Badge variant={isAuthenticated ? 'default' : 'outline'} className="text-xs">
                {isAuthenticated ? 'Cloud available' : 'Local only (signed out)'}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No vault is active yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Vault list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Your vaults</h2>
            <p className="text-xs text-muted-foreground">Switch, rename, back up or remove a vault.</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setIsSelectorOpen(true)}>
            <Plus className="w-4 h-4" />
            New vault
          </Button>
        </div>

        {vaults.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Database className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No vaults yet — create one to get started.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {vaults.map((vault) => (
              <div key={vault.id}>
                <VaultCard
                  id={vault.id}
                  name={vault.name}
                  type={vault.type}
                  storageStrategy={vault.storageStrategy}
                  nodeCount={vault.nodeCount}
                  linkCount={vault.linkCount}
                  lastModified={vault.lastModified}
                  isActive={vault.id === activeVaultId}
                  isAuthenticated={isAuthenticated}
                  stats={vault.stats}
                  backupCount={backups[vault.id]?.length || 0}
                  onSelect={() => handleSelectVault(vault.id)}
                  onDelete={() => handleDeleteVault(vault.id)}
                  onRename={(newName) => handleRenameVault(vault.id, newName)}
                  onStorageStrategyChange={(strategy) => handleStorageStrategyChange(vault.id, strategy)}
                  onOpenBackups={vault.type === 'in-memory' ? () => setBackupVaultId(vault.id) : undefined}
                  onExportToFileSystem={
                    vault.type === 'in-memory'
                      ? () => document.getElementById(`hub-export-${vault.id}`)?.click()
                      : undefined
                  }
                />
                {vault.type === 'in-memory' && (
                  <div className="hidden">
                    <ExportToFileSystem
                      vaultName={vault.name}
                      nodes={getVaultNodes(vault.id)}
                      trigger={<button id={`hub-export-${vault.id}`} />}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Import / export */}
      <Collapsible open={importOpen} onOpenChange={setImportOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FileArchive className="w-4 h-4" />
            {importOpen ? 'Hide import / export' : 'Import / export vault content'}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <ImportExportPanel
            nodes={activeVaultId ? (getVaultNodes(activeVaultId) as unknown as VaultNode[]) : []}
            onImportComplete={handleImportComplete}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Dialogs */}
      <VaultModeSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onCreateLocalVault={handleCreateLocalVault}
        onOpenLocalVault={handleOpenLocalVault}
        onCreateInMemoryVault={handleCreateInMemoryVault}
        onVaultCreated={handleSelectVault}
      />

      <Dialog open={!!backupVaultId} onOpenChange={() => setBackupVaultId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" /> Vault backups
            </DialogTitle>
          </DialogHeader>
          {backupVaultId && (
            <VaultBackupPanel
              vaultId={backupVaultId}
              backups={backups[backupVaultId] || []}
              onRestore={async (backupId) => {
                const ok = await vaultManager.restoreBackup(backupVaultId, backupId);
                await loadVaults();
                if (ok) toast.success('Backup restored');
                else toast.error('Restore failed');
              }}
              onDelete={async (backupId) => {
                await vaultManager.deleteBackup(backupId);
                await loadVaults();
                toast.success('Backup deleted');
              }}
              onManualBackup={async () => {
                await vaultManager.createBackup(backupVaultId);
                await loadVaults();
              }}
              onOpenSettings={() => {
                setSettingsVaultId(backupVaultId);
                setBackupVaultId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!settingsVaultId} onOpenChange={() => setSettingsVaultId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Backup settings</DialogTitle>
          </DialogHeader>
          {settingsVaultId && (
            <VaultBackupSettingsContent
              config={
                backupConfigs[settingsVaultId] || {
                  timeIntervalMinutes: 5,
                  changeThreshold: 10,
                  maxSnapshots: 30,
                }
              }
              onSave={async (config) => {
                await vaultManager.setBackupConfig(settingsVaultId, config);
                await loadVaults();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
