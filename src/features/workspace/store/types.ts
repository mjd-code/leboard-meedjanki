/**
 * Workspace layout model (Phase 3).
 *
 * The workspace is a tree: Split -> (Split | Group) -> Leaf.
 * A Group is a tab strip holding one or more leaves; a Leaf renders one view.
 */

export type ViewType = 'markdown' | 'graph' | 'backlinks' | 'settings' | 'empty';

export interface ViewState {
  type: ViewType;
  /** Node id for markdown / backlinks views. */
  nodeId?: string;
  title: string;
  mode?: 'source' | 'live' | 'reading';
}

export interface WorkspaceLeaf {
  kind: 'leaf';
  id: string;
  view: ViewState;
  pinned: boolean;
}

export interface WorkspaceGroup {
  kind: 'group';
  id: string;
  leaves: WorkspaceLeaf[];
  activeLeafId: string | null;
}

export interface WorkspaceSplit {
  kind: 'split';
  id: string;
  direction: 'horizontal' | 'vertical';
  children: WorkspaceNode[];
  sizes: number[];
}

export type WorkspaceNode = WorkspaceGroup | WorkspaceSplit;

export type OpenMode = 'tab' | 'split-horizontal' | 'split-vertical';
