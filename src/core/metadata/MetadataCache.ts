/**
 * MetadataCache
 *
 * In-memory incremental index of note metadata (wikilinks, tags, frontmatter,
 * headings) plus resolved/unresolved link maps and backlinks.
 *
 * Indexing is synchronous and content-hash guarded: re-indexing a vault only
 * re-parses notes whose content actually changed.
 */

import { extractWikilinks } from './markdown-parser';
import type { Node } from '@/shared/stores/types';

export interface HeadingCache {
  heading: string;
  level: number;
  line: number;
}

export interface CachedMetadata {
  /** Resolved-by-name wikilink targets (raw target text, no alias). */
  links: string[];
  /** Tags from body hashtags + frontmatter `tags`. */
  tags: string[];
  frontmatter: Record<string, unknown>;
  headings: HeadingCache[];
  wordCount: number;
}

export interface BacklinkRef {
  nodeId: string;
  nodeName: string;
  count: number;
}

const EMPTY: CachedMetadata = {
  links: [],
  tags: [],
  frontmatter: {},
  headings: [],
  wordCount: 0,
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

const stripValue = (raw: string): unknown => {
  const value = raw.trim().replace(/^['"]|['"]$/g, '');
  if (value === '') return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
};

/** Minimal YAML frontmatter reader: scalars, inline lists and dash lists. */
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter: Record<string, unknown> = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey: string | null = null;

  lines.forEach((line) => {
    if (/^\s*-\s+/.test(line) && currentKey) {
      const item = stripValue(line.replace(/^\s*-\s+/, ''));
      const existing = frontmatter[currentKey];
      frontmatter[currentKey] = Array.isArray(existing) ? [...existing, item] : [item];
      return;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_\-. ]+):\s*(.*)$/);
    if (!keyMatch) return;
    const key = keyMatch[1].trim();
    const rest = keyMatch[2].trim();
    currentKey = key;

    if (rest === '') {
      frontmatter[key] = [];
      return;
    }
    if (rest.startsWith('[') && rest.endsWith(']')) {
      frontmatter[key] = rest
        .slice(1, -1)
        .split(',')
        .map((part) => stripValue(part))
        .filter((part) => part !== '');
      return;
    }
    frontmatter[key] = stripValue(rest);
  });

  return { frontmatter, body: content.slice(match[0].length) };
}

const collectFrontmatterTags = (frontmatter: Record<string, unknown>): string[] => {
  const raw = frontmatter.tags ?? frontmatter.tag;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(/[,\s]+/);
  return list
    .map((tag) => String(tag).trim().replace(/^#/, ''))
    .filter(Boolean);
};

/** Parse one note body into metadata. */
export function parseNoteMetadata(content: string): CachedMetadata {
  if (!content) return { ...EMPTY };

  const { frontmatter, body } = parseFrontmatter(content);

  // Ignore fenced code blocks when scanning for tags.
  const scannable = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');

  const tags = new Set<string>(collectFrontmatterTags(frontmatter));
  const hashtags = scannable.match(/(^|\s)#([\w\-/]+)/g);
  hashtags?.forEach((raw) => tags.add(raw.trim().slice(1)));

  const headings: HeadingCache[] = [];
  body.split(/\r?\n/).forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.*\S)\s*$/);
    if (match) {
      headings.push({ level: match[1].length, heading: match[2], line: index });
    }
  });

  const links = Array.from(
    new Set(extractWikilinks(body).map((link) => link.target.split('#')[0].trim()))
  ).filter(Boolean);

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  return { links, tags: Array.from(tags), frontmatter, headings, wordCount: words };
}

/** Merge parsed metadata into a node (tags union, wikilinks from content). */
export function enrichNode(node: Node, meta: CachedMetadata): Node {
  if (node.type === 'folder') return node;
  const tags = Array.from(new Set([...(node.tags ?? []), ...meta.tags]));
  const sameTags =
    tags.length === (node.tags?.length ?? 0) &&
    tags.every((tag) => node.tags?.includes(tag));
  const sameLinks =
    meta.links.length === (node.wikilinks?.length ?? 0) &&
    meta.links.every((link) => node.wikilinks?.includes(link));
  if (sameTags && sameLinks) return node;
  return { ...node, tags, wikilinks: meta.links };
}

class MetadataCacheImpl {
  private entries = new Map<string, { content: string; meta: CachedMetadata }>();
  private backlinksMap = new Map<string, BacklinkRef[]>();
  private tagCounts = new Map<string, number>();

  /** source id -> target id -> count */
  resolvedLinks: Record<string, Record<string, number>> = {};
  /** source id -> unresolved link name -> count */
  unresolvedLinks: Record<string, Record<string, number>> = {};

  private version = 0;
  private listeners = new Set<() => void>();

  getVersion() {
    return this.version;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  getFileCache(nodeId: string): CachedMetadata | null {
    return this.entries.get(nodeId)?.meta ?? null;
  }

  getBacklinks(nodeId: string): BacklinkRef[] {
    return this.backlinksMap.get(nodeId) ?? [];
  }

  getTags(): Map<string, number> {
    return new Map(this.tagCounts);
  }

  getAllTags(): string[] {
    return Array.from(this.tagCounts.keys()).sort();
  }

  /** Metadata for a single note without touching the shared index. */
  parse(content: string): CachedMetadata {
    return parseNoteMetadata(content);
  }

  /**
   * Re-index the vault. Returns nodes enriched with derived tags/wikilinks
   * (same array identity when nothing changed).
   */
  index(nodes: Node[]): Node[] {
    let changed = false;
    const live = new Set<string>();

    const enriched = nodes.map((node) => {
      live.add(node.id);
      if (node.type === 'folder') {
        this.entries.set(node.id, { content: '', meta: { ...EMPTY } });
        return node;
      }
      const existing = this.entries.get(node.id);
      const meta =
        existing && existing.content === node.content
          ? existing.meta
          : parseNoteMetadata(node.content ?? '');
      if (!existing || existing.content !== node.content) {
        this.entries.set(node.id, { content: node.content ?? '', meta });
        changed = true;
      }
      const next = enrichNode(node, meta);
      if (next !== node) changed = true;
      return next;
    });

    this.entries.forEach((_, id) => {
      if (!live.has(id)) {
        this.entries.delete(id);
        changed = true;
      }
    });

    this.rebuildLinkMaps(enriched);
    if (changed) this.notify();
    return changed ? enriched : nodes;
  }

  private rebuildLinkMaps(nodes: Node[]) {
    const byName = new Map<string, Node>();
    nodes.forEach((node) => {
      if (node.type !== 'folder') byName.set(node.name.toLowerCase(), node);
    });

    const resolved: Record<string, Record<string, number>> = {};
    const unresolved: Record<string, Record<string, number>> = {};
    const backlinks = new Map<string, BacklinkRef[]>();
    const tagCounts = new Map<string, number>();

    nodes.forEach((node) => {
      const meta = this.entries.get(node.id)?.meta;
      if (!meta) return;

      meta.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1));
      (node.tags ?? []).forEach((tag) => {
        if (!meta.tags.includes(tag)) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      });

      meta.links.forEach((linkName) => {
        const target = byName.get(linkName.toLowerCase());
        if (target && target.id !== node.id) {
          resolved[node.id] = resolved[node.id] ?? {};
          resolved[node.id][target.id] = (resolved[node.id][target.id] ?? 0) + 1;

          const list = backlinks.get(target.id) ?? [];
          const found = list.find((ref) => ref.nodeId === node.id);
          if (found) found.count += 1;
          else list.push({ nodeId: node.id, nodeName: node.name, count: 1 });
          backlinks.set(target.id, list);
        } else if (!target) {
          unresolved[node.id] = unresolved[node.id] ?? {};
          unresolved[node.id][linkName] = (unresolved[node.id][linkName] ?? 0) + 1;
        }
      });
    });

    this.resolvedLinks = resolved;
    this.unresolvedLinks = unresolved;
    this.backlinksMap = backlinks;
    this.tagCounts = tagCounts;
  }

  clear() {
    this.entries.clear();
    this.backlinksMap.clear();
    this.tagCounts.clear();
    this.resolvedLinks = {};
    this.unresolvedLinks = {};
    this.notify();
  }
}

export const metadataCache = new MetadataCacheImpl();
export type MetadataCache = MetadataCacheImpl;
