# Feature-Based Architecture Restructure Plan

## Vision

Transform the codebase into a modular, plugin-ready architecture where:

- `src/` contains only: `components/`, `services/`, `pages/`
- Every feature is self-contained and loadable/unloadable
- Features communicate through a plugin registry and event system
- Clear boundaries enable easy addition/removal of features

## Current State Analysis

### Feature Domains Identified

1. **Vault Management** - Multi-vault orchestration, storage strategies
2. **Graph Visualization** - Force-directed graph, node/link management
3. **Authentication** - Supabase auth, user management
4. **Sync** - Cloud sync, background sync, offline support
5. **Import/Export** - ZIP import/export, file handling
6. **Persistence** - IndexedDB, FileSystem API, storage abstraction
7. **Content Processing** - Markdown parsing, wikilinks, tags
8. **UI/Theme** - Theme management, responsive layouts
9. **PWA** - Install prompts, offline indicators
10. **Profile** - User settings, API keys, avatar

### Current Structure Issues

- `hooks/` - React hooks scattered (should be feature-specific)
- `lib/` - Utility functions (should be in services)
- `utils/` - More utilities (duplicate of lib/)
- `stores/` - Zustand stores (should be in services)
- `integrations/` - External integrations (should be in services)

### Dependencies Map

```
VaultManager → GraphService → ContentParser
VaultManager → VaultStorage → IndexedDB
VaultManager → VaultSyncService → CloudVaultService → Supabase
ImportExportService → ContentParser
NetworkGraph → GraphService (via events)
Components → Stores → Services
```

## Target Architecture

### Folder Structure

```
src/
├── components/          # All React components organized by feature
│   ├── core/           # Core UI primitives (ui/, common/)
│   ├── vault/          # Vault feature components
│   ├── graph/          # Graph visualization components
│   ├── auth/           # Authentication components
│   ├── sync/           # Sync status components
│   ├── import-export/  # Import/export components
│   ├── profile/        # Profile components
│   └── layout/         # Layout components
│
├── services/           # All business logic and utilities
│   ├── core/           # Core services (events, registry, DI)
│   ├── vault/          # Vault management services
│   ├── graph/          # Graph computation services
│   ├── auth/           # Authentication services
│   ├── sync/           # Sync services
│   ├── import-export/  # Import/export services
│   ├── persistence/    # Storage abstraction services
│   ├── content/        # Content processing services
│   ├── ui/             # UI state management (stores)
│   └── integrations/   # External integrations (Supabase, etc.)
│
└── pages/              # Route-level page components
    ├── Landing.tsx
    ├── Auth.tsx
    ├── Index.tsx
    ├── Profile.tsx
    ├── VaultDashboard.tsx
    └── NotFound.tsx
```

## Implementation Plan

### Phase 1: Create Plugin/Feature Registry System

**1.1 Create Core Plugin Infrastructure**

- File: `services/core/plugin-registry.ts`
- Purpose: Central registry for feature registration, lifecycle management
- Interface:
  ```typescript
  interface Feature {
  	id: string;
  	name: string;
  	version: string;
  	dependencies?: string[];
  	services?: ServiceFactory[];
  	components?: ComponentRegistry;
  	routes?: RouteConfig[];
  	hooks?: HookRegistry;
  	initialize?: () => Promise<void>;
  	cleanup?: () => Promise<void>;
  }
  ```

**1.2 Create Dependency Injection Container**

- File: `services/core/container.ts`
- Purpose: Service locator pattern for dependency injection
- Allows services to be swapped/mocked for testing
- Enables lazy loading of services

**1.3 Create Feature Registry**

- File: `services/core/features.ts`
- Purpose: Register and manage all features
- Methods: `register()`, `unregister()`, `get()`, `getAll()`, `initialize()`

### Phase 2: Migrate Utilities to Services

**2.1 Consolidate lib/ and utils/ into services/core/utils/**

- Move `lib/utils.ts` → `services/core/utils/cn.ts`
- Move `lib/markdownParser.ts` → `services/content/markdown-parser.ts`
- Move `lib/graphExport.ts` → `services/import-export/graph-export.ts`
- Move `lib/graphImport.ts` → `services/import-export/graph-import.ts`
- Move `utils/offlineStorage.ts` → `services/persistence/offline-storage.ts`
- Create `services/core/utils/color-utils.ts` (extract from NetworkGraph)

**2.2 Update All Imports**

- Replace `@/lib/*` → `@/services/core/utils/*` or feature-specific paths
- Replace `@/utils/*` → `@/services/persistence/*` or feature-specific paths

### Phase 3: Migrate Stores to Services

**3.1 Move Zustand Stores to services/ui/stores/**

- `stores/useNodeStore.ts` → `services/ui/stores/node-store.ts`
- `stores/useVaultStore.ts` → `services/ui/stores/vault-store.ts`
- `stores/useGraphStore.ts` → `services/ui/stores/graph-store.ts`
- `stores/useUIStore.ts` → `services/ui/stores/ui-store.ts`
- `stores/useThemeStore.ts` → `services/ui/stores/theme-store.ts`
- `stores/useOfflineStore.ts` → `services/ui/stores/offline-store.ts`
- `stores/types.ts` → `services/ui/stores/types.ts`
- `stores/index.ts` → `services/ui/stores/index.ts` (re-export)

**3.2 Update Store Imports**

- Replace `@/stores` → `@/services/ui/stores`

### Phase 4: Migrate Hooks to Feature-Specific Locations

**4.1 Organize Hooks by Feature**

- `hooks/useAuth.tsx` → `components/auth/hooks/useAuth.tsx`
- `hooks/useVault.tsx` → `components/vault/hooks/useVault.tsx`
- `hooks/useVaultSync.tsx` → `components/vault/hooks/useVaultSync.tsx`
- `hooks/useVaultEvents.tsx` → `components/vault/hooks/useVaultEvents.tsx`
- `hooks/useAutoLinks.tsx` → `components/graph/hooks/useAutoLinks.tsx`
- `hooks/usePWA.tsx` → `components/sync/hooks/usePWA.tsx`
- `hooks/use-toast.ts` → `components/core/hooks/useToast.ts` (consolidate duplicate)
- `hooks/use-mobile.tsx` → `components/core/hooks/useMobile.tsx`

**4.2 Update Hook Imports**

- Update all imports to new feature-specific paths

### Phase 5: Migrate Integrations to Services

**5.1 Move Integrations**

- `integrations/supabase/client.ts` → `services/integrations/supabase/client.ts`
- `integrations/supabase/types.ts` → `services/integrations/supabase/types.ts`

**5.2 Update Integration Imports**

- Replace `@/integrations/*` → `@/services/integrations/*`

### Phase 6: Organize Components by Feature

**6.1 Reorganize Component Structure**

- Keep existing feature folders: `auth/`, `vault/`, `graph/`, `sync/`, `profile/`
- Move `common/` → `core/common/`
- Move `ui/` → `core/ui/` (shadcn components)
- Move `debug/` → `core/debug/`
- Move `layout/` → `core/layout/`
- Move `GraphConfigPanel/` → `graph/config-panel/` (rename for consistency)

**6.2 Create Feature Index Files**

- Each feature folder gets `index.ts` for clean exports
- Example: `components/vault/index.ts` exports all vault components

### Phase 7: Organize Services by Feature

**7.1 Reorganize Service Structure**

- Keep existing: `vault/`, `graph/`, `import-export/`, `persistence/`, `sync/`, `apikeys/`, `events/`
- Create `services/core/` for:
  - `plugin-registry.ts` - Feature registry
  - `container.ts` - Dependency injection
  - `events.ts` - Domain events (move from events/)
  - `utils/` - Shared utilities
- Create `services/content/` for:
  - `markdown-parser.ts` (moved from lib/)
  - `content-parser.ts` (from graph/)
- Create `services/ui/` for:
  - `stores/` - All Zustand stores
- Create `services/integrations/` for:
  - `supabase/` - Supabase client and types

**7.2 Create Service Factories**

- Each feature service gets a factory function for DI
- Example: `services/vault/vault-manager-factory.ts`

### Phase 8: Create Feature Modules

**8.1 Define Feature Interfaces**
Each feature becomes a self-contained module:

```typescript
// Example: Vault Feature
const vaultFeature: Feature = {
	id: 'vault',
	name: 'Vault Management',
	version: '1.0.0',
	services: [
		() => new VaultManager(),
		() => new VaultStorage(),
		() => new VaultSyncService(),
	],
	components: {
		VaultDashboard: () => import('./components/vault/VaultDashboard'),
		VaultCard: () => import('./components/vault/VaultCard'),
	},
	routes: [{ path: '/vaults', component: 'VaultDashboard' }],
	hooks: {
		useVault: () => import('./components/vault/hooks/useVault'),
		useVaultSync: () => import('./components/vault/hooks/useVaultSync'),
	},
	initialize: async () => {
		// Initialize vault services
	},
	cleanup: async () => {
		// Cleanup vault services
	},
};
```

**8.2 Register Core Features**

- Create `services/core/features/core-features.ts`
- Register all existing features as plugins
- Enable/disable features via configuration

### Phase 9: Update App Entry Point

**9.1 Refactor App.tsx**

- Use feature registry to load features
- Dynamically register routes from features
- Initialize features on app start

**9.2 Create Feature Loader**

- File: `services/core/feature-loader.ts`
- Handles async feature loading
- Manages feature dependencies
- Provides feature lifecycle hooks

### Phase 10: Clean Up and Consolidate

**10.1 Remove Empty Folders**

- Delete `hooks/` (moved to components)
- Delete `lib/` (moved to services)
- Delete `utils/` (moved to services)
- Delete `stores/` (moved to services)
- Delete `integrations/` (moved to services)

**10.2 Update All Import Paths**

- Use feature-specific paths
- Update tsconfig.json paths if needed
- Ensure all imports resolve correctly

**10.3 Create Feature Documentation**

- Document each feature's API
- Document plugin registration process
- Create examples for adding new features

## Migration Strategy

### Step-by-Step Approach

1. **Create Core Infrastructure First**

   - Build plugin registry
   - Build DI container
   - Create feature interfaces

2. **Migrate Utilities (Low Risk)**

   - Move lib/ and utils/ files
   - Update imports incrementally
   - Test after each move

3. **Migrate Stores (Medium Risk)**

   - Move stores to services/ui/stores/
   - Update all imports
   - Test state management

4. **Migrate Hooks (Medium Risk)**

   - Move hooks to feature folders
   - Update imports
   - Test component functionality

5. **Migrate Integrations (Low Risk)**

   - Move Supabase integration
   - Update imports
   - Test auth/sync

6. **Reorganize Components (Low Risk)**

   - Move components to feature folders
   - Update imports
   - Test UI rendering

7. **Reorganize Services (Medium Risk)**

   - Move services to feature folders
   - Update imports
   - Test service functionality

8. **Create Feature Modules (High Value)**

   - Define feature interfaces
   - Register features
   - Enable plugin system

9. **Update App Architecture (High Risk)**

   - Refactor App.tsx
   - Implement feature loading
   - Test full application

10. **Clean Up (Low Risk)**
    - Remove old folders
    - Update documentation
    - Final testing

## Benefits

### Portability

- Features are self-contained
- Easy to extract features to separate packages
- Can be loaded dynamically

### Extensibility

- Clear plugin API
- Easy to add new features
- Features can depend on other features

### Maintainability

- Clear feature boundaries
- Reduced coupling
- Easier to test

### Performance

- Lazy load features
- Tree-shake unused features
- Code splitting by feature

## Risk Mitigation

1. **Incremental Migration**

   - Migrate one feature at a time
   - Test after each migration
   - Keep old structure until migration complete

2. **Backward Compatibility**

   - Create re-export files during transition
   - Maintain old import paths temporarily
   - Gradual deprecation

3. **Testing Strategy**

   - Test each feature after migration
   - Integration tests for feature interactions
   - E2E tests for critical paths

4. **Rollback Plan**
   - Git branches for each phase
   - Ability to revert if issues arise
   - Document known issues

## Success Criteria

- [ ] Only 3 folders in src/: components/, services/, pages/
- [ ] All features are registered as plugins
- [ ] Features can be loaded/unloaded dynamically
- [ ] No circular dependencies
- [ ] All imports use feature-specific paths
- [ ] Plugin registry is functional
- [ ] DI container is working
- [ ] All tests pass
- [ ] Documentation is updated

## Timeline Estimate

- Phase 1-2: 2-3 days (Core infrastructure + utilities)
- Phase 3-4: 2-3 days (Stores + hooks)
- Phase 5-6: 2-3 days (Integrations + components)
- Phase 7-8: 3-4 days (Services + feature modules)
- Phase 9-10: 2-3 days (App refactor + cleanup)

**Total: 11-16 days** (depending on complexity and testing)
