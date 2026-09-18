/**
 * Registry of configuration sections. Adding a persistent setting in a future
 * update is a single `registerConfigSection()` call.
 */

import type { ConfigSection } from './types';

const sections = new Map<string, ConfigSection<any>>();
const listeners = new Set<() => void>();

export function registerConfigSection<T>(section: ConfigSection<T>): void {
  sections.set(section.id, section as ConfigSection<any>);
  listeners.forEach((cb) => cb());
}

export function getConfigSection(id: string): ConfigSection<any> | undefined {
  return sections.get(id);
}

export function listConfigSections(): ConfigSection<any>[] {
  return Array.from(sections.values());
}

export function onRegistryChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
