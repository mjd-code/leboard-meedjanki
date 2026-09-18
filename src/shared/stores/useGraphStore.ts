/**
 * Graph Store - Manages graph configuration and computed stats
 * 
 * Replaces useGraphConfig hook with Zustand for consistency
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Node, Link } from './types';

// ============= TYPE DEFINITIONS =============

export interface NodeConfig {
  relSize: number;
  sizeByDepth: boolean;
  depthSizeInterval: number;
  resolution: number;
  shape: 'circle' | 'square' | 'diamond' | 'triangle' | 'hexagon';
  visible: boolean;
  opacity: number;
  autoColorBy: 'none' | 'type' | 'depth' | 'tags';
  folderColor: string;
  fileColor: string;
  selectedColor: string;
  labelField: 'name' | 'id' | 'custom';
  showLabels: boolean;
  labelSize: number;
  labelColor: string;
  labelFontStyle: 'normal' | 'bold' | 'italic' | 'bold-italic';
  labelBackground: boolean;
  labelBackgroundColor: string;
}

export interface LinkStyle {
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  opacity: number;
  width: number;
}

export interface LinkConfig {
  width: number;
  curvature: number;
  curveRotation: number;
  color: string;
  opacity: number;
  dashArray: string;
  arrowLength: number;
  arrowRelPos: number;
  showArrows: boolean;
  particles: number;
  particleSpeed: number;
  particleWidth: number;
  particleColor: string;
  showParticles: boolean;
}

export interface TopologyConfig {
  showHierarchy: boolean;
  showBacklinks: boolean;
  showTags: boolean;
  tagThreshold: number;
  styles: {
    hierarchy: LinkStyle;
    backlink: LinkStyle;
    tag: LinkStyle;
    semantic: LinkStyle;
  };
}

export interface ForceConfig {
  dagMode: 'null' | 'td' | 'bu' | 'lr' | 'rl' | 'radialin' | 'radialout';
  dagLevelDistance: number;
  alphaDecay: number;
  velocityDecay: number;
  chargeStrength: number;
  linkDistance: number;
  centerStrength: number;
  warmupTicks: number;
  cooldownTicks: number;
  cooldownTime: number;
}

export interface LinkStats {
  hierarchyCount: number;
  backlinkCount: number;
  tagCount: number;
  totalCount: number;
  topHubs: Array<{
    nodeId: string;
    nodeName: string;
    connectionCount: number;
    inDegree: number;
    outDegree: number;
  }>;
}

export interface GraphConfigState {
  nodes: NodeConfig;
  links: LinkConfig;
  topology: TopologyConfig;
  forces: ForceConfig;
}

// ============= DEFAULTS =============

export const defaultNodeConfig: NodeConfig = {
  relSize: 6,
  sizeByDepth: false,
  depthSizeInterval: 1,
  resolution: 8,
  shape: 'circle',
  visible: true,
  opacity: 1.0,
  autoColorBy: 'type',
  folderColor: 'hsl(48, 100%, 60%)',
  fileColor: 'hsl(270, 70%, 65%)',
  selectedColor: 'hsl(270, 80%, 70%)',
  labelField: 'name',
  showLabels: true,
  labelSize: 12,
  labelColor: 'hsl(0, 0%, 100%)',
  labelFontStyle: 'normal',
  labelBackground: true,
  labelBackgroundColor: 'hsl(0, 0%, 0%)',
};

export const defaultLinkConfig: LinkConfig = {
  width: 2,
  curvature: 0,
  curveRotation: 0,
  color: 'hsl(var(--primary))',
  opacity: 0.6,
  dashArray: '',
  arrowLength: 0,
  arrowRelPos: 1,
  showArrows: false,
  particles: 0,
  particleSpeed: 0.01,
  particleWidth: 4,
  particleColor: 'hsl(var(--accent))',
  showParticles: false,
};

export const defaultTopologyConfig: TopologyConfig = {
  showHierarchy: true,
  showBacklinks: true,
  showTags: true,
  tagThreshold: 1,
  styles: {
    hierarchy: {
      color: 'hsl(var(--primary))',
      lineStyle: 'solid',
      opacity: 0.8,
      width: 2.5,
    },
    backlink: {
      color: 'hsl(var(--accent))',
      lineStyle: 'dashed',
      opacity: 0.6,
      width: 2,
    },
    tag: {
      color: 'hsl(var(--secondary))',
      lineStyle: 'dotted',
      opacity: 0.4,
      width: 1.5,
    },
    semantic: {
      color: 'hsl(var(--muted-foreground))',
      lineStyle: 'dotted',
      opacity: 0.3,
      width: 1,
    },
  },
};

export const defaultForceConfig: ForceConfig = {
  dagMode: 'null',
  dagLevelDistance: 50,
  alphaDecay: 0.02,
  velocityDecay: 0.3,
  chargeStrength: -300,
  linkDistance: 100,
  centerStrength: 1,
  warmupTicks: 100,
  cooldownTicks: 100,
  cooldownTime: 15000,
};

export const defaultGraphConfig: GraphConfigState = {
  nodes: defaultNodeConfig,
  links: defaultLinkConfig,
  topology: defaultTopologyConfig,
  forces: defaultForceConfig,
};

// ============= STORE INTERFACE =============

interface GraphState {
  // Config state
  config: GraphConfigState;
  
  // Computed stats (not persisted, calculated from nodes/links)
  stats: LinkStats;
  
  // Dirty flag to track if config needs saving
  isDirty: boolean;
  
  // Actions - Config updates
  updateNodeConfig: (updates: Partial<NodeConfig>) => void;
  updateLinkConfig: (updates: Partial<LinkConfig>) => void;
  updateTopologyConfig: (updates: Partial<TopologyConfig>) => void;
  updateTopologyStyle: (linkType: keyof TopologyConfig['styles'], updates: Partial<LinkStyle>) => void;
  updateForceConfig: (updates: Partial<ForceConfig>) => void;
  
  // Actions - Full config
  setConfig: (config: GraphConfigState) => void;
  loadConfig: (config: GraphConfigState | null) => void;
  resetConfig: () => void;
  resetNodeConfig: () => void;
  resetLinkConfig: () => void;
  resetTopologyConfig: () => void;
  resetForceConfig: () => void;
  
  // Actions - Stats (computed from nodes/links)
  computeStats: (nodes: Node[], links: Link[]) => void;
  
  // Actions - Dirty flag
  markClean: () => void;
}

// ============= STORE =============

export const useGraphStore = create<GraphState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        config: defaultGraphConfig,
        stats: {
          hierarchyCount: 0,
          backlinkCount: 0,
          tagCount: 0,
          totalCount: 0,
          topHubs: [],
        },
        isDirty: false,
        
        // Config update actions
        updateNodeConfig: (updates) => set(
          (state) => ({
            config: {
              ...state.config,
              nodes: { ...state.config.nodes, ...updates },
            },
            isDirty: true,
          }),
          false,
          'updateNodeConfig'
        ),
        
        updateLinkConfig: (updates) => set(
          (state) => ({
            config: {
              ...state.config,
              links: { ...state.config.links, ...updates },
            },
            isDirty: true,
          }),
          false,
          'updateLinkConfig'
        ),
        
        updateTopologyConfig: (updates) => set(
          (state) => ({
            config: {
              ...state.config,
              topology: { ...state.config.topology, ...updates },
            },
            isDirty: true,
          }),
          false,
          'updateTopologyConfig'
        ),
        
        updateTopologyStyle: (linkType, updates) => set(
          (state) => ({
            config: {
              ...state.config,
              topology: {
                ...state.config.topology,
                styles: {
                  ...state.config.topology.styles,
                  [linkType]: { ...state.config.topology.styles[linkType], ...updates },
                },
              },
            },
            isDirty: true,
          }),
          false,
          'updateTopologyStyle'
        ),
        
        updateForceConfig: (updates) => set(
          (state) => ({
            config: {
              ...state.config,
              forces: { ...state.config.forces, ...updates },
            },
            isDirty: true,
          }),
          false,
          'updateForceConfig'
        ),
        
        // Full config actions
        setConfig: (config) => set(
          { config, isDirty: true },
          false,
          'setConfig'
        ),
        
        loadConfig: (config) => set(
          {
            config: config ? {
              ...defaultGraphConfig,
              ...config,
              nodes: { ...defaultNodeConfig, ...config.nodes },
              links: { ...defaultLinkConfig, ...config.links },
              topology: {
                ...defaultTopologyConfig,
                ...config.topology,
                styles: {
                  ...defaultTopologyConfig.styles,
                  ...config.topology?.styles,
                },
              },
              forces: { ...defaultForceConfig, ...config.forces },
            } : defaultGraphConfig,
            isDirty: false,
          },
          false,
          'loadConfig'
        ),
        
        resetConfig: () => set(
          { config: defaultGraphConfig, isDirty: true },
          false,
          'resetConfig'
        ),
        
        resetNodeConfig: () => set(
          (state) => ({
            config: { ...state.config, nodes: defaultNodeConfig },
            isDirty: true,
          }),
          false,
          'resetNodeConfig'
        ),
        
        resetLinkConfig: () => set(
          (state) => ({
            config: { ...state.config, links: defaultLinkConfig },
            isDirty: true,
          }),
          false,
          'resetLinkConfig'
        ),
        
        resetTopologyConfig: () => set(
          (state) => ({
            config: { ...state.config, topology: defaultTopologyConfig },
            isDirty: true,
          }),
          false,
          'resetTopologyConfig'
        ),
        
        resetForceConfig: () => set(
          (state) => ({
            config: { ...state.config, forces: defaultForceConfig },
            isDirty: true,
          }),
          false,
          'resetForceConfig'
        ),
        
        // Stats computation
        computeStats: (nodes, links) => {
          let hierarchyCount = 0;
          let backlinkCount = 0;
          let tagCount = 0;

          links.forEach((link) => {
            const linkType = typeof link.type === 'string' ? link.type : undefined;
            switch (linkType) {
              case 'hierarchy':
                hierarchyCount++;
                break;
              case 'backlink':
                backlinkCount++;
                break;
              case 'tag':
                tagCount++;
                break;
            }
          });

          // Calculate node degrees
          const nodeConnections = new Map<string, { inDegree: number; outDegree: number }>();
          
          nodes.forEach((node) => {
            nodeConnections.set(node.id, { inDegree: 0, outDegree: 0 });
          });

          links.forEach((link) => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            
            const sourceConn = nodeConnections.get(sourceId);
            const targetConn = nodeConnections.get(targetId);
            
            if (sourceConn) sourceConn.outDegree++;
            if (targetConn) targetConn.inDegree++;
          });

          // Get top hubs
          const topHubs = Array.from(nodeConnections.entries())
            .map(([nodeId, { inDegree, outDegree }]) => {
              const node = nodes.find((n) => n.id === nodeId);
              return {
                nodeId,
                nodeName: node?.name || 'Unknown',
                connectionCount: inDegree + outDegree,
                inDegree,
                outDegree,
              };
            })
            .filter((hub) => hub.connectionCount > 0)
            .sort((a, b) => b.connectionCount - a.connectionCount)
            .slice(0, 5);

          set(
            {
              stats: {
                hierarchyCount,
                backlinkCount,
                tagCount,
                totalCount: links.length,
                topHubs,
              },
            },
            false,
            'computeStats'
          );
        },
        
        markClean: () => set({ isDirty: false }, false, 'markClean'),
      }),
      {
        name: 'graph-config-storage',
        partialize: (state) => ({ config: state.config }),
        merge: (persisted, current) => {
          const saved = persisted as Partial<GraphState>;
          const config = saved.config;
          if (!config) return current;
          return {
            ...current,
            ...saved,
            config: {
              ...defaultGraphConfig,
              ...config,
              nodes: { ...defaultNodeConfig, ...config.nodes },
              links: { ...defaultLinkConfig, ...config.links },
              topology: {
                ...defaultTopologyConfig,
                ...config.topology,
                styles: { ...defaultTopologyConfig.styles, ...config.topology?.styles },
              },
              forces: { ...defaultForceConfig, ...config.forces },
            },
          };
        },
      }
    ),
    { name: 'GraphStore' }
  )
);
