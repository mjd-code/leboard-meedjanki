import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Trash2, GitBranch, Link2Off, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

interface Node {
  id: string;
  name: string;
  type: "folder" | "file" | "media";
  parentId: string | null;
  depth: number;
  mediaType?: "image" | "audio" | "video";
}

interface Link {
  source: string | Node;
  target: string | Node;
  type?: "hierarchy" | "tag" | "backlink" | "semantic" | "custom";
}

interface LinkManagerProps {
  nodes: Node[];
  links: Link[];
  onUpdateLinks: (links: Link[]) => void;
  onAutoLink: () => void;
}

export const LinkManager = ({ nodes, links, onUpdateLinks, onAutoLink }: LinkManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const getNodeById = (id: string) => nodes.find(n => n.id === id);

  const getLinkSourceId = (link: Link): string => {
    return typeof link.source === "string" ? link.source : link.source.id;
  };

  const getLinkTargetId = (link: Link): string => {
    return typeof link.target === "string" ? link.target : link.target.id;
  };

  const handleDeleteLink = (link: Link) => {
    const sourceId = getLinkSourceId(link);
    const targetId = getLinkTargetId(link);
    
    const newLinks = links.filter(l => {
      const lSourceId = getLinkSourceId(l);
      const lTargetId = getLinkTargetId(l);
      return !(lSourceId === sourceId && lTargetId === targetId);
    });
    
    onUpdateLinks(newLinks);
    toast.success("Link removed");
  };

  const handleRemoveOrphans = () => {
    const validNodeIds = new Set(nodes.map(n => n.id));
    const validLinks = links.filter(link => {
      const sourceId = getLinkSourceId(link);
      const targetId = getLinkTargetId(link);
      return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
    });
    
    const removed = links.length - validLinks.length;
    if (removed > 0) {
      onUpdateLinks(validLinks);
      toast.success(`Removed ${removed} orphaned link(s)`);
    } else {
      toast.info("No orphaned links found");
    }
  };

  const handleRemoveDuplicates = () => {
    const seen = new Set<string>();
    const uniqueLinks = links.filter(link => {
      const sourceId = getLinkSourceId(link);
      const targetId = getLinkTargetId(link);
      const key = `${sourceId}-${targetId}`;
      
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    
    const removed = links.length - uniqueLinks.length;
    if (removed > 0) {
      onUpdateLinks(uniqueLinks);
      toast.success(`Removed ${removed} duplicate link(s)`);
    } else {
      toast.info("No duplicate links found");
    }
  };

  const filteredLinks = links.filter(link => {
    if (!searchQuery) return true;
    
    const sourceId = getLinkSourceId(link);
    const targetId = getLinkTargetId(link);
    const sourceNode = getNodeById(sourceId);
    const targetNode = getNodeById(targetId);
    
    const query = searchQuery.toLowerCase();
    return (
      sourceNode?.name.toLowerCase().includes(query) ||
      targetNode?.name.toLowerCase().includes(query)
    );
  });

  // Categorize links
  const hierarchyLinks = filteredLinks.filter(link => {
    const sourceId = getLinkSourceId(link);
    const targetId = getLinkTargetId(link);
    const targetNode = getNodeById(targetId);
    return targetNode?.parentId === sourceId;
  });

  const customLinks = filteredLinks.filter(link => {
    const sourceId = getLinkSourceId(link);
    const targetId = getLinkTargetId(link);
    const targetNode = getNodeById(targetId);
    return targetNode?.parentId !== sourceId;
  });

  const orphanedLinks = links.filter(link => {
    const sourceId = getLinkSourceId(link);
    const targetId = getLinkTargetId(link);
    return !getNodeById(sourceId) || !getNodeById(targetId);
  });

  return (
    <Card className="w-full h-full flex flex-col bg-card border-border">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">Link Manager</CardTitle>
            <CardDescription>Monitor and manage node connections</CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">
            {links.length} total
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={onAutoLink}
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Auto-link Hierarchy
          </Button>
          <Button
            onClick={handleRemoveOrphans}
            variant="outline"
            size="sm"
          >
            <Link2Off className="w-4 h-4 mr-2" />
            Remove Orphans
          </Button>
          <Button
            onClick={handleRemoveDuplicates}
            variant="outline"
            size="sm"
          >
            <GitBranch className="w-4 h-4 mr-2" />
            Remove Duplicates
          </Button>
        </div>

        <Input
          placeholder="Search links..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-secondary border-border"
        />

        <ScrollArea className="flex-1">
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 bg-secondary/50">
                <p className="text-xs text-muted-foreground">Hierarchy</p>
                <p className="text-2xl font-bold text-primary">{hierarchyLinks.length}</p>
              </Card>
              <Card className="p-3 bg-secondary/50">
                <p className="text-xs text-muted-foreground">Custom</p>
                <p className="text-2xl font-bold text-accent">{customLinks.length}</p>
              </Card>
              <Card className="p-3 bg-secondary/50">
                <p className="text-xs text-muted-foreground">Orphaned</p>
                <p className="text-2xl font-bold text-destructive">{orphanedLinks.length}</p>
              </Card>
            </div>

            {/* Hierarchy Links */}
            {hierarchyLinks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Hierarchy Links</h3>
                  <Badge variant="secondary" className="text-xs">{hierarchyLinks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {hierarchyLinks.map((link, idx) => {
                    const sourceId = getLinkSourceId(link);
                    const targetId = getLinkTargetId(link);
                    const sourceNode = getNodeById(sourceId);
                    const targetNode = getNodeById(targetId);
                    
                    return (
                      <div
                        key={`hierarchy-${idx}`}
                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground">
                            {sourceNode?.type === "folder" ? "📁" : "📄"}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {sourceNode?.name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-xs text-muted-foreground">
                            {targetNode?.type === "folder" ? "📁" : "📄"}
                          </span>
                          <span className="text-sm truncate">
                            {targetNode?.name || "Unknown"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLink(link)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hierarchyLinks.length > 0 && customLinks.length > 0 && <Separator />}

            {/* Custom Links */}
            {customLinks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Custom Links</h3>
                  <Badge variant="secondary" className="text-xs">{customLinks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {customLinks.map((link, idx) => {
                    const sourceId = getLinkSourceId(link);
                    const targetId = getLinkTargetId(link);
                    const sourceNode = getNodeById(sourceId);
                    const targetNode = getNodeById(targetId);
                    
                    return (
                      <div
                        key={`custom-${idx}`}
                        className="flex items-center justify-between p-3 bg-accent/10 rounded-lg border border-accent/20 hover:bg-accent/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground">
                            {sourceNode?.type === "folder" ? "📁" : "📄"}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {sourceNode?.name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-xs text-muted-foreground">
                            {targetNode?.type === "folder" ? "📁" : "📄"}
                          </span>
                          <span className="text-sm truncate">
                            {targetNode?.name || "Unknown"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLink(link)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredLinks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No links found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
