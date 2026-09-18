/**
 * AnalyticsTab - Graph metrics and network analytics with collapsible sections
 */

import { Badge } from "@/shared/ui/badge";
import {
  GitBranch,
  Link2,
  Tags,
  Network,
  BarChart3,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import { LinkStats } from "@/shared/stores/useGraphStore";
import { CollapsibleSection } from './CollapsibleSection';

interface AnalyticsTabProps {
  stats: LinkStats;
  onNodeSelect?: (nodeId: string) => void;
}

export function AnalyticsTab({ stats, onNodeSelect }: AnalyticsTabProps) {
  return (
    <div className="space-y-4">
      {/* Link Type Summary */}
      <CollapsibleSection
        icon={<BarChart3 className="w-4 h-4 text-primary" />}
        title="Link Type Summary"
        defaultOpen={true}
      >
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 rounded bg-secondary/50">
              <div className="flex items-center gap-2">
                <GitBranch className="w-3 h-3 text-primary" />
                <span className="text-sm">Hierarchy</span>
              </div>
              <Badge variant="secondary" className="font-mono">
                {stats.hierarchyCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-secondary/50">
              <div className="flex items-center gap-2">
                <Link2 className="w-3 h-3 text-accent" />
                <span className="text-sm">Backlinks</span>
              </div>
              <Badge variant="secondary" className="font-mono">
                {stats.backlinkCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-secondary/50">
              <div className="flex items-center gap-2">
                <Tags className="w-3 h-3 text-muted-foreground" />
                <span className="text-sm">Tags</span>
              </div>
              <Badge variant="secondary" className="font-mono">
                {stats.tagCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-primary/10">
              <div className="flex items-center gap-2">
                <Network className="w-3 h-3 text-primary" />
                <span className="text-sm font-medium">Total</span>
              </div>
              <Badge variant="default" className="font-mono">
                {stats.totalCount}
              </Badge>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Top Hubs */}
      <CollapsibleSection
        icon={<Network className="w-4 h-4 text-primary" />}
        title="Top Hubs Analysis"
        defaultOpen={true}
      >
        <div className="p-3 rounded-lg bg-card border border-border">
          {stats.topHubs.length > 0 ? (
            <div className="space-y-2">
              {stats.topHubs.map((hub, index) => (
                <button
                  key={hub.nodeId}
                  onClick={() => onNodeSelect?.(hub.nodeId)}
                  className="w-full flex items-center justify-between p-2 rounded bg-secondary/50 hover:bg-secondary/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground w-4">
                      #{index + 1}
                    </span>
                    <span className="text-sm truncate">{hub.nodeName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ArrowDownToLine className="w-3 h-3" />
                      {hub.inDegree}
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowUpFromLine className="w-3 h-3" />
                      {hub.outDegree}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {hub.connectionCount}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No connections found yet
            </p>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
