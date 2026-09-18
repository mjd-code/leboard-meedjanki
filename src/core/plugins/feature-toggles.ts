/**
 * Feature toggles — user-facing on/off switches for optional app features.
 * State is persisted in localStorage, applied through the PluginRegistry
 * lifecycle, and broadcast on the event bus so features can react.
 */

import { pluginRegistry, type Feature } from './plugin-registry';
import { eventBus, EventType } from '@/shared/events/events';

const STORAGE_KEY = 'vault_feature_toggles';

export interface ToggleableFeature {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
}

/** Optional features the user can switch off. */
export const TOGGLEABLE_FEATURES: ToggleableFeature[] = [
  {
    id: 'graph-view',
    name: 'Graph view',
    description: 'Interactive network view of notes and their links.',
    defaultEnabled: true,
  },
  {
    id: 'backlinks',
    name: 'Backlinks & mentions',
    description: 'Linked references plus unlinked mention suggestions.',
    defaultEnabled: true,
  },
  {
    id: 'auto-links',
    name: 'Automatic links',
    description: 'Derive graph edges from folders, tags and mentions.',
    defaultEnabled: true,
  },
  {
    id: 'cloud-sync',
    name: 'Cloud sync',
    description: 'Push vault changes to the cloud and replay offline edits.',
    defaultEnabled: true,
  },
  {
    id: 'command-palette',
    name: 'Command palette',
    description: 'Quick command search with Ctrl/Cmd+P.',
    defaultEnabled: true,
  },
];

type ToggleMap = Record<string, boolean>;

function read(): ToggleMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ToggleMap) : {};
  } catch {
    return {};
  }
}

function write(map: ToggleMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors — toggles fall back to defaults next load */
  }
}

const listeners = new Set<(map: ToggleMap) => void>();

export function getFeatureToggles(): ToggleMap {
  const stored = read();
  const map: ToggleMap = {};
  for (const f of TOGGLEABLE_FEATURES) {
    map[f.id] = stored[f.id] ?? f.defaultEnabled;
  }
  return map;
}

export function isFeatureEnabled(id: string): boolean {
  return getFeatureToggles()[id] ?? true;
}

export function onFeatureTogglesChange(cb: (map: ToggleMap) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function setFeatureEnabled(id: string, enabled: boolean): Promise<void> {
  const map = getFeatureToggles();
  map[id] = enabled;
  write(map);

  if (pluginRegistry.get(id)) {
    if (enabled) pluginRegistry.enable(id);
    else await pluginRegistry.disable(id);
  }

  eventBus.emit(enabled ? EventType.FEATURE_ENABLED : EventType.FEATURE_DISABLED, {
    featureId: id,
  });
  listeners.forEach((cb) => cb(map));
}

/** Registers the toggleable features with the plugin registry at bootstrap. */
export function registerToggleableFeatures(): void {
  const toggles = getFeatureToggles();
  for (const f of TOGGLEABLE_FEATURES) {
    if (pluginRegistry.get(f.id)) continue;
    const feature: Feature = {
      id: f.id,
      name: f.name,
      description: f.description,
      version: '1.0.0',
      enabled: toggles[f.id],
    } as Feature;
    pluginRegistry.register(feature);
    if (!toggles[f.id]) void pluginRegistry.disable(f.id);
  }
}
