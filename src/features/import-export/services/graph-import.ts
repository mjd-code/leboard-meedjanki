/**
 * Graph Import - Facade for ZIP Import Service
 * 
 * This module maintains backward compatibility while delegating
 * to the new service-based architecture.
 */

import { ZipImportService } from '@/core/graph/ZipImportService';
import { GraphService } from '@/core/graph/GraphService';

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
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

/**
 * Main import function: Uses service-based architecture
 * 
 * This function now delegates to the ZipImportService and GraphService,
 * following the event-driven architecture pattern.
 */
export const importGraphFromZip = async (file: File): Promise<GraphData> => {
  const zipImportService = new ZipImportService();
  const graphService = new GraphService();

  // Initialize graph service to listen for events
  graphService.initialize();

  // Import from ZIP (emits events as it processes)
  await zipImportService.importFromZip(file);

  // Finalize graph construction (add semantic links)
  graphService.finalizeGraph();

  // Get the computed graph data
  const graphData = graphService.getGraphData();

  // Cleanup
  graphService.cleanup();

  return graphData;
};

