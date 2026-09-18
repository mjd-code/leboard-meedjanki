/**
 * Shared types for Zustand stores
 */

export interface Node {
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

export interface Link {
  source: string | Node;
  target: string | Node;
  type?: 'hierarchy' | 'tag' | 'backlink' | 'semantic';
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface Backlink {
  nodeId: string;
  nodeName: string;
  nodePath?: string;
  isWikilink: boolean;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
