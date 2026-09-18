/**
 * Vault schema store.
 *
 * The schema is persisted locally for instant availability and mirrored into
 * the vault's `graph_config.schema` so it travels with cloud sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getVaultManager } from '@/core/vault/VaultManagerSingleton';
import { DEFAULT_SCHEMA, normalizeSchema } from './schema-registry';
import type { PropertyRule, VaultSchema } from './types';

interface SchemaState {
  schema: VaultSchema;
  setStrictMode: (strict: boolean) => void;
  addProperty: (rule?: Partial<PropertyRule>) => void;
  updateProperty: (key: string, updates: Partial<PropertyRule>) => void;
  removeProperty: (key: string) => void;
  moveProperty: (key: string, direction: -1 | 1) => void;
  resetSchema: () => void;
  hydrateFromVault: (vaultId: string) => void;
  persistToVault: (vaultId: string) => Promise<void>;
}

const cloneDefaults = (): VaultSchema => ({
  ...DEFAULT_SCHEMA,
  properties: DEFAULT_SCHEMA.properties.map((p) => ({ ...p })),
});

const uniqueKey = (properties: PropertyRule[]): string => {
  let i = 1;
  let key = 'property';
  while (properties.some((p) => p.key === key)) {
    i += 1;
    key = `property_${i}`;
  }
  return key;
};

export const useSchemaStore = create<SchemaState>()(
  persist(
    (set, get) => ({
      schema: cloneDefaults(),

      setStrictMode: (strictMode) => set((s) => ({ schema: { ...s.schema, strictMode } })),

      addProperty: (rule) =>
        set((s) => ({
          schema: {
            ...s.schema,
            properties: [
              ...s.schema.properties,
              {
                key: rule?.key?.trim() || uniqueKey(s.schema.properties),
                type: rule?.type ?? 'text',
                required: rule?.required ?? false,
                visibility: rule?.visibility ?? 'always',
                defaultValue: rule?.defaultValue,
                taxonomyPrefix: rule?.taxonomyPrefix,
                description: rule?.description,
                locked: rule?.locked,
              },
            ],
          },
        })),

      updateProperty: (key, updates) =>
        set((s) => ({
          schema: {
            ...s.schema,
            properties: s.schema.properties.map((p) => (p.key === key ? { ...p, ...updates } : p)),
          },
        })),

      removeProperty: (key) =>
        set((s) => ({
          schema: { ...s.schema, properties: s.schema.properties.filter((p) => p.key !== key) },
        })),

      moveProperty: (key, direction) =>
        set((s) => {
          const properties = [...s.schema.properties];
          const index = properties.findIndex((p) => p.key === key);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= properties.length) return s;
          [properties[index], properties[target]] = [properties[target], properties[index]];
          return { schema: { ...s.schema, properties } };
        }),

      resetSchema: () => set({ schema: cloneDefaults() }),

      hydrateFromVault: (vaultId) => {
        try {
          const config = getVaultManager().getGraphConfig(vaultId);
          if (config?.schema) set({ schema: normalizeSchema(config.schema) });
        } catch {
          // A missing or unreadable vault config just keeps the local schema.
        }
      },

      persistToVault: async (vaultId) => {
        try {
          const manager = getVaultManager();
          const config = manager.getGraphConfig(vaultId) || {};
          await manager.setGraphConfig(vaultId, { ...config, schema: get().schema });
        } catch {
          // Offline / no vault selected — local persistence still holds the schema.
        }
      },
    }),
    {
      name: 'obmap-vault-schema',
      partialize: (state) => ({ schema: state.schema }),
      merge: (persisted, current) => {
        const p = persisted as { schema?: unknown } | undefined;
        return { ...current, schema: p?.schema ? normalizeSchema(p.schema) : current.schema };
      },
    }
  )
);
