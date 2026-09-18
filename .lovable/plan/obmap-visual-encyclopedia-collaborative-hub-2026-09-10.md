# ObMap — Visual Encyclopedia & Collaborative Hub

## Executive summary

ObMap today is a local-first PKM app: a workspace of tabbed leaves, a CodeMirror 6 markdown editor with a frontmatter properties panel, a force-directed graph, and whole-vault cloud snapshots with an offline sync queue.

This roadmap evolves it into a structured visual encyclopedia with a collaborative editorial workflow, in three deliveries:

- **Phase 0 — Unified Settings Hub + Cascading Schema.** Replace today's scattered settings (editor sheet, feature switches, sync panel, separate graph config sheet) with one sidebar-navigated hub that also defines the global property schema every note inherits.
- **Phase 1 — Multi-modal graph engine + Notion-style frontmatter.** One graph source of truth projected into force, timeline, tree and fishbone layouts, with layout-aware link routing and per-depth sub-layouts; raw YAML rendered as an interactive property UI.
- **Phase 2 — Collaboration.** Migrate from whole-vault snapshots to per-note cloud rows, add roles, field locks, a strict schema linter, and a public/internal dual-realm with diff review.

### Current state (verified)

- Settings live in three places with no shared shell: `EditorSettingsPanel`, `FeatureTogglesPanel`, `SyncPanel` inside `SettingsLeaf`, plus a separate graph config sheet (`features/graph/config-panel`).
- The graph uses `react-force-graph-2d`; the only non-force option is its `dagMode`. No timeline, tree or fishbone layout, no custom link router.
- Frontmatter has a `PropertiesPanel` with reserved keys (`tags`, `aliases`, `cssclasses`) but no schema rules, no mandatory fields, no validation.
- Database has `profiles`, `user_vaults`, `vault_backups`, `vault_history`, `user_api_keys`. There is **no roles table and no per-note table** — notes live inside `user_vaults.graph_data`.
- `graph_config` already exists as a JSON column on `user_vaults` and flows through the sync engine, so layout rules have a home from day one.

### Confirmed decisions

- **Storage:** hybrid. Phases 0-1 stay on whole-vault snapshots; the per-note migration is the first work item of Phase 2.
- **Graph:** fully replace `react-force-graph-2d` with a custom Canvas/Pixi renderer plus a layout Web Worker (d3-force, d3-hierarchy, custom timeline and fishbone) and a custom link router drawing boundary-to-boundary paths.
- **Delivery:** the Settings Hub ships together with the global schema UI so it is functional, not just reorganised.

---

## System blueprint

```text
                Unified Settings Hub  (global context)
                 |            |            |          |
        System & Sync   Editor & Schema  Graph Engine  Roles
                              |            |
                    SchemaRegistry    GraphConfigStore
                          |                |
      +-------------------+-------+        |
      |                           |        |
 Frontmatter Manager        Schema Linter  |
 (Notion-style UI)          (Phase 2)      |
      |                                     |
      +----------- Note YAML ---------------+
                     |
              Unified Graph Engine
        (source of truth -> layout projections)
                     |
      Layout Worker -> positions + anchors
                     |
      Link Router (straight | elbow | bezier)
                     |
             Canvas / Pixi renderer
```

### Components

- **Settings Hub** — a workspace leaf with a left rail of categories and a scrollable pane per category. Absorbs the existing editor, feature-toggle, sync and graph panels; a single persisted settings store backs it.
- **SchemaRegistry** — the global definition of properties: key, type, mandatory or optional, visibility (always visible / collapsible / hidden), default value, allowed taxonomy prefixes. Stored per vault and merged into `graph_config`.
- **Cascading resolver** — resolves the effective schema for a note as global schema, then vault overrides, then note-level frontmatter overrides; the frontmatter UI shows where each rule comes from.
- **Unified Graph Engine** — a headless graph model plus pluggable layout strategies. The model never changes when the projection changes; only positions do.
- **Layout Worker** — off-main-thread computation of positions and node boundary anchor points for each layout, streamed back as transferable arrays.
- **Link Router** — per-layout path generation: elastic straight lines for force, orthogonal elbows for tree and fishbone, bezier curves for timeline and cross-links, all anchored to node edges.
- **Frontmatter Manager** — replaces raw YAML at the top of the editor with an interactive block: mandatory properties always visible, system config in a collapsible accordion, raw-YAML escape hatch retained.
- **Realms (Phase 2)** — Public realm renders `status: published` only; Internal realm shows drafts and reviews with a diff view and approve action.

---

## Execution roadmap

### Phase 0 — Unified Settings Hub + Cascading Schema

1. Create the settings shell: sidebar categories, routing by category id, responsive collapse to a select on mobile.
2. Move existing panels into categories without behaviour changes:
   - System & Sync: connection, pending uploads, cache, retry, feature switches.
   - Editor & Schema: current editor settings.
   - Visual Graph Engine: current graph config tabs, lifted out of its sheet.
   - User Roles: placeholder describing Phase 2, no fake controls.
3. Build the schema editor in Editor & Schema: add/remove properties, set type, mandatory flag, visibility mode, default value, taxonomy prefix (for example `century/`, `region/`).
4. Persist schema in the vault's `graph_config` under a versioned `schema` key; add a migration/defaults path so existing vaults load cleanly.
5. Implement the cascading resolver and expose it as a hook for the editor.
6. Wire the existing properties panel to the resolved schema: mandatory properties render first and cannot be deleted; unknown properties still allowed.

Acceptance: one settings entry point, no orphan panels, schema round-trips through save/reload and cloud sync, existing vaults unaffected.

### Phase 1 — Unified multi-modal graph engine + frontmatter UI

1. Extract a headless graph model and layout strategy interface; keep the current renderer working against it.
2. Stand up the layout worker with d3-force and d3-hierarchy; move force layout onto it first and verify parity.
3. Add the Canvas/Pixi renderer behind a setting, with camera, hit-testing, labels above a zoom threshold, and proper teardown on leaf close.
4. Add timeline layout (X axis from a configurable time property, lane packing on Y) and tree/org layout (d3-hierarchy).
5. Add fishbone layout (spine plus angled ribs by depth and category).
6. Implement the link router: straight/elastic, orthogonal elbow, bezier; anchor points come from the worker, not node centres.
7. Multi-level sub-layouts: depth-range rules (for example depth 1-3 fishbone, depth 4+ force), edited in the Graph Engine settings category, saved in `graph_config` and overridable per note.
8. Frontmatter Manager: replace the raw YAML block in the editor with the interactive component, smart visibility from the resolved schema, accordion for system config, raw toggle.
9. Retire `react-force-graph-2d` and its dependencies once parity is confirmed.

Acceptance: all four layouts render from the same graph data, switching layout animates without reloading data, per-depth rules persist in YAML, graph tick stays within the performance budget on a large vault.

### Phase 2 — Collaboration and curation

1. **Storage migration (bridge).** New tables: `notes` (per-note rows with vault, path, title, body, frontmatter JSON, status, author, timestamps), `note_revisions`, `user_roles` with an `app_role` enum and a security-definer `has_role` function. Migrate existing `graph_data` snapshots into note rows; keep snapshot export as a fallback.
2. **Roles.** Admin, editor, contributor, viewer. Roles live in `user_roles` only, never on profiles.
3. **Strict schema linter.** Real-time YAML validation in the editor: mandatory fields empty blocks save in Strict Mode unless filled with an accepted placeholder (`none`, `unknown`); inline error markers and a problems list.
4. **Taxonomy autocomplete.** Prefix-aware suggestions for tag namespaces drawn from the schema and existing vault tags.
5. **Role-based property protection.** Locked fields (for example `status`) are read-only in the UI for insufficient roles and enforced by row-level rules and a validation trigger in the database.
6. **Dual-view architecture.** Public realm renders published notes only, optimised for reading; Internal realm lists drafts and reviews, with a per-note diff between current and proposed revision and an approve action that promotes the revision.

Acceptance: a contributor can submit a draft they cannot publish, an editor sees the diff and approves it, the note appears in the public realm, and the database rejects a forged status change.

---

## Technical notes

- New dependencies expected: `pixi.js` (or a plain Canvas renderer), `d3-force`, `d3-hierarchy`, `d3-path`, `comlink`. Removed at the end of Phase 1: `react-force-graph-2d`, `three`.
- `graph_config` schema is versioned; every read goes through a normaliser so older vaults never crash the hub.
- Layout worker communicates via transferable Float32Arrays; the renderer redraws on tick or camera change only.
- Phase 2 database work follows the project's role rules: separate `user_roles` table, security-definer `has_role`, explicit grants and RLS on every new table.
- Each phase lands green (typecheck, lint boundaries, build) before the next begins.
