/**
 * Background Sync Service
 * 
 * Handles automatic syncing of vault changes when the device comes back online
 * after being offline. Uses the Background Sync API when available, with fallback
 * to online event listeners.
 */

import { eventBus, EventType, DomainEvent } from '@/shared/events/events';

interface PendingChange {
  id: string;
  timestamp: number;
  path: string[];
  content: string;
  retryCount: number;
}

// Event payload interface
interface NoteUpdatedPayload {
  id: string;
  content: string;
}

export class BackgroundSyncService {
  private pendingChanges: Map<string, PendingChange> = new Map();
  private syncRegistered = false;
  private readonly STORAGE_KEY = 'vault_pending_changes';
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.loadPendingChanges();
    this.setupEventListeners();
  }

  /**
   * Queue a change for background sync
   */
  queueChange(path: string[], content: string): void {
    const changeId = path.join('/');
    const change: PendingChange = {
      id: changeId,
      timestamp: Date.now(),
      path,
      content,
      retryCount: 0,
    };

    this.pendingChanges.set(changeId, change);
    this.savePendingChanges();

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncChanges();
    } else {
      // Register background sync for when we come back online
      this.registerBackgroundSync();
    }
  }

  /**
   * Setup event listeners for online/offline status
   */
  private setupEventListeners(): void {
    // Listen for online event
    window.addEventListener('online', () => {
      console.log('[BackgroundSync] Device is online, syncing changes...');
      this.syncChanges();
    });

    // Listen for vault changes to queue them
    eventBus.subscribe<NoteUpdatedPayload>(EventType.NOTE_UPDATED, (event) => {
      if (!navigator.onLine) {
        console.log('[BackgroundSync] Queuing change while offline:', event.payload.id);
        // Changes will be queued by the FileSystemService
      }
    });
  }

  /**
   * Register background sync with the service worker
   */
  private async registerBackgroundSync(): Promise<void> {
    if (this.syncRegistered) return;

    try {
      if ('serviceWorker' in navigator && 'sync' in (self as any).registration) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('vault-sync');
        this.syncRegistered = true;
        console.log('[BackgroundSync] Background sync registered');
      }
    } catch (error) {
      console.warn('[BackgroundSync] Background Sync API not available, using fallback');
      // Fallback is already handled by online event listener
    }
  }

  /**
   * Sync all pending changes
   */
  private async syncChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;

    console.log(`[BackgroundSync] Syncing ${this.pendingChanges.size} pending changes...`);

    const changesArray = Array.from(this.pendingChanges.values());
    const results = await Promise.allSettled(
      changesArray.map(change => this.syncSingleChange(change))
    );

    results.forEach((result, index) => {
      const change = changesArray[index];
      if (result.status === 'fulfilled') {
        this.pendingChanges.delete(change.id);
        console.log(`[BackgroundSync] Successfully synced: ${change.id}`);
      } else {
        change.retryCount++;
        if (change.retryCount >= this.MAX_RETRIES) {
          console.error(`[BackgroundSync] Max retries reached for: ${change.id}`);
          this.pendingChanges.delete(change.id);
        } else {
          console.warn(`[BackgroundSync] Retry ${change.retryCount}/${this.MAX_RETRIES} for: ${change.id}`);
        }
      }
    });

    this.savePendingChanges();
    this.syncRegistered = false;

    // Emit sync complete event
    eventBus.emit(EventType.VAULT_SYNC_COMPLETE, {
      synced: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    });
  }

  /**
   * Sync a single change
   */
  private async syncSingleChange(change: PendingChange): Promise<void> {
    // Emit event to save the file
    return new Promise((resolve, reject) => {
      try {
        eventBus.emit(EventType.NOTE_SYNC_REQUESTED, {
          path: change.path,
          content: change.content,
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Load pending changes from localStorage
   */
  private loadPendingChanges(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const changes = JSON.parse(stored) as PendingChange[];
        changes.forEach(change => {
          this.pendingChanges.set(change.id, change);
        });
        console.log(`[BackgroundSync] Loaded ${changes.length} pending changes`);
      }
    } catch (error) {
      console.error('[BackgroundSync] Error loading pending changes:', error);
    }
  }

  /**
   * Save pending changes to localStorage
   */
  private savePendingChanges(): void {
    try {
      const changes = Array.from(this.pendingChanges.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(changes));
    } catch (error) {
      console.error('[BackgroundSync] Error saving pending changes:', error);
    }
  }

  /**
   * Get count of pending changes
   */
  getPendingCount(): number {
    return this.pendingChanges.size;
  }

  /**
   * Clear all pending changes
   */
  clearPending(): void {
    this.pendingChanges.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// Singleton instance
export const backgroundSyncService = new BackgroundSyncService();
