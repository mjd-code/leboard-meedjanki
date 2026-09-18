import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { Network, GitBranch, Hash, Link2, Sparkles, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  source: string | Node;
  target: string | Node;
  type?: "hierarchy" | "tag" | "backlink" | "semantic" | "custom";
}

interface MetadataRule {
  id: string;
  name: string;
  condition: "tag-contains" | "name-pattern" | "content-keyword";
  value: string;
}

interface DynamicLinkManagerProps {
  nodes: Node[];
  baseLinks: Link[];
  onLinksUpdate: (links: Link[]) => void;
}

export const DynamicLinkManager = ({ nodes, baseLinks, onLinksUpdate }: DynamicLinkManagerProps) => {
  const [enabledLayers, setEnabledLayers] = useState({
    hierarchy: true,
    tags: false,
    backlinks: false,
    custom: false,
  });
  
  const [tagThreshold, setTagThreshold] = useState(2);
  const [metadataRules, setMetadataRules] = useState<MetadataRule[]>([]);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleCondition, setNewRuleCondition] = useState<MetadataRule["condition"]>("tag-contains");
  const [newRuleValue, setNewRuleValue] = useState("");

  // Generate hierarchy links (parent-child)
  const hierarchyLinks = useMemo((): Link[] => {
    if (!enabledLayers.hierarchy) return [];
    
    const links: Link[] = [];
    nodes.forEach(node => {
      if (node.parentId) {
        links.push({
          source: node.parentId,
          target: node.id,
          type: "hierarchy"
        });
      }
    });
    return links;
  }, [nodes, enabledLayers.hierarchy]);

  // Generate tag-based links (shared tags threshold)
  const tagLinks = useMemo((): Link[] => {
    if (!enabledLayers.tags) return [];
    
    const links: Link[] = [];
    const linkSet = new Set<string>();
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        // Count shared tags
        const sharedTags = nodeA.tags.filter(tag => nodeB.tags.includes(tag));
        
        if (sharedTags.length >= tagThreshold) {
          const linkKey = `${nodeA.id}-${nodeB.id}`;
          if (!linkSet.has(linkKey)) {
            links.push({
              source: nodeA.id,
              target: nodeB.id,
              type: "tag"
            });
            linkSet.add(linkKey);
          }
        }
      }
    }
    
    return links;
  }, [nodes, enabledLayers.tags, tagThreshold]);

  // Generate backlinks (bidirectional wikilinks)
  const backlinkLinks = useMemo((): Link[] => {
    if (!enabledLayers.backlinks) return [];
    
    const links: Link[] = [];
    const linkSet = new Set<string>();
    
    nodes.forEach(node => {
      if (node.wikilinks && node.wikilinks.length > 0) {
        node.wikilinks.forEach(wikilinkName => {
          const targetNode = nodes.find(n => 
            n.name.toLowerCase() === wikilinkName.toLowerCase() && n.type === "file"
          );
          
          if (targetNode) {
            const linkKey = `${node.id}-${targetNode.id}`;
            const reverseLinkKey = `${targetNode.id}-${node.id}`;
            
            if (!linkSet.has(linkKey) && !linkSet.has(reverseLinkKey)) {
              links.push({
                source: node.id,
                target: targetNode.id,
                type: "backlink"
              });
              linkSet.add(linkKey);
            }
          }
        });
      }
    });
    
    return links;
  }, [nodes, enabledLayers.backlinks]);

  // Generate custom metadata-based links
  const customLinks = useMemo((): Link[] => {
    if (!enabledLayers.custom || metadataRules.length === 0) return [];
    
    const links: Link[] = [];
    const linkSet = new Set<string>();
    
    metadataRules.forEach(rule => {
      const matchingNodes = nodes.filter(node => {
        switch (rule.condition) {
          case "tag-contains":
            return node.tags.some(tag => tag.toLowerCase().includes(rule.value.toLowerCase()));
          case "name-pattern":
            return node.name.toLowerCase().includes(rule.value.toLowerCase());
          case "content-keyword":
            return node.content.toLowerCase().includes(rule.value.toLowerCase());
          default:
            return false;
        }
      });
      
      // Link all matching nodes together
      for (let i = 0; i < matchingNodes.length; i++) {
        for (let j = i + 1; j < matchingNodes.length; j++) {
          const linkKey = `${matchingNodes[i].id}-${matchingNodes[j].id}`;
          const reverseLinkKey = `${matchingNodes[j].id}-${matchingNodes[i].id}`;
          
          if (!linkSet.has(linkKey) && !linkSet.has(reverseLinkKey)) {
            links.push({
              source: matchingNodes[i].id,
              target: matchingNodes[j].id,
              type: "custom"
            });
            linkSet.add(linkKey);
          }
        }
      }
    });
    
    return links;
  }, [nodes, enabledLayers.custom, metadataRules]);

  // Merge all enabled link types
  const allLinks = useMemo(() => {
    const merged = [...hierarchyLinks, ...tagLinks, ...backlinkLinks, ...customLinks];
    const uniqueLinks = new Map<string, Link>();
    
    merged.forEach(link => {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id;
      const targetId = typeof link.target === "string" ? link.target : link.target.id;
      const key = `${sourceId}-${targetId}`;
      const reverseKey = `${targetId}-${sourceId}`;
      
      if (!uniqueLinks.has(key) && !uniqueLinks.has(reverseKey)) {
        uniqueLinks.set(key, link);
      }
    });
    
    return Array.from(uniqueLinks.values());
  }, [hierarchyLinks, tagLinks, backlinkLinks, customLinks]);

  // Apply links to graph
  const handleApplyLinks = () => {
    onLinksUpdate(allLinks);
    toast.success(`Applied ${allLinks.length} dynamic links`);
  };

  const handleAddRule = () => {
    if (!newRuleName.trim() || !newRuleValue.trim()) {
      toast.error("Please fill in rule name and value");
      return;
    }
    
    const newRule: MetadataRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName,
      condition: newRuleCondition,
      value: newRuleValue,
    };
    
    setMetadataRules([...metadataRules, newRule]);
    setNewRuleName("");
    setNewRuleValue("");
    toast.success("Rule added!");
  };

  const handleDeleteRule = (ruleId: string) => {
    setMetadataRules(metadataRules.filter(r => r.id !== ruleId));
    toast.success("Rule deleted");
  };

  const toggleLayer = (layer: keyof typeof enabledLayers) => {
    setEnabledLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  const getLinkTypeColor = (type: Link["type"]) => {
    switch (type) {
      case "hierarchy": return "hsl(var(--primary))";
      case "tag": return "hsl(var(--accent))";
      case "backlink": return "hsl(var(--secondary))";
      case "custom": return "hsl(var(--destructive))";
      default: return "hsl(var(--muted))";
    }
  };

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5" />
          Dynamic Link Layers
        </CardTitle>
        <CardDescription>
          Enable multiple link types to visualize different relationships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Layer toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                id="hierarchy"
                checked={enabledLayers.hierarchy}
                onCheckedChange={() => toggleLayer("hierarchy")}
              />
              <Label htmlFor="hierarchy" className="flex items-center gap-2 cursor-pointer">
                <GitBranch className="w-4 h-4" style={{ color: getLinkTypeColor("hierarchy") }} />
                Hierarchy Links
              </Label>
            </div>
            <Badge variant="secondary">{hierarchyLinks.length}</Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="tags"
                  checked={enabledLayers.tags}
                  onCheckedChange={() => toggleLayer("tags")}
                />
                <Label htmlFor="tags" className="flex items-center gap-2 cursor-pointer">
                  <Hash className="w-4 h-4" style={{ color: getLinkTypeColor("tag") }} />
                  Tag-based Links
                </Label>
              </div>
              <Badge variant="secondary">{tagLinks.length}</Badge>
            </div>
            {enabledLayers.tags && (
              <div className="ml-10 space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Minimum shared tags: {tagThreshold}
                </Label>
                <Slider
                  value={[tagThreshold]}
                  onValueChange={(value) => setTagThreshold(value[0])}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                id="backlinks"
                checked={enabledLayers.backlinks}
                onCheckedChange={() => toggleLayer("backlinks")}
              />
              <Label htmlFor="backlinks" className="flex items-center gap-2 cursor-pointer">
                <Link2 className="w-4 h-4" style={{ color: getLinkTypeColor("backlink") }} />
                Backlinks (Wikilinks)
              </Label>
            </div>
            <Badge variant="secondary">{backlinkLinks.length}</Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="custom"
                  checked={enabledLayers.custom}
                  onCheckedChange={() => toggleLayer("custom")}
                />
                <Label htmlFor="custom" className="flex items-center gap-2 cursor-pointer">
                  <Sparkles className="w-4 h-4" style={{ color: getLinkTypeColor("custom") }} />
                  Custom Rules
                </Label>
              </div>
              <Badge variant="secondary">{customLinks.length}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Custom Rules Builder */}
        {enabledLayers.custom && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Add Metadata Rule</Label>
              <Input
                placeholder="Rule name..."
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                className="bg-secondary"
              />
              <select
                value={newRuleCondition}
                onChange={(e) => setNewRuleCondition(e.target.value as MetadataRule["condition"])}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border"
              >
                <option value="tag-contains">Tag contains</option>
                <option value="name-pattern">Name matches pattern</option>
                <option value="content-keyword">Content contains keyword</option>
              </select>
              <Input
                placeholder="Value to match..."
                value={newRuleValue}
                onChange={(e) => setNewRuleValue(e.target.value)}
                className="bg-secondary"
              />
              <Button onClick={handleAddRule} className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>

            {metadataRules.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Active Rules</Label>
                {metadataRules.map(rule => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-border"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.condition.replace("-", " ")}: "{rule.value}"
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Summary and Apply */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Dynamic Links:</span>
            <Badge variant="default" className="text-base px-3 py-1">
              {allLinks.length}
            </Badge>
          </div>
          
          <Button onClick={handleApplyLinks} className="w-full" size="lg">
            <Network className="w-4 h-4 mr-2" />
            Apply Link Layers
          </Button>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Link Type Colors</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getLinkTypeColor("hierarchy") }} />
              <span>Hierarchy</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getLinkTypeColor("tag") }} />
              <span>Tag-based</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getLinkTypeColor("backlink") }} />
              <span>Backlinks</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getLinkTypeColor("custom") }} />
              <span>Custom</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
