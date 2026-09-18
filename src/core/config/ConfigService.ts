/**
 * ConfigService — orchestrates the ".obmap" configuration layer.
 *
 * Responsibilities:
 *  - hydrate registered sections from local storage, then from the cloud
 *  - autosave (debounced) to local storage and, when signed in, the cloud
 *  - migrate section payloads written by older app versions
 *  - export/import the whole configuration as one JSON file per section
 */

import { listConfigSections, getConfigSection } from './registry';
import { localConfigStore } from './LocalConfigStore';
import { cloudConfigStore } from './CloudConfigStore';
import {
  CONFIG_SCHEMA_VERSION,
  emptyDocument,
  isConfigDocument,
  type ConfigDocument,
  type ConfigSection,
  type ConfigSyncState,
  type SectionRecord,
} from './types';

const DEVICE_KEY = 'obmap-device-id';
const SAVE_DEBOUNCE_MS = 800;

function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return 'unknown-device';
  }
}

/** Cloud/local key for a section within the active vault scope. */
function scopedKey(section: ConfigSection, vaultId: string | null): string {
  if (section.scope === 'user') return section.id;
  return `${section.id}@${vaultId ?? 'default'}`;
}

export class ConfigService {
  private device = deviceId();
  private vaultId: string | null = null;
  private applying = false;
  private started = false;
  private unsubscribes: Array<() => void> = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pending = new Set<string>();
  private cloudRetry = new Set<string>();

  private state: ConfigSyncState = {
    status: 'idle',
    lastSyncedAt: null,
    error: null,
    hydrated: false,
  };
  private stateListeners = new Set<(s: ConfigSyncState) => void>();

  /* ------------------------------ state ------------------------------ */

  getState(): ConfigSyncState {
    return this.state;
  }

  onStateChange(cb: (s: ConfigSyncState) => void): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  private setState(patch: Partial<ConfigSyncState>) {
    this.state = { ...this.state, ...patch };
    this.stateListeners.forEach((cb) => cb(this.state));
  }

  /* ----------------------------- lifecycle ---------------------------- */

  /** Hydrate everything and start watching for changes. */
  async start(vaultId: string | null): Promise<void> {
    this.vaultId = vaultId;
    await this.hydrate();
    if (!this.started) {
      this.started = true;
      this.watchSections();
    }
    void this.pullFromCloud();
  }

  /** Re-hydrate vault-scoped sections after switching vaults. */
  async setVault(vaultId: string | null): Promise<void> {
    if (this.vaultId === vaultId) return;
    await this.flush();
    this.vaultId = vaultId;
    await this.hydrate();
    void this.pullFromCloud();
  }

  stop(): void {
    this.unsubscribes.forEach((u) => u());
    this.unsubscribes = [];
    this.started = false;
  }

  private watchSections() {
    for (const section of listConfigSections()) {
      this.unsubscribes.push(
        section.subscribe(() => {
          if (this.applying) return;
          this.pending.add(section.id);
          this.scheduleSave();
        })
      );
    }
  }

  /* ------------------------------ hydrate ----------------------------- */

  private async localDoc(scope: 'user' | 'vault'): Promise<ConfigDocument> {
    const key = scope === 'user' ? 'user' : `vault:${this.vaultId ?? 'default'}`;
    return (await localConfigStore.get(key)) ?? emptyDocument(this.device);
  }

  private async hydrate(): Promise<void> {
    const userDoc = await this.localDoc('user');
    const vaultDoc = await this.localDoc('vault');

    this.applying = true;
    try {
      for (const section of listConfigSections()) {
        const doc = section.scope === 'user' ? userDoc : vaultDoc;
        const record = doc.sections[section.id];
        if (!record) continue;
        this.applyRecord(section, record);
      }
    } finally {
      this.applying = false;
    }

    this.setState({ hydrated: true });
  }

  private applyRecord(section: ConfigSection, record: SectionRecord): void {
    try {
      const value =
        record.version !== section.version && section.migrate
          ? section.migrate(record.data, record.version)
          : record.data;
      if (value === undefined || value === null) return;
      section.write(value as never);
    } catch (err) {
      console.warn(`ConfigService: failed to apply section "${section.id}"`, err);
    }
  }

  /* ------------------------------- save ------------------------------- */

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.setState({ status: 'saving' });
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.persist();
    }, SAVE_DEBOUNCE_MS);
  }

  /** Persist pending changes immediately (used on unload / vault switch). */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.persist();
  }

  private async persist(): Promise<void> {
    const sections = listConfigSections();
    if (sections.length === 0) return;

    const now = Date.now();
    const userDoc = await this.localDoc('user');
    const vaultDoc = await this.localDoc('vault');

    const cloudEntries: Array<{ key: string; record: SectionRecord }> = [];
    const ids = new Set([...this.pending, ...this.cloudRetry]);
    this.pending.clear();

    for (const section of sections) {
      const shouldSave = ids.has(section.id) || !((section.scope === 'user' ? userDoc : vaultDoc).sections[section.id]);
      if (!shouldSave) continue;

      let data: unknown;
      try {
        data = section.read();
      } catch {
        continue;
      }
      const record: SectionRecord = { version: section.version, data, updatedAt: now };
      const doc = section.scope === 'user' ? userDoc : vaultDoc;
      doc.sections[section.id] = record;
      doc.updatedAt = now;
      doc.deviceId = this.device;
      doc.schemaVersion = CONFIG_SCHEMA_VERSION;
      cloudEntries.push({ key: scopedKey(section, this.vaultId), record });
    }

    await localConfigStore.set('user', userDoc);
    await localConfigStore.set(`vault:${this.vaultId ?? 'default'}`, vaultDoc);

    if (cloudEntries.length === 0) {
      this.setState({ status: 'saved', error: null });
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      cloudEntries.forEach((e) => this.cloudRetry.add(e.key.split('@')[0]));
      this.setState({ status: 'offline' });
      return;
    }

    try {
      if (!(await cloudConfigStore.isAuthenticated())) {
        this.setState({ status: 'saved', error: null });
        return;
      }
      await cloudConfigStore.saveSections(cloudEntries, this.device);
      this.cloudRetry.clear();
      this.setState({ status: 'saved', lastSyncedAt: Date.now(), error: null });
    } catch (err) {
      // Fail silently for the user; queue for the next save attempt.
      cloudEntries.forEach((e) => this.cloudRetry.add(e.key.split('@')[0]));
      this.setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Could not sync settings',
      });
    }
  }

  /* ----------------------------- cloud pull --------------------------- */

  /** Pull cloud settings and apply any that are newer than the local copy. */
  async pullFromCloud(): Promise<void> {
    try {
      if (!(await cloudConfigStore.isAuthenticated())) return;
      const rows = await cloudConfigStore.loadAll();
      if (Object.keys(rows).length === 0) {
        // First sign-in on this account: push what we have locally.
        listConfigSections().forEach((s) => this.pending.add(s.id));
        await this.persist();
        return;
      }

      const userDoc = await this.localDoc('user');
      const vaultDoc = await this.localDoc('vault');

      this.applying = true;
      try {
        for (const section of listConfigSections()) {
          const row = rows[scopedKey(section, this.vaultId)];
          if (!row) continue;
          const local = (section.scope === 'user' ? userDoc : vaultDoc).sections[section.id];
          // Newest wins; local wins on a tie.
          if (local && local.updatedAt >= row.updatedAt) continue;

          const record: SectionRecord = {
            version: row.version,
            data: row.data,
            updatedAt: row.updatedAt,
          };
          this.applyRecord(section, record);
          const doc = section.scope === 'user' ? userDoc : vaultDoc;
          doc.sections[section.id] = record;
        }
      } finally {
        this.applying = false;
      }

      await localConfigStore.set('user', userDoc);
      await localConfigStore.set(`vault:${this.vaultId ?? 'default'}`, vaultDoc);
      this.setState({ status: 'saved', lastSyncedAt: Date.now(), error: null });
    } catch (err) {
      this.setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Could not load cloud settings',
      });
    }
  }

  /* --------------------------- export / import ------------------------ */

  /** Whole configuration as one JSON object per section (".obmap" folder). */
  exportConfig(): { schemaVersion: number; exportedAt: string; files: Record<string, SectionRecord> } {
    const files: Record<string, SectionRecord> = {};
    for (const section of listConfigSections()) {
      files[`${section.id}.json`] = {
        version: section.version,
        data: section.read(),
        updatedAt: Date.now(),
      };
    }
    return { schemaVersion: CONFIG_SCHEMA_VERSION, exportedAt: new Date().toISOString(), files };
  }

  /** Validate and apply an exported configuration. Returns applied section ids. */
  async importConfig(payload: unknown): Promise<string[]> {
    if (!payload || typeof payload !== 'object') {
      throw new Error('That file is not a valid configuration export.');
    }
    const files = (payload as { files?: unknown }).files;
    const sectionsFromDoc = isConfigDocument(payload) ? payload.sections : undefined;
    const source = (files ?? sectionsFromDoc) as Record<string, SectionRecord> | undefined;
    if (!source || typeof source !== 'object') {
      throw new Error('That file is not a valid configuration export.');
    }

    const applied: string[] = [];
    this.applying = true;
    try {
      for (const [rawKey, record] of Object.entries(source)) {
        const id = rawKey.replace(/\.json$/, '');
        const section = getConfigSection(id);
        if (!section || !record || typeof record !== 'object') continue;
        if (typeof record.version !== 'number' || record.data === undefined) continue;
        this.applyRecord(section, record);
        applied.push(id);
      }
    } finally {
      this.applying = false;
    }

    if (applied.length === 0) {
      throw new Error('No recognised settings were found in that file.');
    }

    applied.forEach((id) => this.pending.add(id));
    await this.flush();
    return applied;
  }

  /** Restore built-in defaults for every registered section. */
  async resetAll(): Promise<void> {
    this.applying = true;
    try {
      for (const section of listConfigSections()) {
        section.reset?.();
      }
    } finally {
      this.applying = false;
    }
    listConfigSections().forEach((s) => this.pending.add(s.id));
    await this.flush();
  }
}

export const configService = new ConfigService();
