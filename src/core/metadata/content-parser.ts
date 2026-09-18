/**
 * Content Parser - Graph Service Component
 * 
 * Extracts semantic information from markdown content:
 * - Wikilinks (internal connections)
 * - Tags (semantic grouping)
 * - Frontmatter metadata
 */

export interface ParsedContent {
  wikilinks: string[];
  tags: string[];
  frontmatter: Record<string, any>;
}

export class ContentParser {
  /**
   * Extract wikilinks from markdown content
   */
  extractWikilinks(content: string): Array<{ target: string; alias?: string }> {
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const wikilinks: Array<{ target: string; alias?: string }> = [];
    let match;

    while ((match = wikilinkRegex.exec(content)) !== null) {
      wikilinks.push({
        target: match[1].trim(),
        alias: match[2]?.trim(),
      });
    }

    return wikilinks;
  }

  /**
   * Extract tags from markdown content
   */
  extractTags(content: string): string[] {
    const tagRegex = /#([a-zA-Z0-9_/-]+)/g;
    const tags: string[] = [];
    let match;

    while ((match = tagRegex.exec(content)) !== null) {
      tags.push(match[1]);
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Parse frontmatter from markdown content
   */
  parseFrontmatter(content: string): {
    metadata: Record<string, any>;
    contentWithoutFrontmatter: string;
  } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { metadata: {}, contentWithoutFrontmatter: content };
    }

    const [, frontmatterText, mainContent] = match;
    const metadata: Record<string, any> = {};

    frontmatterText.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      if (!key) return;

      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        metadata[key] = value
          .slice(1, -1)
          .split(',')
          .map(v => v.trim())
          .filter(v => v);
      } else if (value === 'null') {
        metadata[key] = null;
      } else if (!isNaN(Number(value))) {
        metadata[key] = Number(value);
      } else {
        metadata[key] = value;
      }
    });

    return { metadata, contentWithoutFrontmatter: mainContent };
  }

  /**
   * Parse all semantic information from content
   */
  parse(content: string): ParsedContent {
    const { metadata, contentWithoutFrontmatter } = this.parseFrontmatter(content);
    const wikilinks = this.extractWikilinks(contentWithoutFrontmatter).map(wl => wl.target);
    const tags = metadata.tags || this.extractTags(contentWithoutFrontmatter);

    return {
      wikilinks,
      tags,
      frontmatter: metadata,
    };
  }
}
