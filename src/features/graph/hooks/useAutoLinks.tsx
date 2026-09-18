import { useMemo } from "react";

interface Node {
  id: string;
  name: string;
  content: string;
  type: "folder" | "file" | "media";
  parentId: string | null;
  depth: number;
  tags: string[];
  wikilinks?: string[];
  mediaType?: "image" | "audio" | "video";
}

interface Link {
  source: string;
  target: string;
  type: "hierarchy" | "tag" | "backlink" | "semantic";
}

export interface AutoLinkConfig {
  hierarchy: boolean;
  tags: boolean;
  backlinks: boolean;
  tagThreshold: number;
}

export const DEFAULT_AUTO_LINK_CONFIG: AutoLinkConfig = {
  hierarchy: true,
  tags: true,
  backlinks: true,
  tagThreshold: 1,
};

/**
 * Hook that automatically generates network links between nodes
 * based on hierarchy, shared tags, and backlinks/wikilinks
 */
export function useAutoLinks(
  nodes: Node[],
  config: Partial<AutoLinkConfig> = {},
  /** Prefer the MetadataCache link index over re-deriving wikilinks here. */
  resolvedLinks?: Record<string, Record<string, number>>
): Link[] {
  const mergedConfig = { ...DEFAULT_AUTO_LINK_CONFIG, ...config };

  const autoLinks = useMemo(() => {
    const links: Link[] = [];
    const linkSet = new Set<string>();

    const addLink = (source: string, target: string, type: Link["type"]) => {
      const key = `${source}-${target}-${type}`;
      const reverseKey = `${target}-${source}-${type}`;
      
      if (!linkSet.has(key) && !linkSet.has(reverseKey) && source !== target) {
        links.push({ source, target, type });
        linkSet.add(key);
      }
    };

    // 1. Hierarchy links (parent-child relationships)
    if (mergedConfig.hierarchy) {
      nodes.forEach(node => {
        if (node.parentId) {
          addLink(node.parentId, node.id, "hierarchy");
        }
      });
    }

    // 2. Tag-based links (shared tags between files)
    if (mergedConfig.tags) {
      const fileNodes = nodes.filter(n => n.type === "file" && n.tags.length > 0);
      
      for (let i = 0; i < fileNodes.length; i++) {
        for (let j = i + 1; j < fileNodes.length; j++) {
          const nodeA = fileNodes[i];
          const nodeB = fileNodes[j];
          
          const sharedTags = nodeA.tags.filter(tag => 
            nodeB.tags.includes(tag)
          );
          
          if (sharedTags.length >= mergedConfig.tagThreshold) {
            addLink(nodeA.id, nodeB.id, "tag");
          }
        }
      }
    }

    // 3. Backlinks (from the MetadataCache link index when available)
    if (mergedConfig.backlinks) {
      const fileNodes = nodes.filter(n => n.type === "file");
      const existing = new Set(nodes.map(n => n.id));

      if (resolvedLinks) {
        Object.entries(resolvedLinks).forEach(([sourceId, targets]) => {
          if (!existing.has(sourceId)) return;
          Object.keys(targets).forEach(targetId => {
            if (existing.has(targetId)) addLink(sourceId, targetId, "backlink");
          });
        });
      } else {
        const nameToIdMap = new Map<string, string>();
        fileNodes.forEach(node => {
          nameToIdMap.set(node.name.toLowerCase(), node.id);
        });

        fileNodes.forEach(node => {
          node.wikilinks?.forEach(wikilinkName => {
            const targetId = nameToIdMap.get(wikilinkName.toLowerCase());
            if (targetId && targetId !== node.id) {
              addLink(node.id, targetId, "backlink");
            }
          });
        });
      }
    }

    return links;
  }, [nodes, resolvedLinks, mergedConfig.hierarchy, mergedConfig.tags, mergedConfig.backlinks, mergedConfig.tagThreshold]);

  return autoLinks;
}

/**
 * Get link color based on type for visualization
 */
export function getLinkColor(type: Link["type"]): string {
  switch (type) {
    case "hierarchy":
      return "hsl(var(--primary))";
    case "tag":
      return "hsl(var(--accent))";
    case "backlink":
      return "hsl(var(--secondary))";
    case "semantic":
      return "hsl(var(--muted-foreground))";
    default:
      return "hsl(var(--muted))";
  }
}

/**
 * Get link opacity based on type for visualization
 */
export function getLinkOpacity(type: Link["type"]): number {
  switch (type) {
    case "hierarchy":
      return 0.8;
    case "backlink":
      return 0.6;
    case "tag":
      return 0.4;
    case "semantic":
      return 0.3;
    default:
      return 0.5;
  }
}
