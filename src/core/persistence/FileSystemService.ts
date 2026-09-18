/**
 * Persistence Service - Filesystem-Native Layer
 * 
 * Responsibilities:
 * - Preserve vault integrity (folders + Markdown files)
 * - Provide lightweight CRUD operations
 * - Emit domain events for Graph Service consumption
 * - Remain fully portable, no database required
 */

import { eventBus, EventType } from '@/shared/events/events';
import { backgroundSyncService } from '../sync/BackgroundSyncService';

export interface FileSystemNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string[];
  parentId: string | null;
}

// Event payload interfaces
interface NoteSyncRequestedPayload {
  path: string[];
  content: string;
}

export class FileSystemService {
  private vaultHandle: FileSystemDirectoryHandle | null = null;
  private nodeIdCounter = 0;

  constructor() {
    // Listen for sync requests
    eventBus.subscribe<NoteSyncRequestedPayload>(EventType.NOTE_SYNC_REQUESTED, async (event) => {
      if (this.vaultHandle) {
        try {
          await this.saveFile(event.payload.path, event.payload.content);
        } catch (error) {
          console.error('[FileSystemService] Error syncing file:', error);
        }
      }
    });
  }

  /**
   * Open a vault directory
   */
  async openVault(): Promise<{
    vaultName: string;
    handle: FileSystemDirectoryHandle;
  } | null> {
    try {
      // @ts-ignore - File System Access API
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      this.vaultHandle = dirHandle;

      // Emit vault opened event
      eventBus.emit(EventType.VAULT_OPENED, {
        vaultName: dirHandle.name,
        rootHandle: dirHandle,
      });

      return { vaultName: dirHandle.name, handle: dirHandle };
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        throw error;
      }
      return null;
    }
  }

  /**
   * Read vault structure and emit events for each discovered node
   */
  async readVaultStructure(
    dirHandle: FileSystemDirectoryHandle
  ): Promise<FileSystemNode[]> {
    const nodes: FileSystemNode[] = [];
    this.nodeIdCounter = 0;

    const processDirectory = async (
      handle: FileSystemDirectoryHandle,
      parentId: string | null,
      path: string[]
    ): Promise<void> => {
      const folderId = `node-${this.nodeIdCounter++}`;

      nodes.push({
        id: folderId,
        name: handle.name,
        type: 'folder',
        path: [...path, handle.name],
        parentId,
      });

      // Emit folder created event
      eventBus.emit(EventType.FOLDER_CREATED, {
        id: folderId,
        name: handle.name,
        path: [...path, handle.name],
        parentId,
      });

      // @ts-ignore
      for await (const entry of handle.values()) {
        if (entry.kind === 'directory') {
          await processDirectory(entry, folderId, [...path, handle.name]);
        } else if (entry.kind === 'file' && entry.name.endsWith('.md')) {
          const fileId = `node-${this.nodeIdCounter++}`;
          const file = await entry.getFile();
          const content = await file.text();

          nodes.push({
            id: fileId,
            name: entry.name.replace('.md', ''),
            type: 'file',
            path: [...path, handle.name, entry.name],
            parentId: folderId,
          });

          // Emit note created event
          eventBus.emit(EventType.NOTE_CREATED, {
            id: fileId,
            name: entry.name.replace('.md', ''),
            content,
            path: [...path, handle.name, entry.name],
            parentId: folderId,
          });
        }
      }
    };

    const rootId = `node-${this.nodeIdCounter++}`;
    nodes.push({
      id: rootId,
      name: dirHandle.name,
      type: 'folder',
      path: [dirHandle.name],
      parentId: null,
    });

    // @ts-ignore
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'directory') {
        await processDirectory(entry, rootId, [dirHandle.name]);
      } else if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        const fileId = `node-${this.nodeIdCounter++}`;
        const file = await entry.getFile();
        const content = await file.text();

        nodes.push({
          id: fileId,
          name: entry.name.replace('.md', ''),
          type: 'file',
          path: [dirHandle.name, entry.name],
          parentId: rootId,
        });

        eventBus.emit(EventType.NOTE_CREATED, {
          id: fileId,
          name: entry.name.replace('.md', ''),
          content,
          path: [dirHandle.name, entry.name],
          parentId: rootId,
        });
      }
    }

    return nodes;
  }

  /**
   * Save content to a file
   */
  async saveFile(path: string[], content: string): Promise<void> {
    if (!this.vaultHandle) {
      throw new Error('No vault is currently open');
    }

    // If offline, queue for background sync
    if (!navigator.onLine) {
      console.log('[FileSystemService] Device offline, queuing change for sync');
      backgroundSyncService.queueChange(path, content);
      return;
    }

    try {
      const fileHandle = await this.getFileHandle(this.vaultHandle, path);
      if (!fileHandle) {
        throw new Error('Could not access file');
      }

      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      // Emit note updated event
      eventBus.emit(EventType.NOTE_UPDATED, {
        id: path.join('/'),
        content,
      });
    } catch (error) {
      // If save fails, queue for retry
      console.error('[FileSystemService] Save failed, queuing for retry:', error);
      backgroundSyncService.queueChange(path, content);
      throw error;
    }
  }

  private async getFileHandle(
    dirHandle: FileSystemDirectoryHandle,
    path: string[]
  ): Promise<FileSystemFileHandle | null> {
    let currentHandle: FileSystemDirectoryHandle = dirHandle;

    for (let i = 0; i < path.length - 1; i++) {
      try {
        currentHandle = await currentHandle.getDirectoryHandle(path[i]);
      } catch {
        return null;
      }
    }

    try {
      return await currentHandle.getFileHandle(path[path.length - 1], { create: true });
    } catch {
      return null;
    }
  }

  closeVault(): void {
    this.vaultHandle = null;
  }

  isOpen(): boolean {
    return this.vaultHandle !== null;
  }

  getHandle(): FileSystemDirectoryHandle | null {
    return this.vaultHandle;
  }

  /**
   * Read vault config from .vault-config.json
   */
  async readVaultConfig(): Promise<Record<string, any> | null> {
    if (!this.vaultHandle) return null;

    try {
      const fileHandle = await this.vaultHandle.getFileHandle('.vault-config.json');
      const file = await fileHandle.getFile();
      const content = await file.text();
      return JSON.parse(content);
    } catch {
      // File doesn't exist or can't be read
      return null;
    }
  }

  /**
   * Write vault config to .vault-config.json
   */
  async writeVaultConfig(config: Record<string, any>): Promise<boolean> {
    if (!this.vaultHandle) return false;

    try {
      const fileHandle = await this.vaultHandle.getFileHandle('.vault-config.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(config, null, 2));
      await writable.close();
      return true;
    } catch (error) {
      console.error('[FileSystemService] Failed to write vault config:', error);
      return false;
    }
  }
}
