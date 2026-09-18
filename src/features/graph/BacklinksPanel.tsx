import { FileText, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";

interface Backlink {
  nodeId: string;
  nodeName: string;
  isWikilink: boolean; // true for explicit wikilink, false for unlinked mention
}

interface BacklinksPanelProps {
  backlinks: Backlink[];
  onBacklinkClick: (nodeId: string) => void;
}

export const BacklinksPanel = ({ backlinks, onBacklinkClick }: BacklinksPanelProps) => {
  const explicitLinks = backlinks.filter(b => b.isWikilink);
  const mentions = backlinks.filter(b => !b.isWikilink);

  if (backlinks.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Backlinks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            No backlinks found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          Backlinks
          <Badge variant="secondary" className="ml-auto">
            {backlinks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {explicitLinks.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Linked mentions ({explicitLinks.length})
                </h4>
                <div className="space-y-1">
                  {explicitLinks.map((link) => (
                    <button
                      key={link.nodeId}
                      onClick={() => onBacklinkClick(link.nodeId)}
                      className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent transition-colors text-left"
                    >
                      <FileText className="w-3 h-3 text-primary" />
                      <span className="text-sm">{link.nodeName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {mentions.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Unlinked mentions ({mentions.length})
                </h4>
                <div className="space-y-1">
                  {mentions.map((link) => (
                    <button
                      key={link.nodeId}
                      onClick={() => onBacklinkClick(link.nodeId)}
                      className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent transition-colors text-left opacity-60"
                    >
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{link.nodeName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
