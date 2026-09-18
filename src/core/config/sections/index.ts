/**
 * Section adapters — bind the existing stores to the configuration vault.
 *
 * A future feature becomes persistent by adding one more registration here.
 */

import { registerConfigSection } from '../registry';
import { useGraphStore, defaultGraphConfig, type GraphConfigState } from '@/shared/stores/useGraphStore';
import { useGraphEngineStore } from '@/shared/stores/useGraphEngineStore';
import { useThemeStore } from '@/shared/stores/useThemeStore';
import { useEditorSettingsStore } from '@/shared/stores/useEditorSettingsStore';
import { useUIStore } from '@/shared/stores/useUIStore';
import { useWorkspaceStore } from '@/features/workspace/store/useWorkspaceStore';
import { useSchemaStore } from '@/core/schema/useSchemaStore';
import {
  TOGGLEABLE_FEATURES,
  getFeatureToggles,
  onFeatureTogglesChange,
  setFeatureEnabled,
} from '@/core/plugins/feature-toggles';

let registered = false;

export function registerConfigSections(): void {
  if (registered) return;
  registered = true;

  /* ---------------------------- graph styling ---------------------------- */
  registerConfigSection<GraphConfigState>({
    id: 'graph',
    label: 'Graph styling',
    version: 1,
    scope: 'vault',
    read: () => useGraphStore.getState().config,
    write: (value) => useGraphStore.getState().loadConfig(value),
    reset: () => useGraphStore.getState().loadConfig(defaultGraphConfig),
    subscribe: (cb) =>
      useGraphStore.subscribe((s, prev) => {
        if (s.config !== prev.config) cb();
      }),
    migrate: (data) => data as GraphConfigState,
  });

  /* ----------------------------- graph engine ---------------------------- */
  type EngineSnapshot = ReturnType<typeof readEngine>;
  const readEngine = () => {
    const s = useGraphEngineStore.getState();
    return {
      useCanvasEngine: s.useCanvasEngine,
      layout: s.layout,
      routing: s.routing,
      timeField: s.timeField,
      linkDistance: s.linkDistance,
      chargeStrength: s.chargeStrength,
      laneHeight: s.laneHeight,
      levelDistance: s.levelDistance,
      showLabels: s.showLabels,
      labelZoomThreshold: s.labelZoomThreshold,
      depthRules: s.depthRules,
    };
  };

  registerConfigSection<EngineSnapshot>({
    id: 'graph-engine',
    label: 'Graph layout engine',
    version: 1,
    scope: 'vault',
    read: readEngine,
    write: (value) => useGraphEngineStore.getState().patch(value),
    subscribe: (cb) => useGraphEngineStore.subscribe(() => cb()),
  });

  /* -------------------------------- theme -------------------------------- */
  registerConfigSection({
    id: 'theme',
    label: 'Theme',
    version: 1,
    scope: 'user',
    read: () => useThemeStore.getState().theme,
    write: (value) => useThemeStore.setState({ theme: value as never }),
    reset: () => useThemeStore.getState().resetTheme(),
    subscribe: (cb) =>
      useThemeStore.subscribe((s, prev) => {
        if (s.theme !== prev.theme) cb();
      }),
  });

  /* -------------------------------- editor ------------------------------- */
  registerConfigSection({
    id: 'editor',
    label: 'Editor',
    version: 1,
    scope: 'user',
    read: () => {
      const s = useEditorSettingsStore.getState();
      return {
        appearance: s.appearance,
        behavior: s.behavior,
        suggestions: s.suggestions,
        toolbar: s.toolbar,
      };
    },
    write: (value) => {
      const v = value as Record<string, unknown>;
      const s = useEditorSettingsStore.getState();
      if (v.appearance) s.updateAppearance(v.appearance as never);
      if (v.behavior) s.updateBehavior(v.behavior as never);
      if (v.suggestions) s.updateSuggestions(v.suggestions as never);
      if (v.toolbar) {
        const { groups, ...rest } = v.toolbar as Record<string, unknown>;
        s.updateToolbar(rest as never);
        if (groups) {
          Object.entries(groups as Record<string, boolean>).forEach(([g, enabled]) =>
            s.updateToolbarGroup(g as never, enabled)
          );
        }
      }
    },
    reset: () => useEditorSettingsStore.getState().reset(),
    subscribe: (cb) =>
      useEditorSettingsStore.subscribe((s, prev) => {
        if (
          s.appearance !== prev.appearance ||
          s.behavior !== prev.behavior ||
          s.suggestions !== prev.suggestions ||
          s.toolbar !== prev.toolbar
        )
          cb();
      }),
  });

  /* ------------------------------ interface ------------------------------ */
  registerConfigSection({
    id: 'interface',
    label: 'Interface',
    version: 1,
    scope: 'user',
    read: () => {
      const s = useUIStore.getState();
      return { editorViewMode: s.editorViewMode, editorLayoutMode: s.editorLayoutMode };
    },
    write: (value) => {
      const v = value as { editorViewMode?: never; editorLayoutMode?: never };
      const s = useUIStore.getState();
      if (v.editorViewMode) s.setEditorViewMode(v.editorViewMode);
      if (v.editorLayoutMode) s.setEditorLayoutMode(v.editorLayoutMode);
    },
    subscribe: (cb) =>
      useUIStore.subscribe((s, prev) => {
        if (
          s.editorViewMode !== prev.editorViewMode ||
          s.editorLayoutMode !== prev.editorLayoutMode
        )
          cb();
      }),
  });

  /* ------------------------------ workspace ------------------------------ */
  registerConfigSection({
    id: 'workspace',
    label: 'Workspace layout',
    version: 1,
    scope: 'vault',
    read: () => ({ layouts: (useWorkspaceStore.getState() as never as { layouts: unknown }).layouts }),
    write: (value) => {
      const layouts = (value as { layouts?: unknown }).layouts;
      if (layouts) useWorkspaceStore.setState({ layouts } as never);
    },
    subscribe: (cb) =>
      useWorkspaceStore.subscribe((s, prev) => {
        const next = (s as never as { layouts: unknown }).layouts;
        const before = (prev as never as { layouts: unknown }).layouts;
        if (next !== before) cb();
      }),
  });

  /* -------------------------------- schema ------------------------------- */
  registerConfigSection({
    id: 'schema',
    label: 'Properties & schema',
    version: 1,
    scope: 'vault',
    read: () => useSchemaStore.getState().schema,
    write: (value) => useSchemaStore.setState({ schema: value as never }),
    reset: () => useSchemaStore.getState().resetSchema(),
    subscribe: (cb) =>
      useSchemaStore.subscribe((s, prev) => {
        if (s.schema !== prev.schema) cb();
      }),
  });

  /* ------------------------------- features ------------------------------ */
  registerConfigSection({
    id: 'features',
    label: 'Feature toggles',
    version: 1,
    scope: 'user',
    read: () => getFeatureToggles(),
    write: (value) => {
      const map = value as Record<string, boolean>;
      const current = getFeatureToggles();
      for (const feature of TOGGLEABLE_FEATURES) {
        const next = map[feature.id];
        if (typeof next === 'boolean' && next !== current[feature.id]) {
          void setFeatureEnabled(feature.id, next);
        }
      }
    },
    reset: () => {
      for (const feature of TOGGLEABLE_FEATURES) {
        void setFeatureEnabled(feature.id, feature.defaultEnabled);
      }
    },
    subscribe: (cb) => onFeatureTogglesChange(() => cb()),
  });
}
