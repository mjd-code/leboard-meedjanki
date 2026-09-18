/**
 * SchemaRegistry — defaults, normalisation and versioning for the vault schema
 * that lives inside `graph_config.schema`.
 */

import type { PropertyRule, SchemaPropertyType, PropertyVisibility, VaultSchema } from './types';

export const SCHEMA_VERSION = 1 as const;

export const PROPERTY_TYPES: SchemaPropertyType[] = [
  'text',
  'number',
  'date',
  'checkbox',
  'select',
  'tags',
  'list',
];

export const VISIBILITY_OPTIONS: { value: PropertyVisibility; label: string; hint: string }[] = [
  { value: 'always', label: 'Always visible', hint: 'Pinned at the top of every note.' },
  { value: 'collapsed', label: 'In accordion', hint: 'Hidden behind “System config”.' },
  { value: 'hidden', label: 'Hidden', hint: 'Kept in the file, not shown in the UI.' },
];

export const DEFAULT_SCHEMA: VaultSchema = {
  version: SCHEMA_VERSION,
  strictMode: false,
  properties: [
    { key: 'title', type: 'text', required: true, visibility: 'always', description: 'Display title of the entry.' },
    {
      key: 'status',
      type: 'select',
      required: true,
      visibility: 'always',
      defaultValue: 'draft',
      description: 'Editorial state: draft, review or published.',
      locked: true,
    },
    { key: 'tags', type: 'tags', required: false, visibility: 'always', taxonomyPrefix: '', description: 'Taxonomy tags.' },
    { key: 'created', type: 'date', required: false, visibility: 'collapsed', description: 'Creation date.' },
  ],
};

const isType = (v: unknown): v is SchemaPropertyType =>
  typeof v === 'string' && (PROPERTY_TYPES as string[]).includes(v);

const isVisibility = (v: unknown): v is PropertyVisibility =>
  v === 'always' || v === 'collapsed' || v === 'hidden';

export function normalizeRule(raw: unknown): PropertyRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const key = typeof r.key === 'string' ? r.key.trim() : '';
  if (!key) return null;
  return {
    key,
    type: isType(r.type) ? r.type : 'text',
    required: Boolean(r.required),
    visibility: isVisibility(r.visibility) ? r.visibility : 'always',
    defaultValue: typeof r.defaultValue === 'string' ? r.defaultValue : undefined,
    taxonomyPrefix: typeof r.taxonomyPrefix === 'string' ? r.taxonomyPrefix : undefined,
    description: typeof r.description === 'string' ? r.description : undefined,
    locked: Boolean(r.locked),
  };
}

/** Every read goes through here, so older vaults never crash the hub. */
export function normalizeSchema(raw: unknown): VaultSchema {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SCHEMA, properties: [...DEFAULT_SCHEMA.properties] };
  const r = raw as Record<string, unknown>;
  const properties = Array.isArray(r.properties)
    ? (r.properties.map(normalizeRule).filter(Boolean) as PropertyRule[])
    : [...DEFAULT_SCHEMA.properties];

  const seen = new Set<string>();
  const unique = properties.filter((p) => {
    const k = p.key.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    version: SCHEMA_VERSION,
    strictMode: Boolean(r.strictMode),
    properties: unique,
  };
}
