/**
 * Domain Events - Event Sourcing Pattern
 * Events emitted by the Vault/Persistence Service and consumed by UI components
 * 
 * This is the REACTIVE CORE of the application - all state changes flow through here.
 */

export enum EventType {
  // Vault Lifecycle
  VAULT_OPENED = 'VAULT_OPENED',
  VAULT_CLOSED = 'VAULT_CLOSED',
  VAULT_SWITCHED = 'VAULT_SWITCHED',
  VAULT_CREATED = 'VAULT_CREATED',
  VAULT_DELETED = 'VAULT_DELETED',
  VAULT_RENAMED = 'VAULT_RENAMED',
  VAULT_SAVED = 'VAULT_SAVED',

  // Node Operations
  NODE_CREATED = 'NODE_CREATED',
  NODE_UPDATED = 'NODE_UPDATED',
  NODE_DELETED = 'NODE_DELETED',
  NODE_MOVED = 'NODE_MOVED',
  NODE_SELECTED = 'NODE_SELECTED',

  // Graph Operations
  GRAPH_UPDATED = 'GRAPH_UPDATED',
  LINKS_UPDATED = 'LINKS_UPDATED',

  // Legacy (keeping for compatibility)
  NOTE_CREATED = 'NOTE_CREATED',
  NOTE_UPDATED = 'NOTE_UPDATED',
  NOTE_DELETED = 'NOTE_DELETED',
  FOLDER_CREATED = 'FOLDER_CREATED',
  FOLDER_DELETED = 'FOLDER_DELETED',
  NOTE_SYNC_REQUESTED = 'NOTE_SYNC_REQUESTED',
  VAULT_SYNC_COMPLETE = 'VAULT_SYNC_COMPLETE',
  LINK_DISCOVERED = 'LINK_DISCOVERED',

  // Undo/Redo
  UNDO_PERFORMED = 'UNDO_PERFORMED',
  REDO_PERFORMED = 'REDO_PERFORMED',

  // Sync
  SYNC_STARTED = 'SYNC_STARTED',
  SYNC_COMPLETED = 'SYNC_COMPLETED',
  SYNC_FAILED = 'SYNC_FAILED',

  // Plugin lifecycle
  FEATURE_ENABLED = 'FEATURE_ENABLED',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
}

export interface DomainEvent<T = unknown> {
  type: EventType;
  timestamp: number;
  payload: T;
  vaultId?: string;
}

// Vault Events
export interface VaultOpenedPayload {
  vaultId: string;
  vaultName: string;
  rootHandle?: FileSystemDirectoryHandle;
}

export interface VaultCreatedPayload {
  vaultId: string;
  vaultName: string;
  storageStrategy: string;
}

export interface VaultDeletedPayload {
  vaultId: string;
  wasCloudVault: boolean;
}

export interface VaultRenamedPayload {
  vaultId: string;
  oldName: string;
  newName: string;
}

export interface VaultSavedPayload {
  vaultId: string;
  nodeCount: number;
  linkCount: number;
}

// Node Events
export interface NodePayload {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'media';
  parentId: string | null;
  vaultId: string;
}

export interface NodeCreatedPayload extends NodePayload {
  content: string;
}

export interface NodeUpdatedPayload {
  id: string;
  vaultId: string;
  changes: Partial<{
    name: string;
    content: string;
    tags: string[];
    parentId: string | null;
  }>;
}

export interface NodeDeletedPayload {
  id: string;
  vaultId: string;
  cascadeDeleted: string[]; // IDs of children also deleted
}

export interface NodeMovedPayload {
  id: string;
  vaultId: string;
  oldParentId: string | null;
  newParentId: string | null;
}

export interface NodeSelectedPayload {
  id: string | null;
  vaultId: string;
}

// Graph Events
export interface GraphUpdatedPayload {
  vaultId: string;
  nodeCount: number;
  linkCount: number;
  source: 'undo' | 'redo' | 'import' | 'restore' | 'sync' | 'mutation';
}

export interface LinksUpdatedPayload {
  vaultId: string;
  added: Array<{ source: string; target: string; type?: string }>;
  removed: Array<{ source: string; target: string }>;
}

// Sync Events
export interface SyncPayload {
  vaultId: string;
  direction: 'upload' | 'download' | 'bidirectional';
}

export interface SyncCompletedPayload extends SyncPayload {
  synced: number;
  failed: number;
}

export interface SyncFailedPayload extends SyncPayload {
  error: string;
}

type EventCallback<T = unknown> = (event: DomainEvent<T>) => void;
type WildcardCallback = (event: DomainEvent) => void;

/**
 * Event Bus - Decouples Services from UI Components
 * 
 * Pattern: Pub/Sub with type-safe events
 * - Services EMIT events when state changes
 * - UI components SUBSCRIBE to events they care about
 * - No direct coupling between layers
 */
class EventBus {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();
  private wildcardListeners: Set<WildcardCallback> = new Set();
  private eventHistory: DomainEvent[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to a specific event type
   * @returns Unsubscribe function
   */
  subscribe<T = unknown>(eventType: EventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback as EventCallback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback as EventCallback);
    };
  }

  /**
   * Subscribe to ALL events (useful for debugging/logging)
   * @returns Unsubscribe function
   */
  subscribeAll(callback: WildcardCallback): () => void {
    this.wildcardListeners.add(callback);
    return () => {
      this.wildcardListeners.delete(callback);
    };
  }

  /**
   * Subscribe to multiple event types at once
   * @returns Unsubscribe function that removes all subscriptions
   */
  subscribeMany(eventTypes: EventType[], callback: EventCallback): () => void {
    const unsubscribes = eventTypes.map(type => this.subscribe(type, callback));
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T = unknown>(type: EventType, payload: T, vaultId?: string): void {
    const event: DomainEvent<T> = {
      type,
      timestamp: Date.now(),
      payload,
      vaultId,
    };

    // Store in history
    this.eventHistory.push(event as DomainEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify specific listeners
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event as DomainEvent);
        } catch (error) {
          console.error(`[EventBus] Error in listener for ${type}:`, error);
        }
      });
    }

    // Notify wildcard listeners
    this.wildcardListeners.forEach(callback => {
      try {
        callback(event as DomainEvent);
      } catch (error) {
        console.error(`[EventBus] Error in wildcard listener:`, error);
      }
    });

    // Debug log in development
    if (import.meta.env.DEV) {
      console.log(`[EventBus] ${type}`, payload);
    }
  }

  /**
   * Get recent event history (for debugging)
   */
  getHistory(limit = 20): DomainEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get history for a specific vault
   */
  getVaultHistory(vaultId: string, limit = 20): DomainEvent[] {
    return this.eventHistory
      .filter(e => e.vaultId === vaultId)
      .slice(-limit);
  }

  /**
   * Clear all listeners and history
   */
  clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
    this.eventHistory = [];
  }

  /**
   * Get listener count (for debugging)
   */
  getListenerCount(): { total: number; byType: Record<string, number> } {
    let total = this.wildcardListeners.size;
    const byType: Record<string, number> = {};
    
    this.listeners.forEach((set, type) => {
      byType[type] = set.size;
      total += set.size;
    });
    
    return { total, byType };
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Helper functions for common event emissions
export const emitNodeCreated = (payload: NodeCreatedPayload) => 
  eventBus.emit(EventType.NODE_CREATED, payload, payload.vaultId);

export const emitNodeUpdated = (payload: NodeUpdatedPayload) => 
  eventBus.emit(EventType.NODE_UPDATED, payload, payload.vaultId);

export const emitNodeDeleted = (payload: NodeDeletedPayload) => 
  eventBus.emit(EventType.NODE_DELETED, payload, payload.vaultId);

export const emitNodeMoved = (payload: NodeMovedPayload) => 
  eventBus.emit(EventType.NODE_MOVED, payload, payload.vaultId);

export const emitNodeSelected = (payload: NodeSelectedPayload) => 
  eventBus.emit(EventType.NODE_SELECTED, payload, payload.vaultId);

export const emitGraphUpdated = (payload: GraphUpdatedPayload) => 
  eventBus.emit(EventType.GRAPH_UPDATED, payload, payload.vaultId);

export const emitVaultCreated = (payload: VaultCreatedPayload) => 
  eventBus.emit(EventType.VAULT_CREATED, payload, payload.vaultId);

export const emitVaultDeleted = (payload: VaultDeletedPayload) => 
  eventBus.emit(EventType.VAULT_DELETED, payload, payload.vaultId);

export const emitVaultSaved = (payload: VaultSavedPayload) => 
  eventBus.emit(EventType.VAULT_SAVED, payload, payload.vaultId);

export const emitVaultRenamed = (payload: VaultRenamedPayload) => 
  eventBus.emit(EventType.VAULT_RENAMED, payload, payload.vaultId);

export const emitVaultSwitched = (vaultId: string) => 
  eventBus.emit(EventType.VAULT_SWITCHED, { vaultId }, vaultId);
