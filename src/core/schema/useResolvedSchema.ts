import { useMemo } from 'react';
import { resolveSchema } from './resolve';
import { useSchemaStore } from './useSchemaStore';
import type { ResolvedProperty } from './types';

/** Effective (global -> note) property rules for a given note's frontmatter. */
export function useResolvedSchema(frontmatter?: Record<string, unknown>): ResolvedProperty[] {
  const schema = useSchemaStore((s) => s.schema);
  return useMemo(() => resolveSchema(schema, frontmatter), [schema, frontmatter]);
}
