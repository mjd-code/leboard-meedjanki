/**
 * UI Store - Manages UI-related state across the app
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Align with RibbonTool from IconRibbon
export type ActiveTool = 'files' | 'graph' | 'editor' | 'import-export' | 'settings' | 'account' | 'vaults' | null;
export type EditorViewMode = 'source' | 'preview' | 'split';
export type EditorLayoutMode = 'wide' | 'narrow';

interface Tab {
  id: string;
  title: string;
  type: 'graph' | 'editor';
  nodeId?: string;
}

interface UIState {
  // Sidebar
  activeTool: ActiveTool;
  sidebarOpen: boolean;
  
  // Tabs
  tabs: Tab[];
  activeTabId: string;
  
  // Editor
  editorViewMode: EditorViewMode;
  editorLayoutMode: EditorLayoutMode;
  
  // Actions - Sidebar
  setActiveTool: (tool: ActiveTool) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Actions - Tabs
  setTabs: (tabs: Tab[]) => void;
  addTab: (tab: Tab) => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  setActiveTabId: (tabId: string) => void;
  
  // Actions - Editor
  setEditorViewMode: (mode: EditorViewMode) => void;
  setEditorLayoutMode: (mode: EditorLayoutMode) => void;
  
  // Reset
  reset: () => void;
}

const defaultTabs: Tab[] = [
  { id: 'graph-main', title: 'Graph View', type: 'graph' },
];

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        activeTool: null,
        sidebarOpen: false,
        tabs: defaultTabs,
        activeTabId: 'graph-main',
        editorViewMode: 'source',
        editorLayoutMode: 'narrow',
        
        // Actions - Sidebar
        setActiveTool: (tool) => set(
          { activeTool: tool, sidebarOpen: tool !== null },
          false,
          'setActiveTool'
        ),
        
        toggleSidebar: () => set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          false,
          'toggleSidebar'
        ),
        
        setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),
        
        // Actions - Tabs
        setTabs: (tabs) => set({ tabs }, false, 'setTabs'),
        
        addTab: (tab) => set(
          (state) => {
            // Check if tab already exists
            const existingTab = state.tabs.find(
              (t) => t.type === tab.type && t.nodeId === tab.nodeId
            );
            if (existingTab) {
              return { activeTabId: existingTab.id };
            }
            return { tabs: [...state.tabs, tab], activeTabId: tab.id };
          },
          false,
          'addTab'
        ),
        
        removeTab: (tabId) => set(
          (state) => {
            const newTabs = state.tabs.filter((t) => t.id !== tabId);
            let newActiveId = state.activeTabId;
            
            if (state.activeTabId === tabId && newTabs.length > 0) {
              const removedIndex = state.tabs.findIndex((t) => t.id === tabId);
              newActiveId = newTabs[Math.max(0, removedIndex - 1)]?.id || newTabs[0].id;
            }
            
            return { tabs: newTabs, activeTabId: newActiveId };
          },
          false,
          'removeTab'
        ),
        
        updateTab: (tabId, updates) => set(
          (state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === tabId ? { ...tab, ...updates } : tab
            ),
          }),
          false,
          'updateTab'
        ),
        
        setActiveTabId: (tabId) => set({ activeTabId: tabId }, false, 'setActiveTabId'),
        
        // Actions - Editor
        setEditorViewMode: (mode) => set(
          { editorViewMode: mode },
          false,
          'setEditorViewMode'
        ),
        
        setEditorLayoutMode: (mode) => set(
          { editorLayoutMode: mode },
          false,
          'setEditorLayoutMode'
        ),
        
        // Reset
        reset: () => set({
          activeTool: null,
          sidebarOpen: false,
          tabs: defaultTabs,
          activeTabId: 'graph-main',
          editorViewMode: 'source',
          editorLayoutMode: 'narrow',
        }, false, 'reset'),
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          editorViewMode: state.editorViewMode,
          editorLayoutMode: state.editorLayoutMode,
        }),
      }
    ),
    { name: 'UIStore' }
  )
);
