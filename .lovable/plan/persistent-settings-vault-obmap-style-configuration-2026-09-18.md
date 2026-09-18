# Persistent settings vault (.obmap-style configuration)

Goal: every setting — graph styling, layout engine, node colors and level sizing, editor, theme, workspace, feature toggles, schema — survives a refresh, is stored locally offline, and syncs to your Supabase account. Built as one central module so future settings plug in without rewiring anything.

## How it works

Today each settings area saves itself separately into browser storage, with different keys and no cloud copy. This replaces that with a single configuration layer, the same idea as Obsidian's `.obsidian` folder:

- One registry of named config sections ("graph", "graph-engine", "theme", "editor", "workspace", "features", "schema").
- Each section keeps its own version number and an upgrade path, so new or renamed options load cleanly in future updates.
- Three storage layers, in order: memory (live app) -> local device -> cloud account.
- Changes save automatically a moment after you stop adjusting a control; on sign-in or refresh the latest copy is restored.
- Export/import the whole configuration as a folder of JSON files, one per section, matching the `.obmap` folder layout.

## Scope of settings covered

- Graph styling: nodes (shape, colors, opacity, labels, size-by-depth and level interval), links, topology link styles (hierarchy/backlink/tag/semantic), forces.
- Graph engine: active layout (force/timeline/tree/fishbone), routing, depth rules, label thresholds, renderer choice.
- Theme colors and physics, editor appearance/behaviour/suggestions/toolbar, workspace layout, UI preferences, feature toggles, vault schema.

## Technical design

New module `src/core/config/`:

- `types.ts` — `ConfigSection<T>` descriptor: `id`, `version`, `scope` ('user' | 'vault'), `defaults`, `read()`, `write(value)`, `migrate(data, fromVersion)`.
- `registry.ts` — `registerConfigSection()` + lookup. Adding a future feature = one registration call.
- `ConfigService.ts` — orchestrates hydrate/save: collects a snapshot document `{ schemaVersion, sections: { [id]: { version, data } }, updatedAt, deviceId }`, debounced (~800 ms) persist, conflict resolution by `updatedAt` (newest wins, local wins on tie), offline queue reuse via existing sync/offline store.
- `LocalConfigStore.ts` — IndexedDB (new `config` store in `VaultManagerDB`, bumped version) with a localStorage fallback; keeps existing zustand `persist` keys working as a first-run import so nothing is lost.
- `CloudConfigStore.ts` — Supabase reads/writes against a new `user_settings` table.
- `FolderConfigStore.ts` — optional `.obmap/*.json` mirror through the existing `FileSystemService`, for filesystem vaults.
- `sections/*.ts` — adapters binding the existing stores (`useGraphStore`, `useGraphEngineStore`, `useThemeStore`, `useEditorSettingsStore`, `useUIStore`, `useWorkspaceStore`, `useSchemaStore`, feature toggles) to the registry. Each store keeps its current API; adapters call existing `loadConfig`/`patch`/setters, and subscribe to push changes into the service.
- `useConfigSync.ts` — hook mounted once in app bootstrap: hydrates on start, re-hydrates on sign-in and vault switch, flushes pending saves on `visibilitychange`/unload.
- `useConfigSync.ts` — hook mounted once in app bootstrap: hydrates on start **(block main UI rendering or show a loader until the local hydration resolves to prevent layout/theme flickering)**, re-hydrates on sign-in and vault switch, flushes pending saves on `visibilitychange`/unload. **Include error handling for failed API calls (fail silently and queue for retry) to avoid blocking the user.**
- UI additions in the settings hub: a small sync status line (Saved / Saving / Offline / Last synced **/ Error**) plus Export configuration, Import configuration **(with basic JSON schema validation before applying)**, and Reset to defaults.

Database migration (new table):

- `public.user_settings`: `user_id`, `vault_id` (nullable, references `user_vaults`), `section` text, `version` int, `data` jsonb, `device_id` text, timestamps; unique per user + section + vault; grants for `authenticated`/`service_role`; RLS scoped to `auth.uid()`; `updated_at` trigger.

Vault-scoped sections (graph styling, engine, schema) attach to the active vault; account-wide sections (theme, editor, UI, features) use a null vault so they follow you everywhere. Signed-out use stays fully functional on the local layer alone.

UI additions in the settings hub: a small sync status line (Saved / Saving / Offline / Last synced) plus Export configuration, Import configuration, and Reset to defaults.

## Verification

- Typecheck, then a browser pass: change node color, size-by-depth interval, layout and theme, refresh, confirm everything returns.
- Confirm signed-out changes persist locally and upload after sign-in.
- Confirm export produces one JSON per section and import restores them.
- Typecheck, then a browser pass: change node color, size-by-depth interval, layout and theme, refresh, confirm everything returns.
- Confirm signed-out changes persist locally and upload after sign-in.
- Confirm export produces one JSON per section and import restores them.  
  
**Instructions for AI** **Please implement this step-by-step to ensure high quality:**   
  
**1. Step 1:** Write the database migration SQL for `public.user_settings` and update the types.   
**2. Step 2:** Implement the core modules (`types.ts`, `registry.ts`, `LocalConfigStore.ts`). Stop and ask for my review.   
**3. Step 3:** Implement the `CloudConfigStore.ts` and `ConfigService.ts`.   
**4. Step 4:** Implement the adapters in `sections/*.ts` and connect them to existing Zustand stores.   
**5. Step 5:** Build the UI components (Sync status, Export/Import buttons).