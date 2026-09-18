import type { EditorApi } from "./types";

/**
 * Holds the currently focused markdown editor so global consumers
 * (command palette, hotkeys) can act on it.
 */
let active: EditorApi | null = null;
const listeners = new Set<(api: EditorApi | null) => void>();

export function setActiveEditor(api: EditorApi | null): void {
  active = api;
  listeners.forEach((l) => l(api));
}

export function getActiveEditor(): EditorApi | null {
  return active;
}

export function subscribeActiveEditor(listener: (api: EditorApi | null) => void): () => void {
  listeners.add(listener);
  listener(active);
  return () => listeners.delete(listener);
}
