/**
 * Relationship Mapper - Graph Service Component
 * 
 * Maps both hierarchical and semantic relationships into nodes and edges
 */

export interface GraphNode {
  id: string;
  name: string;
  content: string;
  type: 'folder' | 'file' | 'media';
  parentId: string | null;
  depth: number;
  tags: string[];
  wikilinks?: string[];
  mediaType?: 'image' | 'audio' | 'video';
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'hierarchy' | 'semantic';
}

export class RelationshipMapper {
  private nodes: Map<string, GraphNode> = new Map();
  private links: GraphLink[] = [];

  /**
   * Add a folder node
   */
  addFolder(id: string, name: string, parentId: string | null, depth: number): void {
    this.nodes.set(id, {
      id,
      name,
      content: '',
      type: 'folder',
      parentId,
      depth,
      tags: parentId === null ? ['vault-root'] : [],
    });

    // Create hierarchical link to parent
    if (parentId) {
      this.links.push({
        source: parentId,
        target: id,
		 type: 'hierarchy',
      });
    }
  }

  /**
   * Add a file node with semantic information
   */
  addFile(
    id: string,
    name: string,
    content: string,
    parentId: string | null,
    depth: number,
    tags: string[],
    wikilinks: string[]
  ): void {
    this.nodes.set(id, {
      id,
      name,
      content,
      type: 'file',
      parentId,
      depth,
      tags,
      wikilinks,
    });

    // Create hierarchical link to parent folder
    if (parentId) {
      this.links.push({
        source: parentId,
        target: id,
		 type: 'hierarchy',
      });
    }
  }

  /**
   * Add semantic links based on wikilinks
   */
  addSemanticLinks(): void {
    // Create a name-to-id mapping for wikilink resolution
    const nameMap = new Map<string, string>();
    this.nodes.forEach((node, id) => {
      if (node.type === 'file') {
        nameMap.set(node.name.toLowerCase(), id);
      }
    });

    // Create semantic links for wikilinks
    this.nodes.forEach((node, sourceId) => {
      if (node.wikilinks) {
        node.wikilinks.forEach(wikilink => {
          const targetId = nameMap.get(wikilink.toLowerCase());
          if (targetId && targetId !== sourceId) {
            // Check if link already exists
            const linkExists = this.links.some(
              link =>
                link.source === sourceId &&
                link.target === targetId &&
                link.type === 'semantic'
            );

            if (!linkExists) {
              this.links.push({
                source: sourceId,
                target: targetId,
                type: 'semantic',
              });
            }
          }
        });
      }
    });
  }

  /**
   * Get the complete graph structure
   */
  getGraph(): { nodes: GraphNode[]; links: GraphLink[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      links: [...this.links],
    };
  }

  /**
   * Set a node directly (for restoring from storage)
   */
  setNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  /**
   * Delete a node
   */
  deleteNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    // Also remove any links involving this node
    this.links = this.links.filter(
      link => link.source !== nodeId && link.target !== nodeId
    );
  }

  /**
   * Set links directly (for restoring from storage)
   */
  setLinks(links: GraphLink[]): void {
    this.links = [...links];
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.nodes.clear();
    this.links = [];
  }
}
