/**
 * SyncEngine — per-note dirty tracking, last-write-wins cloud pushes guarded by
 * the server `updated_at`, conflict copies when the cloud moved ahead, and a
 * durable offline queue replayed on reconnect.
 */

import { supabase } from '@/integrations/supabase/client';
import { cloudVaultService } from '@/core/vault/CloudVaultService';
import type { VaultManager } from '@/core/vault/VaultManager';
import { eventBus, EventType } from '@/shared/events/events';
import { syncQueue, type QueuedVaultPush } from './sync-queue';

export type SyncEngineStatus = 'idle' | 'syncing' | 'synced' | 'queued' | 'offline' | 'error';

export interface SyncOutcome {
  success: boolean;
  queued?: boolean;
  error?: string;
  conflicts?: string[];
}

interface GraphNodeLike {
  id: string;
  name?: string;
  content?: string;
  type?: string;
  parentId?: string | null;
  [key: string]: unknown;
}

interface GraphLinkLike {
  source: string | { id: string };
  target: string | { id: string };
  [key: string]: unknown;
}

const BASE_KEY = 'vault_sync_base_versions';

function linkId(l: GraphLinkLike): string {
  const s = typeof l.source === 'string' ? l.source : l.source?.id;
  const t = typeof l.target === 'string' ? l.target : l.target?.id;
  return `${s}->${t}->${String(l.type ?? '')}`;
}

function conflictSuffix(): string {
  return `(conflict ${new Date().toISOString().slice(0, 10)})`;
}

export class SyncEngine {
  private dirty = new Map<string, Set<string>>();
  private status: SyncEngineStatus = 'idle';
  private listeners = new Set<(s: SyncEngineStatus) => void>();
  private pendingCount = 0;
  private countListeners = new Set<(n: number) => void>();
  private manager: VaultManager | null = null;
  private replaying = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => void this.replayQueue());
      void this.refreshPendingCount();
    }
  }

  /** The engine needs a manager reference to replay queued pushes later. */
  attachVaultManager(manager: VaultManager): void {
    this.manager = manager;
  }

  // ---------------------------------------------------------------- dirty set

  markDirty(vaultId: string, nodeId: string): void {
    const set = this.dirty.get(vaultId) ?? new Set<string>();
    set.add(nodeId);
    this.dirty.set(vaultId, set);
  }

  getDirty(vaultId: string): string[] {
    return Array.from(this.dirty.get(vaultId) ?? []);
  }

  isDirty(vaultId: string, nodeId: string): boolean {
    return this.dirty.get(vaultId)?.has(nodeId) ?? false;
  }

  clearDirty(vaultId: string): void {
    this.dirty.delete(vaultId);
  }

  // ------------------------------------------------------------------ status

  getStatus(): SyncEngineStatus {
    return this.status;
  }

  onStatusChange(cb: (s: SyncEngineStatus) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  onPendingChange(cb: (n: number) => void): () => void {
    this.countListeners.add(cb);
    return () => this.countListeners.delete(cb);
  }

  getPendingCount(): number {
    return this.pendingCount;
  }

  private setStatus(s: SyncEngineStatus): void {
    this.status = s;
    this.listeners.forEach((cb) => cb(s));
  }

  private async refreshPendingCount(): Promise<void> {
    this.pendingCount = await syncQueue.count();
    this.countListeners.forEach((cb) => cb(this.pendingCount));
  }

  // ------------------------------------------------------------- base version

  private getBase(cloudId: string): string | null {
    try {
      const raw = localStorage.getItem(BASE_KEY);
      if (!raw) return null;
      return (JSON.parse(raw) as Record<string, string>)[cloudId] ?? null;
    } catch {
      return null;
    }
  }

  private setBase(cloudId: string, updatedAt: string | null): void {
    try {
      const raw = localStorage.getItem(BASE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      if (updatedAt) map[cloudId] = updatedAt;
      else delete map[cloudId];
      localStorage.setItem(BASE_KEY, JSON.stringify(map));
    } catch {
      /* storage full or unavailable — base check simply degrades to LWW */
    }
  }

  // --------------------------------------------------------------- main push

  async syncVault(manager: VaultManager, vaultId: string): Promise<SyncOutcome> {
    this.attachVaultManager(manager);

    const vault = manager.getVault(vaultId);
    if (!vault || vault.type !== 'in-memory') {
      return { success: false, error: 'Vault not syncable' };
    }
    if (vault.storageStrategy !== 'cloud') {
      return { success: false, error: 'Vault is not configured for cloud sync' };
    }

    const snapshot: QueuedVaultPush = {
      id: vaultId,
      cloudId: vault.cloudId ?? null,
      name: vault.name,
      graph_data: vault.graphService.getGraphData() as { nodes: unknown[]; links: unknown[] },
      graph_config: (vault.graphConfig ?? {}) as Record<string, unknown>,
      backup_config: (vault.backupConfig ?? {}) as Record<string, unknown>,
      baseUpdatedAt: vault.cloudId ? this.getBase(vault.cloudId) : null,
      queuedAt: Date.now(),
      retries: 0,
    };

    if (!navigator.onLine) {
      await this.enqueue(snapshot);
      this.setStatus('offline');
      return { success: false, queued: true, error: 'Offline — change queued' };
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      await this.enqueue(snapshot);
      this.setStatus('queued');
      return { success: false, queued: true, error: 'Not authenticated — change queued' };
    }

    this.setStatus('syncing');
    eventBus.emit(EventType.SYNC_STARTED, { vaultId });

    try {
      const conflicts = await this.push(manager, vaultId, snapshot);
      await syncQueue.remove(vaultId);
      await this.refreshPendingCount();
      this.clearDirty(vaultId);
      this.setStatus('synced');
      eventBus.emit(EventType.SYNC_COMPLETED, { vaultId, conflicts });
      return { success: true, conflicts };
    } catch (error) {
      await this.enqueue(snapshot);
      this.setStatus('error');
      eventBus.emit(EventType.SYNC_FAILED, { vaultId, error: String(error) });
      return { success: false, queued: true, error: String(error) };
    }
  }

  private async enqueue(entry: QueuedVaultPush): Promise<void> {
    const existing = await syncQueue.get(entry.id);
    await syncQueue.put({ ...entry, retries: existing?.retries ?? 0 });
    await this.refreshPendingCount();
  }

  /** Push a snapshot, resolving cloud-ahead conflicts into conflict copies. */
  private async push(
    manager: VaultManager,
    vaultId: string,
    snapshot: QueuedVaultPush
  ): Promise<string[]> {
    let cloudId = snapshot.cloudId;
    let payload = snapshot.graph_data;
    let conflicts: string[] = [];

    if (!cloudId) {
      const { data, error } = await cloudVaultService.createVault(
        snapshot.name,
        undefined,
        payload as { nodes: unknown[]; links: unknown[] } as never
      );
      if (error || !data) throw new Error(error?.message ?? 'Failed to create cloud vault');
      cloudId = data.id;
      await manager.setCloudId(vaultId, cloudId);
      this.setBase(cloudId, data.updated_at);
    } else {
      const { data: remote } = await cloudVaultService.getVault(cloudId);
      const base = snapshot.baseUpdatedAt;
      const remoteMovedAhead = !!remote && !!base && new Date(remote.updated_at).getTime() > new Date(base).getTime();

      if (remoteMovedAhead && remote) {
        const merged = this.mergeWithConflictCopies(
          remote.graph_data as { nodes: GraphNodeLike[]; links: GraphLinkLike[] },
          payload as unknown as { nodes: GraphNodeLike[]; links: GraphLinkLike[] },
          vaultId
        );
        payload = merged.data as unknown as { nodes: unknown[]; links: unknown[] };
        conflicts = merged.conflicts;
        this.applyToLocalVault(manager, vaultId, merged.data);
      }
    }

    const { error } = await cloudVaultService.updateVault(cloudId, {
      name: snapshot.name,
      graph_data: payload as { nodes: never[]; links: never[] },
      graph_config: snapshot.graph_config,
      backup_config: snapshot.backup_config,
    });
    if (error) throw new Error(error.message);

    const { data: fresh } = await cloudVaultService.getVault(cloudId);
    this.setBase(cloudId, fresh?.updated_at ?? new Date().toISOString());

    return conflicts;
  }

  /**
   * Remote wins for notes the user did not touch. For dirty notes that also
   * changed remotely we keep the remote copy and add `Name (conflict date)`
   * holding the local text, so nothing is lost.
   */
  private mergeWithConflictCopies(
    remote: { nodes: GraphNodeLike[]; links: GraphLinkLike[] },
    local: { nodes: GraphNodeLike[]; links: GraphLinkLike[] },
    vaultId: string
  ): { data: { nodes: GraphNodeLike[]; links: GraphLinkLike[] }; conflicts: string[] } {
    const remoteNodes = new Map((remote.nodes ?? []).map((n) => [n.id, n]));
    const merged: GraphNodeLike[] = [...(remote.nodes ?? [])];
    const conflicts: string[] = [];

    for (const localNode of local.nodes ?? []) {
      const remoteNode = remoteNodes.get(localNode.id);
      if (!remoteNode) {
        merged.push(localNode);
        continue;
      }
      const changedRemotely =
        (remoteNode.content ?? '') !== (localNode.content ?? '') ||
        (remoteNode.name ?? '') !== (localNode.name ?? '');
      if (changedRemotely && this.isDirty(vaultId, localNode.id)) {
        const name = `${localNode.name ?? 'Untitled'} ${conflictSuffix()}`;
        merged.push({
          ...localNode,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `conflict-${Date.now()}-${localNode.id}`,
          name,
        });
        conflicts.push(name);
      }
    }

    const links = new Map<string, GraphLinkLike>();
    for (const l of [...(remote.links ?? []), ...(local.links ?? [])]) links.set(linkId(l), l);
    const nodeIds = new Set(merged.map((n) => n.id));
    const keptLinks = Array.from(links.values()).filter((l) => {
      const s = typeof l.source === 'string' ? l.source : l.source?.id;
      const t = typeof l.target === 'string' ? l.target : l.target?.id;
      return nodeIds.has(s) && nodeIds.has(t);
    });

    return { data: { nodes: merged, links: keptLinks }, conflicts };
  }

  private applyToLocalVault(
    manager: VaultManager,
    vaultId: string,
    data: { nodes: GraphNodeLike[]; links: GraphLinkLike[] }
  ): void {
    const vault = manager.getVault(vaultId);
    if (!vault || vault.type !== 'in-memory') return;
    vault.graphService.clearGraph();
    data.nodes.forEach((n) => vault.graphService.setNode(n as never));
    vault.graphService.setLinks(data.links as never);
  }

  // ------------------------------------------------------------ queue replay

  async replayQueue(): Promise<void> {
    if (this.replaying || !navigator.onLine) return;
    const manager = this.manager;
    if (!manager) return;

    const entries = await syncQueue.all();
    await this.refreshPendingCount();
    if (entries.length === 0) {
      if (this.status !== 'syncing') this.setStatus('synced');
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      // Back online but signed out — surface the backlog instead of "offline".
      this.setStatus('queued');
      return;
    }


    this.replaying = true;
    this.setStatus('syncing');

    for (const entry of entries) {
      try {
        const conflicts = await this.push(manager, entry.id, entry);
        await syncQueue.remove(entry.id);
        this.clearDirty(entry.id);
        eventBus.emit(EventType.SYNC_COMPLETED, { vaultId: entry.id, conflicts, replayed: true });
      } catch (error) {
        const retries = entry.retries + 1;
        if (retries >= 5) {
          await syncQueue.remove(entry.id);
          eventBus.emit(EventType.SYNC_FAILED, { vaultId: entry.id, error: String(error), dropped: true });
        } else {
          await syncQueue.put({ ...entry, retries });
        }
      }
    }

    await this.refreshPendingCount();
    this.replaying = false;
    this.setStatus(this.pendingCount > 0 ? 'queued' : 'synced');
  }

  async clearQueue(): Promise<void> {
    await syncQueue.clear();
    await this.refreshPendingCount();
  }
}

export const syncEngine = new SyncEngine();
