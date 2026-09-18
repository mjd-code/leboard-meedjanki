import { useMemo } from "react";
import {
  HardDrive,
  Zap,
  Network,
  FileText,
  Tag,
  Link2,
  FolderOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { Separator } from "@/shared/ui/separator";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface VaultStats {
  fileCount: number;
  folderCount: number;
  tagCount: number;
  orphanedNodes: number;
  avgConnections: number;
}

interface ComparisonVault {
  id: string;
  name: string;
  type: "in-memory" | "local-folder";
  nodeCount: number;
  linkCount: number;
  lastModified: number;
  stats?: VaultStats;
}

interface VaultComparisonViewProps {
  vaults: ComparisonVault[];
  onRemoveVault: (vaultId: string) => void;
  onClose: () => void;
}

interface MetricComparison {
  label: string;
  icon: React.ElementType;
  values: number[];
  maxValue: number;
  format?: (value: number) => string;
}

export const VaultComparisonView = ({
  vaults,
  onRemoveVault,
  onClose,
}: VaultComparisonViewProps) => {
  // Calculate comparison metrics
  const metrics = useMemo<MetricComparison[]>(() => {
    const getMax = (accessor: (v: ComparisonVault) => number) =>
      Math.max(...vaults.map(accessor), 1);

    return [
      {
        label: "Total Nodes",
        icon: Network,
        values: vaults.map((v) => v.nodeCount),
        maxValue: getMax((v) => v.nodeCount),
      },
      {
        label: "Connections",
        icon: Link2,
        values: vaults.map((v) => v.linkCount),
        maxValue: getMax((v) => v.linkCount),
      },
      {
        label: "Files",
        icon: FileText,
        values: vaults.map((v) => v.stats?.fileCount ?? 0),
        maxValue: getMax((v) => v.stats?.fileCount ?? 0),
      },
      {
        label: "Folders",
        icon: FolderOpen,
        values: vaults.map((v) => v.stats?.folderCount ?? 0),
        maxValue: getMax((v) => v.stats?.folderCount ?? 0),
      },
      {
        label: "Tags",
        icon: Tag,
        values: vaults.map((v) => v.stats?.tagCount ?? 0),
        maxValue: getMax((v) => v.stats?.tagCount ?? 0),
      },
      {
        label: "Avg Connections",
        icon: BarChart3,
        values: vaults.map((v) => v.stats?.avgConnections ?? 0),
        maxValue: getMax((v) => v.stats?.avgConnections ?? 0),
        format: (value: number) => value.toFixed(1),
      },
    ];
  }, [vaults]);

  // Calculate density score (connections per node)
  const densityScores = useMemo(() => {
    return vaults.map((v) => {
      if (v.nodeCount === 0) return 0;
      return (v.linkCount / v.nodeCount) * 100;
    });
  }, [vaults]);

  const maxDensity = Math.max(...densityScores, 1);

  // Get comparison indicator
  const getComparisonIndicator = (values: number[], index: number) => {
    const value = values[index];
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    if (values.length < 2) return null;
    if (value === maxValue && maxValue !== minValue) {
      return <TrendingUp className="w-3 h-3 text-green-500" />;
    }
    if (value === minValue && maxValue !== minValue) {
      return <TrendingDown className="w-3 h-3 text-amber-500" />;
    }
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  if (vaults.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No Vaults Selected</h3>
          <p className="text-sm text-muted-foreground">
            Select vaults to compare their structure and statistics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Vault Comparison
            <Badge variant="secondary" className="ml-2">
              {vaults.length} vault{vaults.length > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            {/* Vault Headers */}
            <div className="grid gap-4 p-4 bg-muted/30 border-y border-border" 
                 style={{ gridTemplateColumns: `180px repeat(${vaults.length}, 1fr)` }}>
              <div className="text-sm font-medium text-muted-foreground">Metric</div>
              {vaults.map((vault) => (
                <div key={vault.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {vault.type === "in-memory" ? (
                      <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    ) : (
                      <HardDrive className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    <span className="font-medium truncate">{vault.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => onRemoveVault(vault.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Metrics Rows */}
            <div className="divide-y divide-border">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="grid gap-4 p-4 hover:bg-muted/20 transition-colors"
                  style={{ gridTemplateColumns: `180px repeat(${vaults.length}, 1fr)` }}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <metric.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{metric.label}</span>
                  </div>
                  {metric.values.map((value, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {metric.format ? metric.format(value) : value}
                        </span>
                        {getComparisonIndicator(metric.values, index)}
                      </div>
                      <Progress
                        value={(value / metric.maxValue) * 100}
                        className="h-1.5"
                      />
                    </div>
                  ))}
                </div>
              ))}

              {/* Density Score Row */}
              <div
                className="grid gap-4 p-4 hover:bg-muted/20 transition-colors"
                style={{ gridTemplateColumns: `180px repeat(${vaults.length}, 1fr)` }}
              >
                <div className="flex items-center gap-2 text-sm">
                  <Network className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Density Score</span>
                </div>
                {densityScores.map((score, index) => (
                  <div key={index} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{score.toFixed(0)}%</span>
                      {getComparisonIndicator(densityScores, index)}
                    </div>
                    <Progress value={(score / maxDensity) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>

              {/* Orphaned Nodes Row */}
              <div
                className="grid gap-4 p-4 hover:bg-muted/20 transition-colors"
                style={{ gridTemplateColumns: `180px repeat(${vaults.length}, 1fr)` }}
              >
                <div className="flex items-center gap-2 text-sm">
                  <Network className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Orphaned Nodes</span>
                </div>
                {vaults.map((vault, index) => {
                  const orphaned = vault.stats?.orphanedNodes ?? 0;
                  const orphanedValues = vaults.map((v) => v.stats?.orphanedNodes ?? 0);
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <Badge
                        variant={orphaned > 0 ? "outline" : "secondary"}
                        className={orphaned > 0 ? "text-amber-500 border-amber-500/50" : ""}
                      >
                        {orphaned}
                      </Badge>
                      {/* For orphaned, lower is better, so reverse the indicator */}
                      {orphanedValues.length > 1 && orphaned === Math.min(...orphanedValues) && (
                        <TrendingDown className="w-3 h-3 text-green-500" />
                      )}
                      {orphanedValues.length > 1 && orphaned === Math.max(...orphanedValues) && orphaned !== Math.min(...orphanedValues) && (
                        <TrendingUp className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Last Modified Row */}
            <div
              className="grid gap-4 p-4 bg-muted/10"
              style={{ gridTemplateColumns: `180px repeat(${vaults.length}, 1fr)` }}
            >
              <div className="text-sm text-muted-foreground">Last Modified</div>
              {vaults.map((vault) => (
                <div key={vault.id} className="text-sm text-muted-foreground">
                  {formatDistanceToNow(vault.lastModified, { addSuffix: true })}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
