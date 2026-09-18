/**
 * Frontmatter helpers: reserved keys, tag normalization and YAML serialization
 * with selectable list layout (block / inline).
 */

import { stringify as stringifyYaml } from "yaml";
import type { FrontmatterProperty, FrontmatterPropertyType } from "@/features/editor/types";

export type ListLayout = "block" | "inline";

/** Keys with dedicated behaviour in the vault. */
export const RESERVED_KEYS = ["tags", "aliases", "cssclasses"] as const;
export type ReservedKey = (typeof RESERVED_KEYS)[number];

export const isReservedKey = (key: string): key is ReservedKey =>
  (RESERVED_KEYS as readonly string[]).includes(key.toLowerCase());

/** Reserved keys always behave as multi-value lists. */
export const reservedType = (key: string): FrontmatterPropertyType | null => {
  const k = key.toLowerCase();
  if (k === "tags") return "tags";
  if (k === "aliases" || k === "cssclasses") return "list";
  return null;
};

/** `#Status/In Progress` -> `Status/In-Progress` */
export function normalizeTag(raw: string, separator: "-" | "_" = "-"): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, separator)
    .replace(/[^\w\-/_]/g, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

/** Split a nested tag into its path segments. */
export const tagSegments = (tag: string): string[] => tag.split("/").filter(Boolean);

export const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => String(v)) : value ? [String(value)] : [];

const scalarToYaml = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  return stringifyYaml(value).trimEnd();
};

/** Serialize ordered properties into a YAML frontmatter block (no fences). */
export function propertiesToYaml(
  properties: FrontmatterProperty[],
  listLayout: ListLayout = "block"
): string {
  const lines: string[] = [];

  properties.forEach((property) => {
    const key = property.key.trim();
    if (!key) return;

    const isList = property.type === "tags" || property.type === "list" || Array.isArray(property.value);
    if (isList) {
      const items = toStringList(property.value);
      if (items.length === 0) {
        lines.push(`${key}: ${listLayout === "inline" ? "[]" : ""}`.trimEnd());
        return;
      }
      if (listLayout === "inline") {
        lines.push(`${key}: [${items.join(", ")}]`);
      } else {
        lines.push(`${key}:`);
        items.forEach((item) => lines.push(`  - ${item}`));
      }
      return;
    }

    lines.push(`${key}: ${scalarToYaml(property.value)}`.trimEnd());
  });

  return lines.join("\n");
}

/** Detect which list layout an existing YAML block uses. */
export function detectListLayout(raw: string): ListLayout {
  if (/^\s*-\s+/m.test(raw)) return "block";
  if (/:\s*\[/.test(raw)) return "inline";
  return "block";
}
