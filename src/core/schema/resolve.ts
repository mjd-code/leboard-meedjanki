/**
 * Cascading resolver: global vault schema -> note-level overrides.
 *
 * A note overrides rules through a `schema` mapping in its own frontmatter:
 *
 * ```yaml
 * schema:
 *   status: { required: false, visibility: collapsed }
 * ```
 */

import { normalizeRule } from './schema-registry';
import type { PropertyRule, ResolvedProperty, VaultSchema } from './types';

const VISIBILITY_ORDER = { always: 0, collapsed: 1, hidden: 2 } as const;

export function parseNoteOverrides(frontmatter: Record<string, unknown> | undefined): Record<string, Partial<PropertyRule>> {
  const raw = frontmatter?.schema;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, Partial<PropertyRule>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const rule = normalizeRule({ key, ...(value as Record<string, unknown>) });
    if (rule) out[key] = rule;
  }
  return out;
}

/**
 * Effective rules for a note. Mandatory properties come first, then always
 * visible, then collapsed; hidden rules stay in the list so callers can decide.
 */
export function resolveSchema(
  schema: VaultSchema,
  frontmatter?: Record<string, unknown>
): ResolvedProperty[] {
  const overrides = parseNoteOverrides(frontmatter);

  const resolved: ResolvedProperty[] = schema.properties.map((rule) => {
    const override = overrides[rule.key];
    if (!override) return { ...rule, source: 'global' };
    return { ...rule, ...override, key: rule.key, source: 'note' };
  });

  // Note-only rules that have no global counterpart.
  for (const [key, override] of Object.entries(overrides)) {
    if (resolved.some((r) => r.key === key)) continue;
    resolved.push({
      key,
      type: override.type ?? 'text',
      required: Boolean(override.required),
      visibility: override.visibility ?? 'always',
      defaultValue: override.defaultValue,
      taxonomyPrefix: override.taxonomyPrefix,
      description: override.description,
      locked: override.locked,
      source: 'note',
    });
  }

  return resolved.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return VISIBILITY_ORDER[a.visibility] - VISIBILITY_ORDER[b.visibility];
  });
}

export const requiredKeys = (rules: ResolvedProperty[]): string[] =>
  rules.filter((r) => r.required).map((r) => r.key);
