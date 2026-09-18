/**
 * Markdown parsing utilities for wikilinks, tags, and other Obsidian-like features
 */

export interface WikiLink {
  text: string;
  target: string;
  alias?: string;
}

export interface ParsedContent {
  wikilinks: WikiLink[];
  tags: string[];
  mentions: string[];
}

/**
 * Extract wikilinks from markdown content
 * Supports formats: [[Note Name]], [[Note Name|Alias]]
 */
export function extractWikilinks(content: string): WikiLink[] {
  const wikilinks: WikiLink[] = [];
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  
  let match;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    const target = match[1].trim();
    const alias = match[2]?.trim();
    wikilinks.push({
      text: match[0],
      target,
      alias,
    });
  }
  
  return wikilinks;
}

/**
 * Extract hashtags from markdown content
 */
export function extractTags(content: string): string[] {
  const tags: string[] = [];
  
  // Extract hashtags from content (including multi-word tags)
  const hashtagRegex = /#[\w-]+/g;
  const matches = content.match(hashtagRegex);
  if (matches) {
    tags.push(...matches.map(tag => tag.substring(1)));
  }

  // Extract tags from YAML frontmatter
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const frontmatterMatch = content.match(frontmatterRegex);
  if (frontmatterMatch) {
    const yamlContent = frontmatterMatch[1];
    const tagsMatch = yamlContent.match(/tags:\s*\[(.*?)\]/);
    if (tagsMatch) {
      const yamlTags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
      tags.push(...yamlTags);
    }
  }

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Extract plain text mentions of note names (for unlinked mentions)
 */
export function extractMentions(content: string, noteName: string): boolean {
  // Remove wikilinks first to avoid false positives
  const contentWithoutLinks = content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '');
  
  // Case-insensitive search for the note name
  const regex = new RegExp(`\\b${noteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return regex.test(contentWithoutLinks);
}

/**
 * Parse full content for all features
 */
export function parseMarkdownContent(content: string): ParsedContent {
  return {
    wikilinks: extractWikilinks(content),
    tags: extractTags(content),
    mentions: [],
  };
}

/**
 * Convert wikilinks in markdown to clickable links
 */
export function processWikilinks(content: string, onWikilinkClick: (target: string) => void): string {
  return content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (match, target, alias) => {
      const displayText = alias || target;
      return `<span class="wikilink" data-target="${target}">${displayText}</span>`;
    }
  );
}

