/**
 * Visual Graph Engine defaults, surfaced inside the Unified Settings Hub.
 */

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { BarChart3, Circle, Link2, RotateCcw, Zap, LayoutGrid } from 'lucide-react';
import { LayoutEngineTab } from '@/features/graph/config-panel/LayoutEngineTab';
import { NodeStylingTab } from '@/features/graph/config-panel/NodeStylingTab';
import { LinkStylingTab } from '@/features/graph/config-panel/LinkStylingTab';
import { ForceEngineTab } from '@/features/graph/config-panel/ForceEngineTab';
import { AnalyticsTab } from '@/features/graph/config-panel/AnalyticsTab';
import { useGraphStore } from '@/shared/stores/useGraphStore';

const tabItems = [
  { value: 'layout', icon: LayoutGrid, label: 'Layout' },
  { value: 'nodes', icon: Circle, label: 'Nodes' },
  { value: 'links', icon: Link2, label: 'Links' },
  { value: 'forces', icon: Zap, label: 'Forces' },
  { value: 'analytics', icon: BarChart3, label: 'Stats' },
];

export function GraphEngineSettings() {
  const [activeTab, setActiveTab] = useState('layout');
  const config = useGraphStore((s) => s.config);
  const stats = useGraphStore((s) => s.stats);
  const {
    updateNodeConfig,
    updateLinkConfig,
    updateTopologyConfig,
    updateTopologyStyle,
    updateForceConfig,
    resetConfig,
  } = useGraphStore();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          These are the defaults every graph view starts from.
        </p>
        <Button variant="ghost" size="sm" onClick={resetConfig} className="flex-shrink-0">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="inline-flex h-10 w-full justify-start gap-1 bg-muted/40 p-1">
          {tabItems.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="layout" className="mt-4">
          <LayoutEngineTab />
        </TabsContent>
        <TabsContent value="nodes" className="mt-4">
          <NodeStylingTab config={config.nodes} is3D={false} onUpdate={updateNodeConfig} />
        </TabsContent>
        <TabsContent value="links" className="mt-4">
          <LinkStylingTab
            config={config.links}
            topologyConfig={config.topology}
            is3D={false}
            onUpdate={updateLinkConfig}
            onTopologyUpdate={updateTopologyConfig}
            onTopologyStyleUpdate={updateTopologyStyle}
          />
        </TabsContent>
        <TabsContent value="forces" className="mt-4">
          <ForceEngineTab
            config={config.forces}
            onUpdate={updateForceConfig}
            onReheat={() => {}}
            onStop={() => {}}
          />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab stats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
