# VaultGraph Philosophy & Technical Manifesto

> *"Your notes are yours. Your tools should be too."*
> — Inspired by Obsidian's Core Philosophy

---

## 🌟 Vision Statement

VaultGraph aspires to be the **open, extensible, local-first knowledge graph** for the modern web. We believe in:

- **Data Sovereignty**: Your notes live where you choose—browser, filesystem, or cloud
- **Extensibility as Core**: Every feature should be a plugin that happens to ship by default
- **Graph-Native Thinking**: Connections are first-class citizens, not afterthoughts
- **Progressive Enhancement**: Works offline, syncs when connected, never loses data

---

## 📊 Current Stack Analysis

### Technology Tree

```
VaultGraph/
├── 🏗️ BUILD SYSTEM
│   ├── Vite 5.x ─────────────── Fast HMR, ESBuild bundling
│   ├── TypeScript 5.x ───────── Type safety (currently loose)
│   └── vite-plugin-pwa ──────── Service worker, installability
│
├── 🎨 UI LAYER
│   ├── React 18.3 ───────────── Concurrent rendering ready
│   ├── Tailwind CSS 3.x ─────── Utility-first styling
│   ├── shadcn/ui ────────────── Radix primitives + variants
│   ├── Lucide Icons ─────────── Consistent iconography
│   └── Framer Motion ────────── (NOT INSTALLED - gap)
│
├── 📈 DATA VISUALIZATION
│   ├── react-force-graph-2d ─── Force-directed graph engine
│   ├── Recharts ─────────────── Analytics charts
│   └── Three.js ─────────────── 3D potential (underutilized)
│
├── 🔄 STATE MANAGEMENT
│   ├── React Context ─────────── Theme, Auth, Vault
│   ├── TanStack Query ────────── Server state caching
│   ├── useState Silos ────────── Local component state (PROBLEM)
│   └── Zustand ───────────────── (NOT INSTALLED - critical gap)
│
├── 📝 CONTENT PROCESSING
│   ├── react-markdown ────────── Markdown rendering
│   ├── remark-gfm ────────────── GitHub Flavored Markdown
│   ├── rehype-raw ────────────── HTML passthrough
│   └── Custom Parser ─────────── Wikilinks, tags, mentions
│
├── 💾 PERSISTENCE LAYER
│   ├── IndexedDB ─────────────── Local vault storage
│   ├── Supabase ──────────────── Cloud sync + auth
│   ├── File System API ───────── Native folder access
│   └── JSZip ─────────────────── Import/export archives
│
└── 🔌 EVENT SYSTEM
    └── DomainEvents.ts ───────── Pub/Sub (UNDERUTILIZED)
```

### Dependency Health Ratings

| Category | Package | Version | Health | Notes |
|----------|---------|---------|--------|-------|
| Core | react | 18.3.1 | 🟢 A | Latest stable |
| Core | typescript | 5.x | 🟡 B | Strict mode disabled |
| UI | tailwindcss | 3.x | 🟢 A | v4 migration pending |
| UI | @radix-ui/* | Latest | 🟢 A | Excellent a11y |
| Graph | react-force-graph-2d | 1.29.0 | 🟢 A | Active maintenance |
| State | @tanstack/react-query | 5.83.0 | 🟢 A | Server state only |
| Backend | @supabase/supabase-js | 2.86.2 | 🟢 A | Well integrated |
| Editor | (none) | - | 🔴 F | Critical gap |
| Testing | (none) | - | 🔴 F | No test framework |

---

## 🎯 Obsidian Philosophy Alignment

### Scoring Methodology

We measure alignment against Obsidian's 7 core principles:

| Principle | Score | Evidence |
|-----------|-------|----------|
| **Local-First** | 8/10 | IndexedDB + FileSystem API, works offline |
| **Plain Text** | 6/10 | Markdown storage, but not true .md files |
| **Link as First-Class** | 9/10 | Wikilinks, backlinks, graph visualization |
| **Graph Thinking** | 9/10 | Force-directed graph is central feature |
| **Extensibility** | 3/10 | No plugin API, hardcoded features |
| **Customization** | 5/10 | Theme support, but limited configuration |
| **Future-Proof** | 7/10 | Open formats, exportable data |

### Overall Alignment: 64%

```
Obsidian Parity Meter
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░] 64%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Strong: Graph, Links, Local    |    Weak: Plugins, Editor, Files
```

### Principle Deep-Dive

#### ✅ What We Do Well

1. **Graph-Native Architecture**
   - Force-directed visualization with configurable physics
   - Real-time backlink detection and display
   - Automatic relationship inference from content

2. **Multi-Storage Strategy**
   - Memory (ephemeral), Cloud (Supabase), FileSystem (native)
   - User chooses per-vault storage strategy
   - Offline-capable with sync when connected

3. **Content Linking**
   - `[[Wikilinks]]` parsed and rendered
   - `#tags` extracted and searchable
   - `@mentions` for future collaboration

#### ❌ Where We Fall Short

1. **No Plugin Architecture**
   - Features are hardcoded, not registrable
   - No way for users to extend functionality
   - No command palette or hotkey system

2. **Monolithic State Management**
   - `Index.tsx` has 700+ lines, 12 useState hooks
   - No centralized store for cross-component sync
   - Prop drilling throughout component tree

3. **Not True Files**
   - Notes stored in IndexedDB/Supabase, not `.md` files
   - FileSystem mode exists but underutilized
   - Can't use external editors on vault files

---

## 🔮 Extensibility Vision

### The Observable Vault Hub

Our vision is to transform VaultGraph into an **observable, event-driven hub** where every operation emits events that plugins can intercept, modify, or react to.

```
┌─────────────────────────────────────────────────────────────────┐
│                    VAULTGRAPH PLUGIN ARCHITECTURE               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Ribbon    │    │    Panel    │    │   Editor    │         │
│  │   Plugins   │    │   Plugins   │    │   Plugins   │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   PLUGIN REGISTRY                        │   │
│  │  • registerRibbonItem(icon, action)                     │   │
│  │  • registerPanelView(id, component)                     │   │
│  │  • registerEditorExtension(extension)                   │   │
│  │  • registerCommand(id, name, callback)                  │   │
│  │  • registerMarkdownPostProcessor(processor)             │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    EVENT BUS (Observable)                │   │
│  │                                                          │   │
│  │   vault:created ──► node:created ──► node:updated       │   │
│  │         │                │                 │             │   │
│  │         ▼                ▼                 ▼             │   │
│  │   vault:switched    node:deleted     link:created       │   │
│  │         │                │                 │             │   │
│  │         ▼                ▼                 ▼             │   │
│  │   vault:saved      graph:updated     sync:completed     │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   VAULT STORE (Zustand)                  │   │
│  │                                                          │   │
│  │   state: { nodes, links, activeNode, graphConfig }      │   │
│  │   actions: { addNode, updateNode, deleteNode, ... }     │   │
│  │   selectors: { getNodeById, getBacklinks, ... }         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Plugin Type Registry Vision

```typescript
// Future API - The Dream
interface PluginRegistry {
  // UI Registration
  registerRibbonItem(item: RibbonItem): void;
  registerStatusBarItem(item: StatusBarItem): void;
  registerPanelView(view: PanelView): void;
  registerSettingsTab(tab: SettingsTab): void;
  
  // Editor Extensions
  registerEditorExtension(ext: EditorExtension): void;
  registerMarkdownPostProcessor(processor: PostProcessor): void;
  registerCodeBlockProcessor(lang: string, processor: CodeBlockProcessor): void;
  
  // Commands & Hotkeys
  registerCommand(command: Command): void;
  registerHotkey(hotkey: Hotkey): void;
  
  // Event Hooks
  on(event: VaultEvent, handler: EventHandler): void;
  off(event: VaultEvent, handler: EventHandler): void;
  
  // Storage
  loadData<T>(): Promise<T>;
  saveData<T>(data: T): Promise<void>;
}
```

---

## 🗺️ Gaps & Roadmap

### Critical Gaps

| Gap | Severity | Impact | Effort |
|-----|----------|--------|--------|
| No Plugin Architecture | 🔴 Critical | Blocks extensibility | High |
| Monolithic Index.tsx | 🔴 Critical | Unmaintainable | Medium |
| TypeScript Loose Mode | 🟠 High | Runtime errors | Medium |
| No Rich Editor | 🟠 High | Poor editing UX | High |
| Underutilized Events | 🟠 High | Missed reactivity | Low |
| No Testing Framework | 🟠 High | Regression risk | Medium |
| No Command Palette | 🟡 Medium | Power user gap | Low |
| No Hotkey System | 🟡 Medium | Efficiency gap | Low |

### 4-Phase Roadmap

```
Phase 1: FOUNDATION STRENGTHENING (Weeks 1-2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
├── Enable TypeScript strict mode gradually
├── Add Zustand for centralized state
├── Activate DomainEvents throughout codebase
├── Add Vitest + React Testing Library
└── Milestone: Clean, typed, tested foundation

Phase 2: MODULARIZATION (Weeks 3-4)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
├── Extract Index.tsx into focused hooks
│   ├── useNodeOperations
│   ├── useGraphState
│   ├── useVaultSync
│   └── useUndoRedo
├── Refactor SidebarPanel into composable parts
├── Create proper component boundaries
└── Milestone: <200 lines per file average

Phase 3: PLUGIN FOUNDATION (Weeks 5-8)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
├── Design PluginRegistry interface
├── Make IconRibbon items registrable
├── Add Command Palette (Ctrl+P)
├── Implement hotkey registration system
├── Convert existing features to "core plugins"
└── Milestone: First community plugin possible

Phase 4: POWER FEATURES (Weeks 9-12)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
├── Integrate CodeMirror 6 as editor
├── Add real-time collaboration (Y.js)
├── Implement canvas/whiteboard view
├── Build marketplace for community plugins
└── Milestone: Feature parity with Obsidian core
```

---

## 🧪 God-Tier Experiments

### Experiment 1: Event Pulse Prototype

**Goal**: Prove that activating DomainEvents creates reactive UI updates

```typescript
// src/services/events/DomainEvents.ts - Already exists, needs activation!

// Step 1: Emit events from VaultManager on every operation
// In VaultManager.ts, after successful node update:
import { DomainEvents } from '../events/DomainEvents';

async updateNode(vaultId: string, node: GraphNode): Promise<void> {
  // ... existing update logic ...
  
  // NEW: Emit event for reactive listeners
  DomainEvents.emit('node:updated', {
    vaultId,
    nodeId: node.id,
    node,
    timestamp: Date.now()
  });
}

// Step 2: Subscribe in NetworkGraph for auto-refresh
// In NetworkGraph.tsx:
useEffect(() => {
  const unsubscribe = DomainEvents.subscribe('node:updated', (payload) => {
    if (payload.vaultId === activeVaultId) {
      // Graph automatically updates without prop drilling!
      console.log('🔄 Graph received node update:', payload.nodeId);
    }
  });
  
  return () => unsubscribe();
}, [activeVaultId]);
```

**Success Criteria**: Node updates in one component reflect in graph without prop passing

---

### Experiment 2: Zustand Store Spike

**Goal**: Replace useState silos with centralized, observable state

```typescript
// src/stores/useVaultStore.ts - NEW FILE

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface VaultState {
  // State
  nodes: GraphNode[];
  links: GraphLink[];
  activeNodeId: string | null;
  selectedNodes: Set<string>;
  
  // Actions
  addNode: (node: GraphNode) => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  deleteNode: (id: string) => void;
  setActiveNode: (id: string | null) => void;
  
  // Selectors (computed)
  getNodeById: (id: string) => GraphNode | undefined;
  getBacklinks: (nodeId: string) => GraphLink[];
}

export const useVaultStore = create<VaultState>()(
  subscribeWithSelector((set, get) => ({
    nodes: [],
    links: [],
    activeNodeId: null,
    selectedNodes: new Set(),
    
    addNode: (node) => set((state) => ({
      nodes: [...state.nodes, node]
    })),
    
    updateNode: (id, updates) => set((state) => ({
      nodes: state.nodes.map(n => 
        n.id === id ? { ...n, ...updates } : n
      )
    })),
    
    deleteNode: (id) => set((state) => ({
      nodes: state.nodes.filter(n => n.id !== id),
      links: state.links.filter(l => 
        l.source !== id && l.target !== id
      ),
      activeNodeId: state.activeNodeId === id ? null : state.activeNodeId
    })),
    
    setActiveNode: (id) => set({ activeNodeId: id }),
    
    getNodeById: (id) => get().nodes.find(n => n.id === id),
    
    getBacklinks: (nodeId) => get().links.filter(l => 
      l.target === nodeId
    )
  }))
);

// Usage in components - replaces 12 useState calls!
function NodePanel() {
  const activeNode = useVaultStore(state => 
    state.nodes.find(n => n.id === state.activeNodeId)
  );
  const updateNode = useVaultStore(state => state.updateNode);
  
  // Component automatically re-renders when activeNode changes
}
```

**Success Criteria**: `Index.tsx` reduced from 700 to <200 lines

---

### Experiment 3: Dynamic Ribbon Registration

**Goal**: Allow plugins to add icons to the ribbon dynamically

```typescript
// src/services/plugins/RibbonRegistry.ts - NEW FILE

interface RibbonItem {
  id: string;
  icon: LucideIcon;
  tooltip: string;
  onClick: () => void;
  order?: number;
}

class RibbonRegistry {
  private items: Map<string, RibbonItem> = new Map();
  private listeners: Set<() => void> = new Set();
  
  register(item: RibbonItem): () => void {
    this.items.set(item.id, item);
    this.notify();
    
    // Return unregister function
    return () => {
      this.items.delete(item.id);
      this.notify();
    };
  }
  
  getItems(): RibbonItem[] {
    return Array.from(this.items.values())
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }
  
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify(): void {
    this.listeners.forEach(l => l());
  }
}

export const ribbonRegistry = new RibbonRegistry();

// Usage - Core features register themselves:
ribbonRegistry.register({
  id: 'graph-view',
  icon: Network,
  tooltip: 'Graph View',
  onClick: () => switchToGraphView(),
  order: 10
});

// Plugin can add its own:
ribbonRegistry.register({
  id: 'my-plugin-action',
  icon: Sparkles,
  tooltip: 'My Plugin',
  onClick: () => myPluginAction(),
  order: 50
});
```

**Success Criteria**: New ribbon icons appear without modifying IconRibbon.tsx

---

### Experiment 4: Command Palette Prototype

**Goal**: Implement Obsidian-style Ctrl+P command palette

```typescript
// src/components/CommandPalette.tsx - NEW FILE

import { Command } from 'cmdk'; // Already have cmdk installed!

interface CommandItem {
  id: string;
  name: string;
  description?: string;
  icon?: LucideIcon;
  shortcut?: string;
  action: () => void;
}

const commandRegistry = new Map<string, CommandItem>();

// Register commands from anywhere
export function registerCommand(command: CommandItem) {
  commandRegistry.set(command.id, command);
}

// Core commands registered at startup
registerCommand({
  id: 'node:create',
  name: 'Create new node',
  icon: Plus,
  shortcut: 'Ctrl+N',
  action: () => vaultStore.getState().addNode(createEmptyNode())
});

registerCommand({
  id: 'graph:center',
  name: 'Center graph view',
  icon: Crosshair,
  action: () => graphRef.current?.centerAt(0, 0, 500)
});

registerCommand({
  id: 'vault:switch',
  name: 'Switch vault',
  icon: FolderOpen,
  shortcut: 'Ctrl+O',
  action: () => openVaultSwitcher()
});

// Component
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  
  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input placeholder="Type a command..." />
      <Command.List>
        {Array.from(commandRegistry.values()).map(cmd => (
          <Command.Item
            key={cmd.id}
            onSelect={() => {
              cmd.action();
              setOpen(false);
            }}
          >
            {cmd.icon && <cmd.icon className="w-4 h-4 mr-2" />}
            <span>{cmd.name}</span>
            {cmd.shortcut && (
              <span className="ml-auto text-muted-foreground text-xs">
                {cmd.shortcut}
              </span>
            )}
          </Command.Item>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
```

**Success Criteria**: Ctrl+P opens palette, commands are searchable and executable

---

### Experiment 5: File-Based Node Persistence

**Goal**: Prove nodes can be stored as true `.md` files

```typescript
// src/services/persistence/FileNodeService.ts - NEW FILE

export class FileNodeService {
  private dirHandle: FileSystemDirectoryHandle | null = null;
  
  async initialize(): Promise<boolean> {
    try {
      this.dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      return true;
    } catch {
      return false;
    }
  }
  
  async saveNode(node: GraphNode): Promise<void> {
    if (!this.dirHandle) throw new Error('No directory selected');
    
    const fileName = `${this.sanitizeFileName(node.name)}.md`;
    const content = this.nodeToMarkdown(node);
    
    const fileHandle = await this.dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    
    DomainEvents.emit('node:file-saved', { nodeId: node.id, fileName });
  }
  
  private nodeToMarkdown(node: GraphNode): string {
    // YAML frontmatter + content
    return `---
id: ${node.id}
created: ${node.createdAt}
modified: ${node.updatedAt}
tags: [${(node.tags || []).join(', ')}]
---

${node.content || ''}
`;
  }
  
  async loadVault(): Promise<GraphNode[]> {
    if (!this.dirHandle) throw new Error('No directory selected');
    
    const nodes: GraphNode[] = [];
    
    for await (const entry of this.dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        const file = await entry.getFile();
        const content = await file.text();
        const node = this.markdownToNode(content, entry.name);
        nodes.push(node);
      }
    }
    
    return nodes;
  }
  
  private markdownToNode(content: string, fileName: string): GraphNode {
    // Parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (frontmatterMatch) {
      const [, yaml, body] = frontmatterMatch;
      const metadata = this.parseYaml(yaml);
      
      return {
        id: metadata.id || crypto.randomUUID(),
        name: fileName.replace('.md', ''),
        content: body.trim(),
        tags: metadata.tags || [],
        createdAt: metadata.created || Date.now(),
        updatedAt: metadata.modified || Date.now()
      };
    }
    
    return {
      id: crypto.randomUUID(),
      name: fileName.replace('.md', ''),
      content: content,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
}
```

**Success Criteria**: Vault opens a real folder, edits sync to .md files

---

## 📈 Success Metrics Dashboard

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Index.tsx Lines | 711 | <200 | Phase 2 |
| useState Hooks in Index | 12 | 0 | Phase 2 |
| TypeScript Strictness | 3/10 | 9/10 | Phase 1 |
| Test Coverage | 0% | 70% | Phase 2 |
| Obsidian Parity Score | 64% | 85% | Phase 4 |
| Plugin API Surface | 0 | 20+ hooks | Phase 3 |
| Bundle Size | ~500KB | <400KB | Ongoing |
| Lighthouse PWA Score | 90 | 100 | Phase 1 |

---

## 📜 Manifesto Closing

VaultGraph stands at an inflection point. We have built a solid foundation—a beautiful graph interface, multi-storage architecture, and offline-first capabilities. But to truly embody the spirit of tools like Obsidian, we must embrace **radical extensibility**.

The path forward is clear:

1. **Observe Everything**: Every action emits an event
2. **Register Everything**: Every feature is a plugin
3. **Store Centrally**: One source of truth, many subscribers
4. **Type Strictly**: Catch errors at compile time
5. **Test Thoroughly**: Confidence enables velocity

> *"The best tools are the ones that disappear—they become extensions of your thought process, not obstacles to it."*

Let us build that tool.

---

*This document is a living manifesto. Update it as the architecture evolves.*

**Last Updated**: December 2024  
**Authors**: VaultGraph Core Team  
**Version**: 1.0.0
