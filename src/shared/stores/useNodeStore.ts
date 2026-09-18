/**
 * Node Store - Manages all node-related state
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { Node } from './types';

interface NodeState {
  // State
  nodes: Node[];
  selectedNode: Node | null;
  
  // Actions
  setNodes: (nodes: Node[]) => void;
  addNode: (node: Node) => void;
  updateNode: (node: Node) => void;
  deleteNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: Set<string>) => void;
  moveNode: (nodeId: string, newParentId: string | null, newDepth: number) => void;
  setSelectedNode: (node: Node | null) => void;
  
  // Computed helpers
  getNode: (nodeId: string) => Node | undefined;
  getChildren: (parentId: string | null) => Node[];
  getDescendants: (nodeId: string) => Node[];
  getNodePath: (nodeId: string) => string;
  reset: () => void;
}

const getDemoData = (): Node[] => [
  {
    id: '1',
    name: 'Projects',
    content: 'Root folder for all projects',
    type: 'folder',
    parentId: null,
    depth: 0,
    tags: ['root'],
  },
  {
    id: '2',
    name: 'Getting Started',
    content:
      'Welcome to your knowledge graph! This is a node where you can write your notes and thoughts.\n\nYou can use [[Core Concepts]] to link to other notes.\n\nAdd tags like #introduction to organize your notes.',
    type: 'file',
    parentId: '1',
    depth: 1,
    tags: ['introduction', 'guide'],
    wikilinks: ['Core Concepts'],
  },
  {
    id: '3',
    name: 'Documentation',
    content: '',
    type: 'folder',
    parentId: '1',
    depth: 1,
    tags: ['docs'],
  },
  {
    id: '4',
    name: 'Core Concepts',
    content:
      'Connect related ideas by creating links between nodes.\n\nYou can reference [[Getting Started]] or [[Best Practices]] from any note.\n\n- [ ] Task example\n- [x] Completed task',
    type: 'file',
    parentId: '3',
    depth: 2,
    tags: ['concepts', 'guide'],
    wikilinks: ['Getting Started', 'Best Practices'],
  },
  {
    id: '5',
    name: 'Best Practices',
    content:
      'Keep your notes atomic - one main idea per node works best.\n\nCheck out [[Core Concepts]] for more information.',
    type: 'file',
    parentId: '3',
    depth: 2,
    tags: ['tips', 'guide'],
    wikilinks: ['Core Concepts'],
  },
];

export const useNodeStore = create<NodeState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      nodes: getDemoData(),
      selectedNode: null,
      
      // Actions
      setNodes: (nodes) => set({ nodes }, false, 'setNodes'),
      
      addNode: (node) => set(
        (state) => ({ nodes: [...state.nodes, node] }),
        false,
        'addNode'
      ),
      
      updateNode: (updatedNode) => set(
        (state) => ({
          nodes: state.nodes.map((node) =>
            node.id === updatedNode.id ? updatedNode : node
          ),
          selectedNode: state.selectedNode?.id === updatedNode.id 
            ? updatedNode 
            : state.selectedNode,
        }),
        false,
        'updateNode'
      ),
      
      deleteNode: (nodeId) => set(
        (state) => ({
          nodes: state.nodes.filter((node) => node.id !== nodeId),
          selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode,
        }),
        false,
        'deleteNode'
      ),
      
      deleteNodes: (nodeIds) => set(
        (state) => ({
          nodes: state.nodes.filter((node) => !nodeIds.has(node.id)),
          selectedNode: state.selectedNode && nodeIds.has(state.selectedNode.id) 
            ? null 
            : state.selectedNode,
        }),
        false,
        'deleteNodes'
      ),
      
      moveNode: (nodeId, newParentId, newDepth) => set(
        (state) => {
          const node = state.nodes.find((n) => n.id === nodeId);
          if (!node) return state;
          
          const depthDiff = newDepth - node.depth;
          const descendants = get().getDescendants(nodeId);
          const descendantIds = new Set(descendants.map((d) => d.id));
          
          return {
            nodes: state.nodes.map((n) => {
              if (n.id === nodeId) {
                return { ...n, parentId: newParentId, depth: newDepth };
              }
              if (descendantIds.has(n.id)) {
                return { ...n, depth: n.depth + depthDiff };
              }
              return n;
            }),
          };
        },
        false,
        'moveNode'
      ),
      
      setSelectedNode: (node) => set({ selectedNode: node }, false, 'setSelectedNode'),
      
      // Computed helpers
      getNode: (nodeId) => get().nodes.find((n) => n.id === nodeId),
      
      getChildren: (parentId) => 
        get().nodes.filter((n) => n.parentId === parentId),
      
      getDescendants: (nodeId) => {
        const descendants: Node[] = [];
        const collectDescendants = (parentId: string) => {
          get().nodes.forEach((node) => {
            if (node.parentId === parentId) {
              descendants.push(node);
              if (node.type === 'folder') {
                collectDescendants(node.id);
              }
            }
          });
        };
        collectDescendants(nodeId);
        return descendants;
      },
      
      getNodePath: (nodeId) => {
        const nodes = get().nodes;
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return '';
        
        const pathParts: string[] = [node.name];
        let current = node;
        
        while (current.parentId) {
          const parent = nodes.find((n) => n.id === current.parentId);
          if (parent) {
            pathParts.unshift(parent.name);
            current = parent;
          } else {
            break;
          }
        }
        
        return pathParts.join(' / ');
      },
      
      reset: () => set({ nodes: getDemoData(), selectedNode: null }, false, 'reset'),
    })),
    { name: 'NodeStore' }
  )
);
