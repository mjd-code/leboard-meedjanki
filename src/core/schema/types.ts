/**
 * Cascading property schema — the "global context" configured in the Unified
 * Settings Hub and inherited (then optionally overridden) by every note.
 */

export type SchemaPropertyType =
  | 'text'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'tags'
  | 'list';

/** How the frontmatter manager surfaces a property. */
export type PropertyVisibility = 'always' | 'collapsed' | 'hidden';

export interface PropertyRule {
  key: string;
  type: SchemaPropertyType;
  /** Mandatory properties are always seeded and cannot be removed from a note. */
  required: boolean;
  visibility: PropertyVisibility;
  /** Default value written when the property is seeded into a note. */
  defaultValue?: string;
  /** Taxonomy namespace suggested for tag-like properties, e.g. `century/`. */
  taxonomyPrefix?: string;
  /** Short help text shown in the settings hub. */
  description?: string;
  /** Reserved for Phase 2 role-based protection. */
  locked?: boolean;
}

export interface VaultSchema {
  version: 1;
  /** Phase 2 linter switch; stored now so the setting survives migrations. */
  strictMode: boolean;
  properties: PropertyRule[];
}

export type RuleSource = 'global' | 'note';

export interface ResolvedProperty extends PropertyRule {
  source: RuleSource;
}
