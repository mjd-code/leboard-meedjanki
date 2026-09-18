/**
 * ZIP Import Service - Extension of Graph Service
 * 
 * Handles importing graph data from ZIP files, emulating the
 * Persistence Service's event emission pattern for consistency.
 */

import JSZip from 'jszip';
import { eventBus, EventType } from '@/shared/events/events';
import { ContentParser } from '@/core/metadata/content-parser';

interface GraphNode {
  id: string;
  name: string;
  content: string;
  type: 'folder' | 'file';
  parentId: string | null;
  depth: number;
  tags: string[];
  wikilinks?: string[];
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export class ZipImportService {
  private parser: ContentParser;

  constructor() {
    this.parser = new ContentParser();
  }

  /**
   * Import graph from ZIP file by emitting events
   */
  async importFromZip(file: File): Promise<GraphData> {
    // Validate and read ZIP
    const { rawFiles, folderPaths } = await this.validateAndReadZip(file);

    // Process files and emit events
    await this.processFilesAndEmitEvents(rawFiles, folderPaths);

    // Return empty graph data - the GraphService will build it from events
    return { nodes: [], links: [] };
  }

  private async validateAndReadZip(file: File): Promise<{
    rawFiles: Map<string, string>;
    folderPaths: Set<string>;
  }> {
    const MAX_SIZE = 50 * 1024 * 1024;
    const MAX_FILES = 10000;
    const MAX_DEPTH = 50;
    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      throw new Error('File too large. Maximum size is 50MB.');
    }

    if (!file.name.endsWith('.zip')) {
      throw new Error('Invalid file type. Please upload a ZIP file.');
    }

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (error) {
      throw new Error('Failed to read ZIP file. File may be corrupted.');
    }

    if (Object.keys(zip.files).length === 0) {
      throw new Error('ZIP file is empty.');
    }

    const rawFiles = new Map<string, string>();
    const folderPaths = new Set<string>();
    const readPromises: Promise<void>[] = [];
    let markdownFileCount = 0;

    zip.forEach((relativePath, zipEntry) => {
      const depth = relativePath.split('/').length - 1;
      if (depth > MAX_DEPTH) {
        throw new Error(`Directory structure too deep (max depth: ${MAX_DEPTH}). Path: ${relativePath}`);
      }

      if (relativePath.startsWith('.') || relativePath === '_graph_metadata.json') {
        return;
      }

      if (zipEntry.dir) {
        const cleanPath = relativePath.replace(/\/$/, '');
        if (cleanPath) {
          folderPaths.add(cleanPath);
        }
        return;
      }

      if (relativePath.endsWith('.md')) {
        markdownFileCount++;

        if (markdownFileCount > MAX_FILES) {
          throw new Error(`Too many files (max: ${MAX_FILES})`);
        }

        readPromises.push(
          zipEntry.async('string').then(content => {
            if (content.length > MAX_FILE_SIZE) {
              throw new Error(`File too large: ${relativePath} (max 5MB per file)`);
            }
            rawFiles.set(relativePath, content);
          })
        );
      }
    });

    await Promise.all(readPromises);

    if (markdownFileCount === 0) {
      throw new Error('No markdown files found in ZIP.');
    }

    return { rawFiles, folderPaths };
  }

  private async processFilesAndEmitEvents(
    rawFiles: Map<string, string>,
    folderPaths: Set<string>
  ): Promise<void> {
    const folderMap = new Map<string, string>();
    let nodeIdCounter = 0;

    // Build complete folder hierarchy
    const allFolderPaths = new Set(folderPaths);
    rawFiles.forEach((_, path) => {
      const pathParts = path.split('/');
      for (let i = 1; i < pathParts.length; i++) {
        const folderPath = pathParts.slice(0, i).join('/');
        if (folderPath) {
          allFolderPaths.add(folderPath);
        }
      }
    });

    const sortedFolders = Array.from(allFolderPaths).sort((a, b) => {
      return a.split('/').length - b.split('/').length;
    });

    // Emit vault opened event
    if (sortedFolders.length > 0) {
      const rootName = sortedFolders[0].split('/')[0];
      const rootId = 'folder-root';

      eventBus.emit(EventType.FOLDER_CREATED, {
        id: rootId,
        name: rootName,
        path: [rootName],
        parentId: null,
      });

      folderMap.set(rootName, rootId);
    }

    // Emit folder created events
    sortedFolders.forEach(folderPath => {
      const pathParts = folderPath.split('/');
      const folderName = pathParts[pathParts.length - 1];

      let parentId: string | null = null;
      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join('/');
        parentId = folderMap.get(parentPath) || null;
      }

      if (!folderMap.has(folderPath)) {
        const folderId = `folder-${nodeIdCounter++}`;

        eventBus.emit(EventType.FOLDER_CREATED, {
          id: folderId,
          name: folderName,
          path: pathParts,
          parentId,
        });

        folderMap.set(folderPath, folderId);
      }
    });

    // Emit note created events
    rawFiles.forEach((content, path) => {
      const pathParts = path.replace('.md', '').split('/');
      const fileName = pathParts[pathParts.length - 1];

      let parentId: string | null = null;
      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join('/');
        parentId = folderMap.get(parentPath) || null;
      } else {
        parentId = folderMap.get(pathParts[0]) || null;
      }

      const fileId = `file-${nodeIdCounter++}`;

      eventBus.emit(EventType.NOTE_CREATED, {
        id: fileId,
        name: fileName,
        content,
        path: pathParts,
        parentId,
      });
    });
  }
}
