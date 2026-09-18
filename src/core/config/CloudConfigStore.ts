/**
 * Cloud configuration storage — one row per settings section in `user_settings`.
 *
 * Vault-scoped sections are stored under the key `<section>@<vaultId>` so that
 * locally-created vaults (which have no cloud row yet) still sync their config.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { SectionRecord } from './types';

export interface CloudSectionRow {
  key: string;
  version: number;
  data: unknown;
  updatedAt: number;
}

export class CloudConfigStore {
  async isAuthenticated(): Promise<boolean> {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  }

  /** Fetch every settings row of the signed-in user. */
  async loadAll(): Promise<Record<string, CloudSectionRow>> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('section, version, data, updated_at');

    if (error) throw new Error(error.message);

    const out: Record<string, CloudSectionRow> = {};
    for (const row of data ?? []) {
      out[row.section] = {
        key: row.section,
        version: row.version,
        data: row.data,
        updatedAt: new Date(row.updated_at).getTime(),
      };
    }
    return out;
  }

  /** Insert or update the given sections for the signed-in user. */
  async saveSections(
    entries: Array<{ key: string; record: SectionRecord }>,
    deviceId: string
  ): Promise<void> {
    if (entries.length === 0) return;

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) throw new Error('Not authenticated');

    const keys = entries.map((e) => e.key);
    const { data: existing, error: fetchError } = await supabase
      .from('user_settings')
      .select('id, section')
      .in('section', keys);

    if (fetchError) throw new Error(fetchError.message);

    const idBySection = new Map((existing ?? []).map((r) => [r.section, r.id]));

    const inserts = entries
      .filter((e) => !idBySection.has(e.key))
      .map((e) => ({
        user_id: user.id,
        section: e.key,
        version: e.record.version,
        data: (e.record.data ?? {}) as unknown as Json,
        device_id: deviceId,
      }));

    if (inserts.length > 0) {
      const { error } = await supabase.from('user_settings').insert(inserts);
      if (error) throw new Error(error.message);
    }

    for (const entry of entries) {
      const id = idBySection.get(entry.key);
      if (!id) continue;
      const { error } = await supabase
        .from('user_settings')
        .update({
          version: entry.record.version,
          data: (entry.record.data ?? {}) as unknown as Json,
          device_id: deviceId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
  }
}

export const cloudConfigStore = new CloudConfigStore();
