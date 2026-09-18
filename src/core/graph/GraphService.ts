/**
 * Graph Service - Computation and Optimization Layer
 * 
 * Responsibilities:
 * - Consume events from Persistence Service asynchronously
 * - Parse content and extract wikilinks, frontmatter, tags
 * - Map hierarchical and semantic relationships
 * - Maintain optimized graph representation
 * - Expose graph data for visualization
 */

import { eventBus, EventType, DomainEvent } from '@/shared/events/events';
import { ContentParser } from '@/core/metadata/content-parser';
import { RelationshipMapper, GraphNode, GraphLink } from './RelationshipMapper';

// Event payload interfaces for type safety
interface FolderCreatedPayload {
  id: string;
  name: string;
  path: string[];
  parentId: string | null;
}

interface NoteCreatedPayload {
  id: string;
  name: string;
  content: string;
  path: string[];
  parentId: string | null;
}

interface NoteUpdatedPayload {
  id: string;
  content: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export class GraphService {
  private parser: ContentParser;
  private mapper: RelationshipMapper;
  private unsubscribers: Array<() => void> = [];
  private depthMap: Map<string, number> = new Map();

  constructor() {
    this.parser = new ContentParser();
    this.mapper = new RelationshipMapper();
  }

  /**
   * Initialize graph service and subscribe to domain events
   */
  initialize(): void {
    // Subscribe to vault opened events
    this.unsubscribers.push(
      eventBus.subscribe(EventType.VAULT_OPENED, this.handleVaultOpened.bind(this))
    );

    // Subscribe to folder created events
    this.unsubscribers.push(
      eventBus.subscribe(EventType.FOLDER_CREATED, this.handleFolderCreated.bind(this))
    );

    // Subscribe to note created events
    this.unsubscribers.push(
      eventBus.subscribe(EventType.NOTE_CREATED, this.handleNoteCreated.bind(this))
    );

    // Subscribe to note updated events
    this.unsubscribers.push(
      eventBus.subscribe(EventType.NOTE_UPDATED, this.handleNoteUpdated.bind(this))
    );
  }

  /**
   * Handle vault opened event
   */
  private handleVaultOpened(_event: DomainEvent): void {
    // Reset graph state when a new vault is opened
    this.mapper.clear();
    this.depthMap.clear();
  }

  /**
   * Handle folder created event
   */
  private handleFolderCreated(event: DomainEvent<FolderCreatedPayload>): void {
    const { id, name, path, parentId } = event.payload;
    const depth = path.length - 1;

    this.depthMap.set(id, depth);
    this.mapper.addFolder(id, name, parentId, depth);
  }

  /**
   * Handle note created event
   */
  private handleNoteCreated(event: DomainEvent<NoteCreatedPayload>): void {
    const { id, name, content, path, parentId } = event.payload;
    const depth = path.length - 1;

    // Parse content for semantic information
    const parsed = this.parser.parse(content);

    this.depthMap.set(id, depth);
    this.mapper.addFile(id, name, content, parentId, depth, parsed.tags, parsed.wikilinks);
  }

  /**
   * Handle note updated event
   */
  private handleNoteUpdated(event: DomainEvent<NoteUpdatedPayload>): void {
    const { id, content } = event.payload;

    // Re-parse content and update semantic information
    const parsed = this.parser.parse(content);

    // Update the node with new parsed data
    const graph = this.mapper.getGraph();
    const node = graph.nodes.find(n => n.id === id);

    if (node && node.type === 'file') {
      const depth = this.depthMap.get(id) || 0;
      this.mapper.addFile(
        id,
        node.name,
        content,
        node.parentId,
        depth,
        parsed.tags,
        parsed.wikilinks
      );
    }
  }

  /**
   * Finalize graph construction by adding semantic links
   */
  finalizeGraph(): void {
    this.mapper.addSemanticLinks();
  }

  /**
   * Get the current graph data for visualization
   */
  getGraphData(): GraphData {
    return this.mapper.getGraph();
  }

  /**
   * Set a node directly (for restoring from storage)
   */
  setNode(node: GraphNode): void {
    this.mapper.setNode(node);
    this.depthMap.set(node.id, node.depth);
  }

  /**
   * Delete a node
   */
  deleteNode(nodeId: string): void {
    this.mapper.deleteNode(nodeId);
    this.depthMap.delete(nodeId);
  }

  /**
   * Set links directly (for restoring from storage)
   */
  setLinks(links: GraphLink[]): void {
    this.mapper.setLinks(links);
  }

  /**
   * Clear all graph data
   */
  clearGraph(): void {
    this.mapper.clear();
    this.depthMap.clear();
  }

  /**
   * Cleanup and unsubscribe from events
   */
  cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.mapper.clear();
    this.depthMap.clear();
  }
}
