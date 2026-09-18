/**
 * FileManager
 *
 * Vault-wide file operations that need to touch more than one note:
 * renaming with wikilink refactoring, orphan detection and link generation.
 *
 * All functions are pure: they take the current node list and return the next
 * one, so callers can commit a single undo/history entry per operation.
 */

import { metadataCache } from '@/core/metadata/MetadataCache';
import type { Node } from '@/shared/stores/types';

export interface RenameResult {
  /** Next node list (renamed note + every note whose links were rewritten). */
  nodes: Node[];
  /** Ids of notes whose content changed because of the rename. */
  updatedFiles: string[];
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** All `[[...]]` / `![[...]]` ranges in a document (start inclusive, end exclusive). */
export function wikilinkRanges(content: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const re = /!?\[\[[^\]]*\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

/**
 * Rewrite every wikilink pointing at `oldName` so it points at `newName`.
 * Handles `[[old]]`, `[[old|alias]]`, `[[old#heading]]`, `[[old#heading|alias]]`
 * and embeds (`![[old]]`). Returns the original string when nothing matched.
 */
export function rewriteWikilinks(content: string, oldName: string, newName: string): string {
  if (!content) return content;
  const target = oldName.trim().toLowerCase();
  let touched = false;

  const next = content.replace(
    /(!?)\[\[([^\]|#]+)(#[^\]|]+)?(\|[^\]]+)?\]\]/g,
    (whole, bang: string, link: string, heading = '', alias = '') => {
      if (link.trim().toLowerCase() !== target) return whole;
      touched = true;
      return `${bang}[[${newName}${heading}${alias}]]`;
    }
  );

  return touched ? next : content;
}

/**
 * Rename a note and rewrite all wikilinks referencing it across the vault.
 */
export function renameNode(nodes: Node[], nodeId: string, newName: string): RenameResult {
  const node = nodes.find((n) => n.id === nodeId);
  const name = newName.trim();
  if (!node || !name || name === node.name) {
    return { nodes, updatedFiles: [] };
  }

  const updatedFiles: string[] = [];
  const next = nodes.map((candidate) => {
    if (candidate.id === nodeId) return { ...candidate, name };
    if (candidate.type === 'folder' || !candidate.content) return candidate;
    const rewritten = rewriteWikilinks(candidate.content, node.name, name);
    if (rewritten === candidate.content) return candidate;
    updatedFiles.push(candidate.id);
    return { ...candidate, content: rewritten };
  });

  return { nodes: next, updatedFiles };
}

/** Notes with no incoming and no outgoing resolved links. */
export function getOrphans(nodes: Node[]): Node[] {
  return nodes.filter((node) => {
    if (node.type === 'folder') return false;
    const outgoing = Object.keys(metadataCache.resolvedLinks[node.id] ?? {}).length;
    const incoming = metadataCache.getBacklinks(node.id).length;
    return outgoing === 0 && incoming === 0;
  });
}

/** `[[Target]]` or `[[Target|alias]]`. */
export function generateWikilink(targetName: string, alias?: string): string {
  return alias && alias !== targetName ? `[[${targetName}|${alias}]]` : `[[${targetName}]]`;
}

/**
 * Turn plain-text mentions of `name` into wikilinks, skipping text that is
 * already inside a wikilink, inline code or a fenced code block.
 */
export function linkMentions(content: string, name: string): string {
  if (!content || !name) return content;
  const skip = [
    ...wikilinkRanges(content),
    ...matchRanges(content, /```[\s\S]*?```/g),
    ...matchRanges(content, /`[^`\n]*`/g),
  ];
  const re = new RegExp(`(?<![\\w[])${escapeRegExp(name)}(?![\\w\\]])`, 'gi');

  let result = '';
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const start = match.index;
    if (skip.some(([from, to]) => start >= from && start < to)) continue;
    result += content.slice(cursor, start) + generateWikilink(name, match[0]);
    cursor = start + match[0].length;
  }
  return cursor === 0 ? content : result + content.slice(cursor);
}

function matchRanges(content: string, re: RegExp): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}
