/**
 * Workspace store — single source of truth for layout, open leaves and the
 * active leaf. Layout is persisted per vault so it survives reload.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  OpenMode,
  ViewState,
  WorkspaceGroup,
  WorkspaceLeaf,
  WorkspaceNode,
  WorkspaceSplit,
} from './types';

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const createLeaf = (view: ViewState): WorkspaceLeaf => ({
  kind: 'leaf',
  id: uid('leaf'),
  view,
  pinned: false,
});

export const createGroup = (leaves: WorkspaceLeaf[]): WorkspaceGroup => ({
  kind: 'group',
  id: uid('group'),
  leaves,
  activeLeafId: leaves[0]?.id ?? null,
});

const defaultRoot = (): WorkspaceNode =>
  createGroup([createLeaf({ type: 'graph', title: 'Graph View' })]);

/* ---------------------------------- tree ---------------------------------- */

function mapTree(node: WorkspaceNode, fn: (n: WorkspaceNode) => WorkspaceNode): WorkspaceNode {
  if (node.kind === 'split') {
    const children = node.children.map((c) => mapTree(c, fn));
    return fn({ ...node, children });
  }
  return fn(node);
}

function findGroup(node: WorkspaceNode, groupId: string): WorkspaceGroup | null {
  if (node.kind === 'group') return node.id === groupId ? node : null;
  for (const child of node.children) {
    const found = findGroup(child, groupId);
    if (found) return found;
  }
  return null;
}

export function allGroups(node: WorkspaceNode): WorkspaceGroup[] {
  if (node.kind === 'group') return [node];
  return node.children.flatMap(allGroups);
}

function findLeafGroup(
  node: WorkspaceNode,
  leafId: string
): { group: WorkspaceGroup; leaf: WorkspaceLeaf } | null {
  for (const group of allGroups(node)) {
    const leaf = group.leaves.find((l) => l.id === leafId);
    if (leaf) return { group, leaf };
  }
  return null;
}

/** Removes empty groups and collapses splits with a single child. */
function prune(node: WorkspaceNode): WorkspaceNode | null {
  if (node.kind === 'group') return node.leaves.length > 0 ? node : null;
  const children = node.children
    .map(prune)
    .filter((c): c is WorkspaceNode => c !== null);
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  const sizes = children.map(() => 100 / children.length);
  return { ...node, children, sizes };
}

function replaceNode(
  node: WorkspaceNode,
  targetId: string,
  replacement: WorkspaceNode
): WorkspaceNode {
  if (node.id === targetId) return replacement;
  if (node.kind === 'split') {
    return { ...node, children: node.children.map((c) => replaceNode(c, targetId, replacement)) };
  }
  return node;
}

/* --------------------------------- store ---------------------------------- */

interface WorkspaceState {
  vaultId: string | null;
  root: WorkspaceNode;
  activeGroupId: string | null;
  layouts: Record<string, { root: WorkspaceNode; activeGroupId: string | null }>;

  loadVaultLayout: (vaultId: string | null) => void;
  getActiveGroup: () => WorkspaceGroup | null;
  getActiveLeaf: () => WorkspaceLeaf | null;

  openView: (view: ViewState, mode?: OpenMode) => void;
  openFile: (nodeId: string, title: string, mode?: OpenMode) => void;
  closeLeaf: (leafId: string) => void;
  closeGroup: (groupId: string) => void;
  setActiveLeaf: (groupId: string, leafId: string) => void;
  setActiveGroup: (groupId: string) => void;
  togglePin: (leafId: string) => void;
  renameLeaf: (nodeId: string, title: string) => void;
  splitGroup: (groupId: string, direction: 'horizontal' | 'vertical') => void;
  setSizes: (splitId: string, sizes: number[]) => void;
  moveLeaf: (leafId: string, targetGroupId: string, index?: number) => void;
  moveLeafToNewSplit: (
    leafId: string,
    targetGroupId: string,
    direction: 'horizontal' | 'vertical',
    before: boolean
  ) => void;
  resetLayout: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => {
      const commit = (root: WorkspaceNode | null, activeGroupId?: string | null) => {
        const next = root ?? defaultRoot();
        const groups = allGroups(next);
        const active =
          activeGroupId && groups.some((g) => g.id === activeGroupId)
            ? activeGroupId
            : groups.some((g) => g.id === get().activeGroupId)
              ? get().activeGroupId
              : (groups[0]?.id ?? null);
        const { vaultId, layouts } = get();
        set({
          root: next,
          activeGroupId: active,
          layouts: vaultId
            ? { ...layouts, [vaultId]: { root: next, activeGroupId: active } }
            : layouts,
        });
      };

      const updateGroup = (
        groupId: string,
        fn: (g: WorkspaceGroup) => WorkspaceGroup
      ) => {
        const root = mapTree(get().root, (n) =>
          n.kind === 'group' && n.id === groupId ? fn(n) : n
        );
        commit(prune(root));
      };

      return {
        vaultId: null,
        root: defaultRoot(),
        activeGroupId: null,
        layouts: {},

        loadVaultLayout: (vaultId) => {
          const saved = vaultId ? get().layouts[vaultId] : undefined;
          const root = saved?.root ?? defaultRoot();
          const groups = allGroups(root);
          set({
            vaultId,
            root,
            activeGroupId:
              saved?.activeGroupId && groups.some((g) => g.id === saved.activeGroupId)
                ? saved.activeGroupId
                : (groups[0]?.id ?? null),
          });
        },

        getActiveGroup: () => {
          const { root, activeGroupId } = get();
          const groups = allGroups(root);
          return groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null;
        },

        getActiveLeaf: () => {
          const group = get().getActiveGroup();
          if (!group) return null;
          return group.leaves.find((l) => l.id === group.activeLeafId) ?? null;
        },

        openView: (view, mode = 'tab') => {
          const state = get();
          const group = state.getActiveGroup();
          if (!group) return;

          // Reuse an existing leaf showing the same thing.
          const existing = allGroups(state.root)
            .flatMap((g) => g.leaves.map((l) => ({ g, l })))
            .find(
              ({ l }) =>
                l.view.type === view.type &&
                (view.nodeId ? l.view.nodeId === view.nodeId : !l.view.nodeId)
            );
          if (existing && mode === 'tab') {
            updateGroup(existing.g.id, (g) => ({ ...g, activeLeafId: existing.l.id }));
            set({ activeGroupId: existing.g.id });
            return;
          }

          const leaf = createLeaf(view);

          if (mode === 'tab') {
            updateGroup(group.id, (g) => ({
              ...g,
              leaves: [...g.leaves, leaf],
              activeLeafId: leaf.id,
            }));
            return;
          }

          const direction = mode === 'split-vertical' ? 'vertical' : 'horizontal';
          const newGroup = createGroup([leaf]);
          const split: WorkspaceSplit = {
            kind: 'split',
            id: uid('split'),
            direction,
            children: [group, newGroup],
            sizes: [50, 50],
          };
          commit(prune(replaceNode(state.root, group.id, split)), newGroup.id);
        },

        openFile: (nodeId, title, mode = 'tab') =>
          get().openView({ type: 'markdown', nodeId, title }, mode),

        closeLeaf: (leafId) => {
          const found = findLeafGroup(get().root, leafId);
          if (!found) return;
          const { group } = found;
          const leaves = group.leaves.filter((l) => l.id !== leafId);
          const activeLeafId =
            group.activeLeafId === leafId ? (leaves[leaves.length - 1]?.id ?? null) : group.activeLeafId;
          updateGroup(group.id, (g) => ({ ...g, leaves, activeLeafId }));
        },

        closeGroup: (groupId) => {
          const root = mapTree(get().root, (n) =>
            n.kind === 'group' && n.id === groupId ? { ...n, leaves: [], activeLeafId: null } : n
          );
          commit(prune(root));
        },

        setActiveLeaf: (groupId, leafId) => {
          set({ activeGroupId: groupId });
          updateGroup(groupId, (g) => ({ ...g, activeLeafId: leafId }));
        },

        setActiveGroup: (groupId) => {
          if (findGroup(get().root, groupId)) set({ activeGroupId: groupId });
        },

        togglePin: (leafId) => {
          const found = findLeafGroup(get().root, leafId);
          if (!found) return;
          updateGroup(found.group.id, (g) => ({
            ...g,
            leaves: g.leaves.map((l) => (l.id === leafId ? { ...l, pinned: !l.pinned } : l)),
          }));
        },

        renameLeaf: (nodeId, title) => {
          const root = mapTree(get().root, (n) =>
            n.kind === 'group'
              ? {
                  ...n,
                  leaves: n.leaves.map((l) =>
                    l.view.nodeId === nodeId && l.view.title !== title
                      ? { ...l, view: { ...l.view, title } }
                      : l
                  ),
                }
              : n
          );
          commit(root);
        },

        splitGroup: (groupId, direction) => {
          const state = get();
          const group = findGroup(state.root, groupId);
          if (!group) return;
          const active = group.leaves.find((l) => l.id === group.activeLeafId);
          const leaf = createLeaf(active ? { ...active.view } : { type: 'empty', title: 'New tab' });
          const newGroup = createGroup([leaf]);
          const split: WorkspaceSplit = {
            kind: 'split',
            id: uid('split'),
            direction,
            children: [group, newGroup],
            sizes: [50, 50],
          };
          commit(prune(replaceNode(state.root, group.id, split)), newGroup.id);
        },

        setSizes: (splitId, sizes) => {
          const root = mapTree(get().root, (n) =>
            n.kind === 'split' && n.id === splitId ? { ...n, sizes } : n
          );
          commit(root);
        },

        moveLeaf: (leafId, targetGroupId, index) => {
          const state = get();
          const found = findLeafGroup(state.root, leafId);
          if (!found) return;
          const { leaf, group: source } = found;

          let root = mapTree(state.root, (n) => {
            if (n.kind !== 'group') return n;
            if (n.id === source.id) {
              const leaves = n.leaves.filter((l) => l.id !== leafId);
              return {
                ...n,
                leaves,
                activeLeafId:
                  n.activeLeafId === leafId ? (leaves[leaves.length - 1]?.id ?? null) : n.activeLeafId,
              };
            }
            return n;
          });

          root = mapTree(root, (n) => {
            if (n.kind !== 'group' || n.id !== targetGroupId) return n;
            const leaves = [...n.leaves];
            const at = index === undefined ? leaves.length : Math.max(0, Math.min(index, leaves.length));
            leaves.splice(at, 0, leaf);
            return { ...n, leaves, activeLeafId: leaf.id };
          });

          commit(prune(root), targetGroupId);
        },

        moveLeafToNewSplit: (leafId, targetGroupId, direction, before) => {
          const state = get();
          const found = findLeafGroup(state.root, leafId);
          const target = findGroup(state.root, targetGroupId);
          if (!found || !target) return;
          if (found.group.id === targetGroupId && found.group.leaves.length === 1) return;

          let root = mapTree(state.root, (n) => {
            if (n.kind !== 'group' || n.id !== found.group.id) return n;
            const leaves = n.leaves.filter((l) => l.id !== leafId);
            return {
              ...n,
              leaves,
              activeLeafId:
                n.activeLeafId === leafId ? (leaves[leaves.length - 1]?.id ?? null) : n.activeLeafId,
            };
          });

          const currentTarget = findGroup(root, targetGroupId);
          if (!currentTarget) return;
          const newGroup = createGroup([{ ...found.leaf }]);
          const split: WorkspaceSplit = {
            kind: 'split',
            id: uid('split'),
            direction,
            children: before ? [newGroup, currentTarget] : [currentTarget, newGroup],
            sizes: [50, 50],
          };
          root = replaceNode(root, targetGroupId, split);
          commit(prune(root), newGroup.id);
        },

        resetLayout: () => commit(defaultRoot()),
      };
    },
    {
      name: 'workspace-layout',
      partialize: (state) => ({ layouts: state.layouts }),
    }
  )
);
