/**
 * GraphConfigPanel - Unified Network Graph Configuration
 * 
 * Centralized tabbed configuration panel for react-force-graph 2D
 * with topology controls, visual styling, and physics tuning
 */

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  Settings2,
  Circle,
  Link2,
  Zap,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { 
  GraphConfigState, 
  NodeConfig, 
  LinkConfig, 
  ForceConfig, 
  TopologyConfig,
  LinkStyle,
  LinkStats,
} from "@/shared/stores/useGraphStore";
import { NodeStylingTab } from './NodeStylingTab';
import { LinkStylingTab } from './LinkStylingTab';
import { ForceEngineTab } from './ForceEngineTab';
import { AnalyticsTab } from './AnalyticsTab';
import { useIsMobile } from "@/shared/hooks/useMobile";

interface GraphConfigPanelProps {
  config: GraphConfigState;
  stats: LinkStats;
  onNodeConfigUpdate: (updates: Partial<NodeConfig>) => void;
  onLinkConfigUpdate: (updates: Partial<LinkConfig>) => void;
  onTopologyConfigUpdate: (updates: Partial<TopologyConfig>) => void;
  onTopologyStyleUpdate: (linkType: keyof TopologyConfig["styles"], updates: Partial<LinkStyle>) => void;
  onForceConfigUpdate: (updates: Partial<ForceConfig>) => void;
  onReset: () => void;
  onReheatSimulation: () => void;
  onStopSimulation: () => void;
  onNodeSelect?: (nodeId: string) => void;
  variant?: "default" | "compact";
}

const tabItems = [
  { value: 'nodes', icon: Circle, label: 'Nodes' },
  { value: 'links', icon: Link2, label: 'Links' },
  { value: 'forces', icon: Zap, label: 'Forces' },
  { value: 'analytics', icon: BarChart3, label: 'Stats' },
];

export function GraphConfigPanel({
  config,
  stats,
  onNodeConfigUpdate,
  onLinkConfigUpdate,
  onTopologyConfigUpdate,
  onTopologyStyleUpdate,
  onForceConfigUpdate,
  onReset,
  onReheatSimulation,
  onStopSimulation,
  onNodeSelect,
  variant = "default",
}: GraphConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('links');
  const isMobile = useIsMobile();

  const triggerButton = variant === "compact" ? (
    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
      <Settings2 className="w-4 h-4" />
      <span className="flex-1 text-left">Configure</span>
      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
        {stats.totalCount}
      </Badge>
    </Button>
  ) : (
    <Button variant="outline" className="shadow-lg gap-2">
      <Settings2 className="w-4 h-4" />
      Graph Config
      <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
        {stats.totalCount}
      </Badge>
    </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {triggerButton}
      </SheetTrigger>
      <SheetContent 
        side={isMobile ? "bottom" : "right"} 
        className={
          isMobile 
            ? "h-[85vh] max-h-[85vh] rounded-t-2xl p-0" 
            : "w-full max-w-[420px] p-0"
        }
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <SheetHeader className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Settings2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="truncate">Graph Config</span>
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-muted-foreground hover:text-foreground flex-shrink-0 h-8 px-2 sm:px-3"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs">Reset</span>
              </Button>
            </div>
          </SheetHeader>

          {/* Tabs */}
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Tab List - Horizontal scrollable on mobile */}
            <div className="flex-shrink-0 border-b border-border bg-muted/30 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <TabsList className="inline-flex h-11 sm:h-12 w-full min-w-max items-center justify-start gap-0.5 sm:gap-1 bg-transparent p-1 sm:p-1.5 px-2 sm:px-4">
                {tabItems.map((tab) => (
                  <TabsTrigger 
                    key={tab.value}
                    value={tab.value} 
                    className="inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-md px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tab Content - Scrollable */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 sm:p-6">
                <TabsContent value="nodes" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <NodeStylingTab
                    config={config.nodes}
                    is3D={false}
                    onUpdate={onNodeConfigUpdate}
                  />
                </TabsContent>
                
                <TabsContent value="links" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <LinkStylingTab
                    config={config.links}
                    topologyConfig={config.topology}
                    is3D={false}
                    onUpdate={onLinkConfigUpdate}
                    onTopologyUpdate={onTopologyConfigUpdate}
                    onTopologyStyleUpdate={onTopologyStyleUpdate}
                  />
                </TabsContent>
                
                <TabsContent value="forces" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <ForceEngineTab
                    config={config.forces}
                    onUpdate={onForceConfigUpdate}
                    onReheat={onReheatSimulation}
                    onStop={onStopSimulation}
                  />
                </TabsContent>

                <TabsContent value="analytics" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <AnalyticsTab
                    stats={stats}
                    onNodeSelect={onNodeSelect}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
