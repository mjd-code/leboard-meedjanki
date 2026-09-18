import JSZip from 'jszip';

interface Node {
  id: string;
  name: string;
  content: string;
  type: "folder" | "file" | "media";
  parentId: string | null;
  depth: number;
  tags: string[];
  mediaType?: "image" | "audio" | "video";
  dataUrl?: string;
}

interface Link {
  source: string | Node;
  target: string | Node;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

export const exportGraphToZip = async (graphData: GraphData): Promise<Blob> => {
  // Validation
  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    throw new Error('No data to export. Please add some nodes first.');
  }

  const zip = new JSZip();
  
  // Create a map of nodes by ID for quick lookup
  const nodeMap = new Map(graphData.nodes.map(node => [node.id, node]));
  
  // Build path for each node
  const getNodePath = (node: Node): string => {
    const parts: string[] = [];
    let current: Node | undefined = node;
    
    while (current) {
      parts.unshift(current.name);
      current = current.parentId ? nodeMap.get(current.parentId) : undefined;
    }
    
    return parts.join('/');
  };
  
  // Process each node
  try {
    for (const node of graphData.nodes) {
      const path = getNodePath(node);
      
      // Validate path
      if (!path || path.includes('..') || path.startsWith('/')) {
        throw new Error(`Invalid path generated for node: ${node.name}`);
      }
      
      if (node.type === 'folder') {
        // Create folder
        zip.folder(path);
      } else {
        // Create markdown file with frontmatter
        const frontmatter = [
          '---',
          `id: ${node.id}`,
          `tags: [${node.tags.join(', ')}]`,
          `depth: ${node.depth}`,
          `parentId: ${node.parentId || 'null'}`,
          '---',
          '',
        ].join('\n');
        
        const content = frontmatter + node.content;
        zip.file(path + '.md', content);
      }
    }
  } catch (error) {
    throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Add a metadata file for links
  const linksData = graphData.links.map(link => ({
    source: typeof link.source === 'string' ? link.source : link.source.id,
    target: typeof link.target === 'string' ? link.target : link.target.id,
  }));
  
  zip.file('_graph_metadata.json', JSON.stringify({
    links: linksData,
    exportDate: new Date().toISOString(),
  }, null, 2));
  
  return await zip.generateAsync({ type: 'blob' });
};

export const downloadZip = async (graphData: GraphData, filename: string = 'knowledge-graph') => {
  try {
    const blob = await exportGraphToZip(graphData);
    
    // Validate blob
    if (!blob || blob.size === 0) {
      throw new Error('Failed to generate export file.');
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    a.download = `${sanitizedFilename}_${timestamp}.zip`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

