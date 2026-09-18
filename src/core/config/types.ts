/**
 * Configuration vault types — the ".obmap" settings layer.
 *
 * Every settings area of the app registers one ConfigSection here. The service
 * then handles persistence (local + cloud + folder export) uniformly, so new
 * features only need to register a section to become persistent.
 */

export type ConfigScope = 'user' | 'vault';

export interface ConfigSection<T = unknown> {
  /** Stable id, used as the storage key and export filename. */
  id: string;
  /** Human label shown in the settings UI. */
  label: string;
  /** Bump when the shape changes; `migrate` upgrades older payloads. */
  version: number;
  /** 'user' follows the account, 'vault' is stored per vault. */
  scope: ConfigScope;
  /** Current value from the live store. */
  read: () => T;
  /** Apply a stored value back into the live store. */
  write: (value: T) => void;
  /** Restore built-in defaults. */
  reset?: () => void;
  /** Notify the service when the live store changes. */
  subscribe: (cb: () => void) => () => void;
  /** Upgrade a payload saved by an older version of the app. */
  migrate?: (data: unknown, fromVersion: number) => T;
}

export interface SectionRecord {
  version: number;
  data: unknown;
  updatedAt: number;
}

export interface ConfigDocument {
  /** Envelope version of the document itself. */
  schemaVersion: number;
  deviceId: string;
  updatedAt: number;
  sections: Record<string, SectionRecord>;
}

export const CONFIG_SCHEMA_VERSION = 1;

export type ConfigSyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

export interface ConfigSyncState {
  status: ConfigSyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  hydrated: boolean;
}

export const emptyDocument = (deviceId: string): ConfigDocument => ({
  schemaVersion: CONFIG_SCHEMA_VERSION,
  deviceId,
  updatedAt: 0,
  sections: {},
});

export function isConfigDocument(value: unknown): value is ConfigDocument {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Partial<ConfigDocument>;
  return (
    typeof doc.schemaVersion === 'number' &&
    typeof doc.sections === 'object' &&
    doc.sections !== null
  );
}
