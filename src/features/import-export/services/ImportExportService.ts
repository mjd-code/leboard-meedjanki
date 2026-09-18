/**
 * Import/Export Service - Universal file handling
 * 
 * Supports importing: files, folders, ZIP, images, audio, video
 * Supports exporting: entire vault, folders, files, media
 */

import JSZip from 'jszip';
import { ContentParser } from '@/core/metadata/content-parser';

export type DuplicateStrategy = 'rename' | 'overwrite' | 'skip' | 'merge';

export interface GraphNode {
  id: string;
  name: string;
  content: string;
  type: 'folder' | 'file' | 'media';
  parentId: string | null;
  depth: number;
  tags: string[];
  wikilinks?: string[];
  mediaType?: 'image' | 'audio' | 'video';
  mimeType?: string;
  dataUrl?: string;
}

export interface ImportResult {
  success: boolean;
  nodes: GraphNode[];
  updatedNodes: GraphNode[];
  folders: number;
  files: number;
  media: number;
  skipped: number;
  merged: number;
  overwritten: number;
  errors: string[];
}

export interface ExportOptions {
  type: 'vault' | 'folder' | 'files' | 'media';
  nodeIds?: string[];
  includeMedia?: boolean;
  format?: 'zip' | 'json';
}

const SUPPORTED_EXTENSIONS = {
  markdown: ['.md', '.markdown', '.txt'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'],
  video: ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB total

export class ImportExportService {
  private parser: ContentParser;

  constructor() {
    this.parser = new ContentParser();
  }

  private getFileType(filename: string): 'markdown' | 'image' | 'audio' | 'video' | 'unknown' {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    if (SUPPORTED_EXTENSIONS.markdown.includes(ext)) return 'markdown';
    if (SUPPORTED_EXTENSIONS.image.includes(ext)) return 'image';
    if (SUPPORTED_EXTENSIONS.audio.includes(ext)) return 'audio';
    if (SUPPORTED_EXTENSIONS.video.includes(ext)) return 'video';
    
    return 'unknown';
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUniqueName(
    nodes: GraphNode[], 
    baseName: string, 
    parentId: string | null
  ): string {
    const existingNames = new Set(
      nodes
        .filter(n => n.parentId === parentId)
        .map(n => n.name)
    );
    
    if (!existingNames.has(baseName)) {
      return baseName;
    }
    
    let counter = 1;
    let uniqueName = `${baseName} (${counter})`;
    while (existingNames.has(uniqueName)) {
      counter++;
      uniqueName = `${baseName} (${counter})`;
    }
    return uniqueName;
  }

  private findExistingNode(
    nodes: GraphNode[], 
    name: string, 
    parentId: string | null,
    type: 'folder' | 'file' | 'media'
  ): GraphNode | undefined {
    return nodes.find(n => 
      n.name === name && 
      n.parentId === parentId && 
      n.type === type
    );
  }

  private buildNodePathKey(node: GraphNode, allNodes: GraphNode[]): string {
    const parts: string[] = [node.name];
    let current = node;
    
    while (current.parentId) {
      const parent = allNodes.find(n => n.id === current.parentId);
      if (parent) {
        parts.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }
    
    return parts.join('/');
  }

  /**
   * Import files from file input with duplicate handling strategy
   */
  async importFiles(
    files: FileList, 
    existingNodes: GraphNode[] = [],
    duplicateStrategy: DuplicateStrategy = 'rename'
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      nodes: [],
      updatedNodes: [],
      folders: 0,
      files: 0,
      media: 0,
      skipped: 0,
      merged: 0,
      overwritten: 0,
      errors: [],
    };

    let totalSize = 0;
    const folderMap = new Map<string, string>();
    const importedNodes: GraphNode[] = [];
    const updatedNodes: GraphNode[] = [];

    // Build a map of existing folders for reuse
    existingNodes.forEach(n => {
      if (n.type === 'folder') {
        const pathKey = this.buildNodePathKey(n, existingNodes);
        folderMap.set(pathKey, n.id);
      }
    });

    // Find a root folder to attach imports to
    let importRootId: string | null = null;
    const existingRoot = existingNodes.find(n => n.parentId === null && n.type === 'folder');
    if (existingRoot) {
      importRootId = existingRoot.id;
    }

    for (const file of Array.from(files)) {
      try {
        if (file.size > MAX_FILE_SIZE) {
          result.errors.push(`File too large: ${file.name} (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
          continue;
        }

        totalSize += file.size;
        if (totalSize > MAX_TOTAL_SIZE) {
          result.errors.push('Total import size exceeded 200MB limit');
          break;
        }

        const fileType = this.getFileType(file.name);
        
        // Handle ZIP files
        if (file.name.endsWith('.zip')) {
          const zipResult = await this.importZip(file, [...existingNodes, ...importedNodes], folderMap, duplicateStrategy);
          importedNodes.push(...zipResult.nodes);
          updatedNodes.push(...zipResult.updatedNodes);
          result.folders += zipResult.folders;
          result.files += zipResult.files;
          result.media += zipResult.media;
          result.skipped += zipResult.skipped;
          result.merged += zipResult.merged;
          result.overwritten += zipResult.overwritten;
          result.errors.push(...zipResult.errors);
          continue;
        }

        const relativePath = (file as any).webkitRelativePath || file.name;
        const pathParts = relativePath.split('/').filter(Boolean);
        
        // Create folder hierarchy
        let currentParentId = importRootId;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const folderPath = pathParts.slice(0, i + 1).join('/');
          if (!folderMap.has(folderPath)) {
            const folderId = this.generateId('folder');
            const allCurrentNodes = [...existingNodes, ...importedNodes];
            const folderDepth = currentParentId 
              ? (allCurrentNodes.find(n => n.id === currentParentId)?.depth ?? -1) + 1 
              : 0;

            const folderNode: GraphNode = {
              id: folderId,
              name: pathParts[i],
              content: '',
              type: 'folder',
              parentId: currentParentId,
              depth: folderDepth,
              tags: [],
            };

            importedNodes.push(folderNode);
            folderMap.set(folderPath, folderId);
            currentParentId = folderId;
            result.folders++;
          } else {
            currentParentId = folderMap.get(folderPath)!;
          }
        }

        const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null;
        const parentId = parentPath ? folderMap.get(parentPath) || importRootId : importRootId;
        const allNodes = [...existingNodes, ...importedNodes];
        const parentNode = parentId ? allNodes.find(n => n.id === parentId) : null;
        const nodeDepth = parentNode ? parentNode.depth + 1 : 0;
        
        const fileName = pathParts[pathParts.length - 1];
        const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

        if (fileType === 'markdown') {
          const content = await file.text();
          const parsed = this.parser.parse(content);
          
          // Check for existing file with same name
          const existingFile = this.findExistingNode(allNodes, fileNameWithoutExt, parentId, 'file');
          
          if (existingFile) {
            switch (duplicateStrategy) {
              case 'skip':
                result.skipped++;
                continue;
              case 'overwrite':
                const overwrittenNode: GraphNode = {
                  ...existingFile,
                  content,
                  tags: parsed.tags,
                  wikilinks: parsed.wikilinks,
                };
                updatedNodes.push(overwrittenNode);
                result.overwritten++;
                continue;
              case 'merge':
                const mergedNode: GraphNode = {
                  ...existingFile,
                  content: existingFile.content + '\n\n---\n\n' + content,
                  tags: [...new Set([...existingFile.tags, ...parsed.tags])],
                  wikilinks: [...new Set([...(existingFile.wikilinks || []), ...parsed.wikilinks])],
                };
                updatedNodes.push(mergedNode);
                result.merged++;
                continue;
              case 'rename':
              default:
                // Fall through to create with unique name
                break;
            }
          }
          
          const uniqueName = existingFile && duplicateStrategy === 'rename'
            ? this.generateUniqueName(allNodes, fileNameWithoutExt, parentId)
            : fileNameWithoutExt;
          
          const fileNode: GraphNode = {
            id: this.generateId('file'),
            name: uniqueName,
            content,
            type: 'file',
            parentId,
            depth: nodeDepth,
            tags: parsed.tags,
            wikilinks: parsed.wikilinks,
          };

          importedNodes.push(fileNode);
          result.files++;
        } else if (fileType !== 'unknown') {
          const dataUrl = await this.fileToDataUrl(file);
          
          const existingMedia = this.findExistingNode(allNodes, fileNameWithoutExt, parentId, 'media');
          
          if (existingMedia) {
            switch (duplicateStrategy) {
              case 'skip':
                result.skipped++;
                continue;
              case 'overwrite':
                const overwrittenMedia: GraphNode = {
                  ...existingMedia,
                  content: `![${fileName}](${dataUrl})`,
                  mimeType: file.type,
                  dataUrl,
                };
                updatedNodes.push(overwrittenMedia);
                result.overwritten++;
                continue;
              case 'merge':
                // For media, merge doesn't make sense, so skip
                result.skipped++;
                continue;
              case 'rename':
              default:
                break;
            }
          }
          
          const uniqueName = existingMedia && duplicateStrategy === 'rename'
            ? this.generateUniqueName(allNodes, fileNameWithoutExt, parentId)
            : fileNameWithoutExt;
          
          const mediaNode: GraphNode = {
            id: this.generateId('media'),
            name: uniqueName,
            content: `![${fileName}](${dataUrl})`,
            type: 'media',
            parentId,
            depth: nodeDepth,
            tags: [fileType],
            mediaType: fileType as 'image' | 'audio' | 'video',
            mimeType: file.type,
            dataUrl,
          };

          importedNodes.push(mediaNode);
          result.media++;
        }
      } catch (error) {
        result.errors.push(`Failed to import ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.nodes = importedNodes;
    result.updatedNodes = updatedNodes;
    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Import from ZIP file with duplicate handling
   */
  async importZip(
    file: File, 
    existingNodes: GraphNode[] = [],
    existingFolderMap: Map<string, string> = new Map(),
    duplicateStrategy: DuplicateStrategy = 'rename'
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      nodes: [],
      updatedNodes: [],
      folders: 0,
      files: 0,
      media: 0,
      skipped: 0,
      merged: 0,
      overwritten: 0,
      errors: [],
    };

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (error) {
      result.errors.push('Failed to read ZIP file. File may be corrupted.');
      result.success = false;
      return result;
    }

    const folderMap = new Map(existingFolderMap);
    const importedNodes: GraphNode[] = [];
    const updatedNodes: GraphNode[] = [];
    const allFolderPaths = new Set<string>();

    existingNodes.forEach(n => {
      if (n.type === 'folder') {
        const pathKey = this.buildNodePathKey(n, existingNodes);
        folderMap.set(pathKey, n.id);
      }
    });

    let importRootId: string | null = null;
    const existingRoot = existingNodes.find(n => n.parentId === null && n.type === 'folder');
    if (existingRoot) {
      importRootId = existingRoot.id;
    }

    zip.forEach((relativePath, zipEntry) => {
      if (relativePath.startsWith('.') || relativePath === '_graph_metadata.json') return;

      if (zipEntry.dir) {
        const cleanPath = relativePath.replace(/\/$/, '');
        if (cleanPath) allFolderPaths.add(cleanPath);
      } else {
        const pathParts = relativePath.split('/');
        for (let i = 1; i < pathParts.length; i++) {
          const folderPath = pathParts.slice(0, i).join('/');
          if (folderPath) allFolderPaths.add(folderPath);
        }
      }
    });

    const sortedFolders = Array.from(allFolderPaths).sort((a, b) => 
      a.split('/').length - b.split('/').length
    );

    for (const folderPath of sortedFolders) {
      if (folderMap.has(folderPath)) continue;

      const pathParts = folderPath.split('/');
      const folderName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null;
      const parentId = parentPath ? folderMap.get(parentPath) || importRootId : importRootId;
      
      const allNodes = [...existingNodes, ...importedNodes];
      const parentNode = parentId ? allNodes.find(n => n.id === parentId) : null;
      const folderDepth = parentNode ? parentNode.depth + 1 : 0;

      const folderId = this.generateId('folder');
      const folderNode: GraphNode = {
        id: folderId,
        name: folderName,
        content: '',
        type: 'folder',
        parentId,
        depth: folderDepth,
        tags: [],
      };

      importedNodes.push(folderNode);
      folderMap.set(folderPath, folderId);
      result.folders++;
    }

    const filePromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (relativePath.startsWith('.') || relativePath === '_graph_metadata.json' || zipEntry.dir) return;

      const fileType = this.getFileType(relativePath);
      if (fileType === 'unknown') return;

      filePromises.push(
        (async () => {
          try {
            const pathParts = relativePath.split('/');
            const fileName = pathParts[pathParts.length - 1];
            const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
            const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null;
            const parentId = parentPath ? folderMap.get(parentPath) || importRootId : importRootId;
            
            const allNodes = [...existingNodes, ...importedNodes];
            const parentNode = parentId ? allNodes.find(n => n.id === parentId) : null;
            const nodeDepth = parentNode ? parentNode.depth + 1 : 0;

            if (fileType === 'markdown') {
              const content = await zipEntry.async('string');
              const parsed = this.parser.parse(content);
              
              const existingFile = this.findExistingNode(allNodes, fileNameWithoutExt, parentId, 'file');
              
              if (existingFile) {
                switch (duplicateStrategy) {
                  case 'skip':
                    result.skipped++;
                    return;
                  case 'overwrite':
                    updatedNodes.push({
                      ...existingFile,
                      content,
                      tags: parsed.tags,
                      wikilinks: parsed.wikilinks,
                    });
                    result.overwritten++;
                    return;
                  case 'merge':
                    updatedNodes.push({
                      ...existingFile,
                      content: existingFile.content + '\n\n---\n\n' + content,
                      tags: [...new Set([...existingFile.tags, ...parsed.tags])],
                      wikilinks: [...new Set([...(existingFile.wikilinks || []), ...parsed.wikilinks])],
                    });
                    result.merged++;
                    return;
                }
              }

              const uniqueName = existingFile && duplicateStrategy === 'rename'
                ? this.generateUniqueName(allNodes, fileNameWithoutExt, parentId)
                : fileNameWithoutExt;
              
              const fileNode: GraphNode = {
                id: this.generateId('file'),
                name: uniqueName,
                content,
                type: 'file',
                parentId,
                depth: nodeDepth,
                tags: parsed.tags,
                wikilinks: parsed.wikilinks,
              };

              importedNodes.push(fileNode);
              result.files++;
            } else {
              const blob = await zipEntry.async('blob');
              const dataUrl = await this.blobToDataUrl(blob);
              
              const existingMedia = this.findExistingNode(allNodes, fileNameWithoutExt, parentId, 'media');
              
              if (existingMedia) {
                switch (duplicateStrategy) {
                  case 'skip':
                  case 'merge':
                    result.skipped++;
                    return;
                  case 'overwrite':
                    updatedNodes.push({
                      ...existingMedia,
                      content: `![${fileName}](${dataUrl})`,
                      mimeType: this.getMimeType(fileName),
                      dataUrl,
                    });
                    result.overwritten++;
                    return;
                }
              }

              const uniqueName = existingMedia && duplicateStrategy === 'rename'
                ? this.generateUniqueName(allNodes, fileNameWithoutExt, parentId)
                : fileNameWithoutExt;
              
              const mediaNode: GraphNode = {
                id: this.generateId('media'),
                name: uniqueName,
                content: `![${fileName}](${dataUrl})`,
                type: 'media',
                parentId,
                depth: nodeDepth,
                tags: [fileType],
                mediaType: fileType as 'image' | 'audio' | 'video',
                mimeType: this.getMimeType(fileName),
                dataUrl,
              };

              importedNodes.push(mediaNode);
              result.media++;
            }
          } catch (error) {
            result.errors.push(`Failed to import ${relativePath}`);
          }
        })()
      );
    });

    await Promise.all(filePromises);
    result.nodes = importedNodes;
    result.updatedNodes = updatedNodes;
    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Export data based on options
   */
  async exportData(
    nodes: GraphNode[],
    options: ExportOptions
  ): Promise<Blob> {
    const zip = new JSZip();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    let nodesToExport: GraphNode[] = [];

    switch (options.type) {
      case 'vault':
        nodesToExport = nodes;
        break;
      case 'folder':
        if (options.nodeIds?.length) {
          const collectChildren = (parentId: string, collected: Set<string>) => {
            collected.add(parentId);
            nodes.forEach(n => {
              if (n.parentId === parentId) {
                collected.add(n.id);
                if (n.type === 'folder') collectChildren(n.id, collected);
              }
            });
          };
          const nodeIds = new Set<string>();
          options.nodeIds.forEach(id => collectChildren(id, nodeIds));
          nodesToExport = nodes.filter(n => nodeIds.has(n.id));
        }
        break;
      case 'files':
        if (options.nodeIds?.length) {
          nodesToExport = nodes.filter(n => options.nodeIds!.includes(n.id));
        }
        break;
      case 'media':
        nodesToExport = nodes.filter(n => n.type === 'media' || n.mediaType);
        break;
    }

    if (options.type !== 'media' && !options.includeMedia) {
      nodesToExport = nodesToExport.filter(n => n.type !== 'media' && !n.mediaType);
    }

    const getNodePath = (node: GraphNode): string => {
      const parts: string[] = [];
      let current: GraphNode | undefined = node;
      while (current) {
        parts.unshift(current.name);
        current = current.parentId ? nodeMap.get(current.parentId) : undefined;
      }
      return parts.join('/');
    };

    for (const node of nodesToExport) {
      const path = getNodePath(node);

      if (node.type === 'folder') {
        zip.folder(path);
      } else if (node.type === 'media' && node.dataUrl) {
        const ext = this.getExtensionFromMimeType(node.mimeType || '');
        const blob = await this.dataUrlToBlob(node.dataUrl);
        zip.file(`${path}${ext}`, blob);
      } else {
        const frontmatter = [
          '---',
          `id: ${node.id}`,
          `tags: [${node.tags.join(', ')}]`,
          `depth: ${node.depth}`,
          `parentId: ${node.parentId || 'null'}`,
          '---',
          '',
        ].join('\n');
        zip.file(`${path}.md`, frontmatter + node.content);
      }
    }

    zip.file('_graph_metadata.json', JSON.stringify({
      exportDate: new Date().toISOString(),
      nodeCount: nodesToExport.length,
      exportType: options.type,
    }, null, 2));

    return await zip.generateAsync({ type: 'blob' });
  }

  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return res.blob();
  }

  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
    };
    return extensions[mimeType] || '';
  }
}

export const importExportService = new ImportExportService();
