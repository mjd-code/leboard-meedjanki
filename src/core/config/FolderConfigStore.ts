/**
 * Optional `.obmap/*.json` mirror for filesystem vaults — the configuration is
 * written next to the notes, one file per section, like Obsidian's `.obsidian`.
 */

import { container, ServiceIds } from '@/shared/di/container';
import type { FileSystemService } from '@/core/persistence/FileSystemService';
import type { SectionRecord } from './types';

export class FolderConfigStore {
  private async service(): Promise<FileSystemService | null> {
    try {
      return await container.resolve<FileSystemService>(ServiceIds.FileSystemService);
    } catch {
      return null;
    }
  }

  /** Best-effort write; silently skipped when no folder vault is open. */
  async writeSections(entries: Array<{ id: string; record: SectionRecord }>): Promise<boolean> {
    const fs = await this.service();
    if (!fs) return false;
    try {
      for (const entry of entries) {
        await fs.saveFile(['.obmap', `${entry.id}.json`], JSON.stringify(entry.record, null, 2));
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const folderConfigStore = new FolderConfigStore();
