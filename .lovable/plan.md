# PLAN.md — Obsidian-grade Knowledge Base: Architecture Blueprint

On approval this document is written to `PLAN.md` at the project root and Phase 1 begins.

## 1. Executive Summary & GAP Analysis

Current state (verified): 154 source files, ~25.7K lines. Vite + React 18 + TS + Tailwind/shadcn + Zustand (6 stores) + Lovable Cloud. Graph rendering via `react-force-graph-2d` (Canvas, D3-force under the hood). Markdown editing is a plain `<Textarea>` inside `NodePanel.tsx` with `react-markdown` for display. No CodeMirror, no metadata cache, no workspace model.

Identified smells and risks:

| Area | Finding | Evidence |
|---|---|---|
| Monoliths | 5 files over 550 lines mixing UI + logic | `NetworkGraph.tsx` 860, `NodePanel.tsx` 760, `ImportExportService.ts` 735, `VaultManager.ts` 597, `Index.tsx` 553 (45 hook calls) |
| Duplicates | Two toast hooks; two Supabase client + types dirs | `components/ui/use-toast.ts` + `components/core/ui/use-toast.ts` -> `core/hooks/useToast.ts`; `src/integrations/supabase/*` and `src/services/integrations/supabase/*` (3 services import the non-canonical copy) |
| Dead DI | `container.ts` defines 13 `ServiceIds` but zero `register`/`resolve` calls exist; `plugin-registry.ts` (378 lines) has no consumer outside `services/core` | grep results |
| God object | `VaultManager` owns vault CRUD, undo/redo, graph config, backups, auto-backup timers, cloud ids | 30 public methods |
| Parser duplication | `content-parser.ts` and `markdown-parser.ts` both export `ParsedContent`; regex-based, no incremental parsing | `services/content/*` |
| Store shape | `useGraphStore` (464 lines) holds config + stats + actions in one flat object; consumers select whole objects, causing re-render storms | store files |
| Layout | `UnifiedLayout` + `DesktopLayout` + `MobileLayout` + `WorkspaceTabs` implement a single-pane tab strip with prop drilling (20+ props); no split/leaf model | `layout/*` |
| Loops | Bidirectional sync selectedNode <-> activeTab in `UnifiedLayout` guarded by a ref (fragile) | `UnifiedLayout.tsx` L106-142 |
| Stale FSD | `.cursor/plans` migration was never applied; `src/features` does not exist | filesystem |

Refactoring priorities: (1) kill duplicates and wire DI, (2) split god objects into Vault/MetadataCache/FileManager, (3) replace Textarea with CodeMirror 6, (4) formal Workspace model, (5) graph scale-up.

## 2. Target System Architecture

```text
+--------------------+     +---------------------+     +----------------------+
|   Storage Adapters |     |     Vault Core      |     |    MetadataCache     |
| FileSystemAdapter  |<--->| Vault (TFile/TFolder|---->| links/backlinks/tags |
| IndexedDBAdapter   |     |  read/modify/rename)|     | frontmatter/headings |
| CloudAdapter(Supa) |     +----------+----------+     | (Web Worker parser)  |
+--------------------+                |                +----------+-----------+
        ^                             | emits                     | resolves
        | SyncEngine                  v                           v
+-------+-----------+       +---------+----------+     +----------+-----------+
| BackgroundSync    |       |      EventBus      |<----|     FileManager      |
| conflict/backups  |       | typed domain events|     | rename + link refac  |
+-------------------+       +---------+----------+     +----------------------+
                                      |
              +-----------------------+-----------------------+
              v                       v                       v
      +---------------+      +----------------+      +-----------------+
      | Editor Engine |      |  Graph Engine  |      |  Command/Suggest|
      | CM6 + Lezer   |      | worker d3-force|      | palette, [[ # . |
      | MarkdownView  |      | Pixi/Canvas    |      +-----------------+
      +-------+-------+      +-------+--------+
              \                      /
               v                    v
          +----------------------------------+
          |  Workspace (root) -> Split -> Leaf|
          |  Ribbon | Leaves | StatusBar      |
          +----------------------------------+
```

## 3. Target File & Folder Blueprint

```text
src/
  app/                      App.tsx, routes.tsx, providers.tsx, bootstrap.ts (DI wiring)
  shared/
    ui/                     shadcn primitives (single copy)
    lib/                    cn, color-utils, fuzzy.ts, debounce
    hooks/                  useToast (ONLY copy), useMobile
    events/                 event-bus.ts, event-types.ts
    di/                     container.ts, service-ids.ts
    integrations/supabase/  re-exports @/integrations/supabase/client (auto-gen stays put)
  core/
    vault/                  Vault.ts, TFile.ts, adapters/{FileSystem,IndexedDB,Cloud}Adapter.ts
    metadata/               MetadataCache.ts, parser.worker.ts, LinkResolver.ts
    file-manager/           FileManager.ts (rename + wikilink refactor + orphans)
    history/                VaultHistory.ts (from VaultManager)
    backup/                 BackupService.ts (from VaultManager)
    sync/                   SyncEngine.ts, BackgroundSyncService.ts
    commands/               CommandRegistry.ts
    plugins/                PluginRegistry.ts, Feature.ts
  features/
    editor/                 MarkdownView.tsx, cm/{state,extensions,decorations,suggest}/, frontmatter/, toolbar/
    workspace/              Workspace.ts (store), WorkspaceRoot.tsx, Leaf.tsx, Split.tsx, Ribbon.tsx, StatusBar.tsx
    graph/                  GraphView.tsx, engine/{ForceWorker.ts,Renderer.ts}, config-panel/, store/
    backlinks/              BacklinksView.tsx, UnlinkedMentions.tsx
    command-palette/        CommandPalette.tsx (cmdk)
    vault-dashboard/        pages + cards + mode selector
    auth/  profile/  import-export/  pwa/
  pages/                    thin route wrappers only
```

Moves (examples): `services/vault/VaultManager.ts` -> split into `core/vault/Vault.ts`, `core/history/`, `core/backup/`; `components/graph/NodePanel.tsx` -> `features/editor/MarkdownView.tsx` + `features/editor/frontmatter/PropertiesPanel.tsx`; `components/core/layout/*` -> `features/workspace/*`; `services/content/*` -> `core/metadata/`; `services/ui/stores/*` -> co-located `store/` per feature. Delete: `components/ui/use-toast.ts`, `services/integrations/supabase/*`, `services/core/features.ts` (fold into `core/plugins`).

## 4. Phased Roadmap

### Phase 1 — Core Architecture & Vault Cleanup
Tasks
- Create `shared/`, `core/`, `features/`, `app/`; move files with import rewrites (`@/shared/*`, `@/core/*`, `@/features/*` aliases in tsconfig + vite).
- Delete duplicate toast hook and duplicate Supabase dir; all services import `@/integrations/supabase/client`.
- Wire DI: `app/bootstrap.ts` registers Vault, MetadataCache, FileManager, SyncEngine, CommandRegistry, EventBus in `container`; React reads via `useService(id)` hook.
- Split `VaultManager` into `Vault` (CRUD + adapters), `VaultHistory`, `BackupService`; expose `VaultRegistry` for multi-vault switching.
- Slice stores: `useGraphStore` -> `nodeStyleSlice`, `linkStyleSlice`, `forceSlice`, `statsSlice` combined with `create()(...)`; add `useShallow` selectors; add `subscribeWithSelector` for service-side listeners.
- Remove selectedNode<->tab loop by making `Workspace` the single source of truth (Phase 3 completes this; Phase 1 removes the ref hack by deriving selection from active leaf).
Files affected: all of `services/*`, `components/core/*`, `pages/*`, `App.tsx`, `tsconfig.*`, `vite.config.ts`.
Acceptance: build + typecheck green; zero imports from deleted paths; `container.getRegisteredServices().length >= 6`; no "Maximum update depth" in console across /app, /vaults, /profile.

### Phase 2 — CodeMirror 6 Editor Engine
Tasks
- Add deps: `@codemirror/state`, `@codemirror/view`, `@codemirror/language`, `@codemirror/lang-markdown`, `@codemirror/autocomplete`, `@codemirror/commands`, `@codemirror/search`, `@lezer/markdown`, `@lezer/highlight`, `yaml`, `katex`, `mermaid`.
- `features/editor/cm/state/`: `createEditorState(doc, extensions)`, `EditorApi` (getSelection, replaceRange, posToOffset, getLine).
- `features/editor/cm/extensions/`: `livePreview.ts` (ViewPlugin that hides syntax marks outside the cursor line via Decoration.replace + Widget for checkboxes/images/embeds), `frontmatterField.ts` (StateField parsing YAML block, exposes typed properties), `wordCountField.ts`, `wikilinkField.ts` (emits link-trigger events), `callouts.ts`, `mathBlocks.ts` (KaTeX widget), `tables.ts`.
- `MarkdownView.tsx`: mode switcher `source | live | reading`; reading mode renders via `MarkdownPostProcessor` pipeline (AST -> DOM: mermaid, katex, tables, wikilinks). Reuses `react-markdown` only in reading mode until pipeline replaces it.
- `features/editor/suggest/`: `EditorSuggest` abstract + `WikilinkSuggest` (`[[`), `TagSuggest` (`#`), `PropertySuggest` (`.` in frontmatter); fuzzy index from `MetadataCache` with ranking = fuzzy score + recency boost + link-distance boost.
- Toolbar + context menu commands: headings 1-6, bold/italic/strike/highlight, lists/task list, blockquote, callout, table, hr, code block, `$..$` / `$$..$$`, footnote, internal link.
- `features/editor/frontmatter/PropertiesPanel.tsx`: typed inputs (text, number, date, tags multi-select, checkbox) writing back through `EditorApi`.
- Command palette (`Ctrl/Cmd+P`) via `cmdk` backed by `CommandRegistry`.
Files affected: replace editor portion of `NodePanel.tsx`; new `features/editor/**`; `core/commands/`.
Acceptance: typing 50K-char note stays under 16ms/keystroke (Performance panel); toggling live/reading keeps cursor; `[[` shows ranked suggestions under 50ms; frontmatter edits round-trip without reformatting body; all toolbar commands have palette entries.

### Phase 3 — Workspace & Layout System
Tasks
- `features/workspace/Workspace.ts` Zustand store: tree of `WorkspaceSplit { direction, children, sizes }` and `WorkspaceLeaf { id, viewType, state, pinned }`; actions `openFile`, `splitLeaf`, `closeLeaf`, `setActiveLeaf`, `moveLeaf`, `serialize/deserialize` (persist per vault).
- `ViewRegistry`: maps `viewType` -> lazy component (`markdown`, `graph`, `backlinks`, `settings`, `empty`).
- `Split.tsx` on `react-resizable-panels`; `Leaf.tsx` with tab strip, drag-to-reorder and drag-to-split (dnd-kit); `Ribbon.tsx` (vault switcher, graph toggle, quick actions, plugin-contributed icons); `StatusBar.tsx` (word count from editor StateField, sync state from `useOfflineStore`/SyncEngine, active file path, PWA offline badge).
- Mobile: same tree, rendered as stacked leaves with a drawer ribbon.
- Delete `UnifiedLayout`, `DesktopLayout`, `MobileLayout`, `WorkspaceTabs`, `WorkspacePane`.
Files affected: `components/core/layout/**` (removed), `pages/Index.tsx` (becomes `<WorkspaceRoot/>`), `IconRibbon.tsx`.
Acceptance: split horizontally/vertically, drag tabs across leaves, layout survives reload per vault, no prop drilling deeper than 2 levels, `Index.tsx` under 80 lines.

### Phase 4 — MetadataCache, FileManager & Graph Synchronization
Tasks
- `core/metadata/MetadataCache.ts`: maps `fileCache: Map<path, CachedMetadata>`, `resolvedLinks`, `unresolvedLinks`, `backlinks`, `tags`, `headings`; incremental update on `NODE_UPDATED`; parsing in `parser.worker.ts` (Lezer markdown + yaml) with Comlink; debounced 150ms; full reindex on vault open in chunks of 200 files.
- `core/file-manager/FileManager.ts`: `renameFile` rewrites `[[old]]`, `[[old|alias]]`, `[[old#heading]]` across affected files in one transaction with undo entry; `getOrphans()`; `trashFile` with backlink warning.
- Graph engine: move force simulation into `ForceWorker.ts` (d3-force in Web Worker, transferable Float32Array positions); renderer switches Canvas -> Pixi.js (`pixi.js` + `@pixi/graphics`) when nodeCount > 2000; LOD: labels hidden below zoom 0.6, edges culled outside viewport; quadtree hit testing. Graph data derived from `MetadataCache.resolvedLinks` instead of re-parsing.
- `features/backlinks/`: backlinks from cache; `UnlinkedMentions` scans note bodies with Aho-Corasick over all titles/aliases (in worker), "Link" button rewrites text via `EditorApi`.
Files affected: `services/content/*` (removed), `services/graph/*`, `NetworkGraph.tsx` (split into `GraphView` + `engine/`), `BacklinksPanel.tsx`, `DynamicLinkManager.tsx`, `useAutoLinks.tsx`.
Acceptance: 10,000 synthetic notes index under 3s, graph at 10K nodes holds 45+ fps during drag, rename updates all backlinks with one undo step, unlinked mentions appear within 300ms of opening a note.

### Phase 5 — Polish, PWA & Sync
Tasks
- `core/sync/SyncEngine.ts`: per-file dirty tracking, last-write-wins with server `updated_at` check, conflict copies (`name (conflict YYYY-MM-DD).md`), offline queue in IndexedDB replayed on reconnect; cloud schema stays `user_vaults`/`vault_backups`.
- Service worker: precache app shell; runtime cache for vault JSON; background sync tag.
- Settings view as workspace leaf; feature toggles via `PluginRegistry` persisted in localStorage; plugin lifecycle events on the bus.
- Memory audits (see section 6); a11y pass on toolbar/palette; lint rule `import/no-restricted-paths` forbidding cross-feature imports except via `shared/` and `core/`.
Acceptance: Lighthouse PWA installable, offline edit then reconnect syncs without loss, heap stable after opening/closing 200 leaves.

## 5. Interface Definitions

```ts
// core/vault
export interface TFile { path: string; name: string; basename: string; extension: string; stat: { ctime: number; mtime: number; size: number }; parent: TFolder | null }
export interface TFolder { path: string; name: string; children: (TFile | TFolder)[] }
export interface StorageAdapter {
  readonly kind: 'filesystem' | 'indexeddb' | 'cloud';
  list(): Promise<TFile[]>; read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>; delete(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
}
export interface Vault {
  readonly id: string; readonly adapter: StorageAdapter;
  getFiles(): TFile[]; getAbstractFileByPath(p: string): TFile | TFolder | null;
  read(f: TFile): Promise<string>; cachedRead(f: TFile): Promise<string>;
  create(path: string, data: string): Promise<TFile>;
  modify(f: TFile, data: string): Promise<void>;
  process(f: TFile, fn: (data: string) => string): Promise<string>;
  rename(f: TFile | TFolder, newPath: string): Promise<void>;
  trash(f: TFile | TFolder): Promise<void>;
  on(evt: 'create' | 'modify' | 'delete' | 'rename', cb: (f: TFile, oldPath?: string) => void): () => void;
}

// core/metadata
export interface Pos { line: number; col: number; offset: number }
export interface LinkCache { link: string; original: string; displayText?: string; heading?: string; position: { start: Pos; end: Pos } }
export interface HeadingCache { heading: string; level: 1|2|3|4|5|6; position: { start: Pos; end: Pos } }
export interface CachedMetadata { links?: LinkCache[]; embeds?: LinkCache[]; tags?: { tag: string; position: { start: Pos; end: Pos } }[]; headings?: HeadingCache[]; frontmatter?: Record<string, unknown>; frontmatterPosition?: { start: Pos; end: Pos } }
export interface MetadataCache {
  getFileCache(f: TFile): CachedMetadata | null;
  getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null;
  resolvedLinks: Record<string, Record<string, number>>;
  unresolvedLinks: Record<string, Record<string, number>>;
  getBacklinks(f: TFile): Map<string, LinkCache[]>;
  getTags(): Map<string, number>;
  on(evt: 'changed' | 'resolved' | 'deleted', cb: (f: TFile, cache?: CachedMetadata) => void): () => void;
}

// core/file-manager
export interface FileManager {
  renameFile(f: TFile, newPath: string): Promise<{ updatedFiles: string[] }>;
  getOrphans(): TFile[];
  generateMarkdownLink(target: TFile, sourcePath: string, alias?: string): string;
}

// features/editor
export interface EditorSuggestTriggerInfo { start: Pos; end: Pos; query: string }
export interface EditorSuggestContext extends EditorSuggestTriggerInfo { editor: EditorApi; file: TFile }
export abstract class EditorSuggest<T> {
  abstract onTrigger(cursor: Pos, editor: EditorApi, file: TFile): EditorSuggestTriggerInfo | null;
  abstract getSuggestions(ctx: EditorSuggestContext): T[] | Promise<T[]>;
  abstract renderSuggestion(item: T): React.ReactNode;
  abstract selectSuggestion(item: T, evt: KeyboardEvent | MouseEvent): void;
}
export type FrontmatterPropertyType = 'text' | 'number' | 'date' | 'datetime' | 'checkbox' | 'tags' | 'list';
export interface FrontmatterProperty { key: string; type: FrontmatterPropertyType; value: unknown; position?: { start: Pos; end: Pos } }
export interface EditorApi {
  getValue(): string; setValue(v: string): void; getSelection(): string; replaceSelection(t: string): void;
  replaceRange(t: string, from: Pos, to?: Pos): void; getCursor(): Pos; setCursor(p: Pos): void;
  getLine(n: number): string; lineCount(): number; posToOffset(p: Pos): number; offsetToPos(o: number): Pos;
  focus(): void; exec(cmd: string): boolean;
}

// features/workspace
export type ViewType = 'markdown' | 'graph' | 'backlinks' | 'settings' | 'empty';
export interface ViewState { type: ViewType; state: Record<string, unknown>; mode?: 'source' | 'live' | 'reading' }
export interface WorkspaceLeaf { id: string; parentId: string; view: ViewState; pinned: boolean; history: ViewState[]; setViewState(v: ViewState): Promise<void>; openFile(f: TFile): Promise<void>; detach(): void }
export interface WorkspaceSplit { id: string; direction: 'horizontal' | 'vertical'; children: (WorkspaceSplit | WorkspaceLeaf)[]; sizes: number[] }
export interface Workspace {
  root: WorkspaceSplit; activeLeafId: string | null;
  getLeaf(mode: 'tab' | 'split' | 'window'): WorkspaceLeaf;
  getLeavesOfType(t: ViewType): WorkspaceLeaf[];
  splitActiveLeaf(dir: 'horizontal' | 'vertical'): WorkspaceLeaf;
  getLayout(): unknown; changeLayout(l: unknown): Promise<void>;
}

// core/commands
export interface Command { id: string; name: string; hotkeys?: string[]; icon?: string; checkCallback?: (checking: boolean) => boolean | void; editorCallback?: (editor: EditorApi, view: ViewState) => void }
```

## 6. Performance, Virtualization & Memory Strategy

- Editor: CM6 already virtualizes DOM by viewport; keep Decoration sets built via `RangeSetBuilder` limited to `view.visibleRanges`; expensive widgets (mermaid, katex) render lazily with `requestIdleCallback` and cache by content hash; one `EditorView` per leaf, destroyed in effect cleanup (`view.destroy()`), state kept in leaf `ViewState` so reopening restores scroll/cursor.
- Parsing: all Lezer/YAML parsing for cache runs in a Web Worker (Comlink); main thread never parses more than the active document. Reindex in chunks of 200 with `await scheduler.yield()` fallback to `setTimeout(0)`.
- Graph: simulation in worker, positions in `SharedArrayBuffer` when cross-origin isolated else transferable arrays; renderer redraws only on tick or camera change; label rendering behind zoom threshold; `simulation.stop()` and `app.destroy(true)` on unmount; dispose Pixi textures via a texture cache with LRU 500.
- Stores: selectors with `useShallow`; services subscribe with `subscribeWithSelector` and unsubscribe on cleanup; no whole-store subscriptions in leaves.
- Memory guards: `WeakMap` for per-file derived data; leaf close triggers `view.destroy()`, worker port close, and cache entry release; dev-only `EventDebugPanel` reports listener counts (already exists in `eventBus.getListenerCount()`).
- Budgets: keystroke under 16ms, cache update under 50ms, graph tick under 12ms at 10K nodes, initial load under 2s on 3G fast for app shell (vault data streamed after).

## Technical notes

- New dependencies: `@codemirror/*` (state, view, language, lang-markdown, autocomplete, commands, search), `@lezer/markdown`, `@lezer/highlight`, `yaml`, `katex`, `mermaid`, `comlink`, `pixi.js`, `@dnd-kit/core`.
- Removed after migration: `react-markdown` (once post-processor pipeline ships), `remark-breaks`, `rehype-raw`, `react-force-graph-2d`, `three`.
- Auto-generated files stay untouched: `src/integrations/supabase/client.ts`, `types.ts`, `.env`.
- Each phase ships as one approved plan and lands green (typecheck, build, no console loops) before the next starts.
