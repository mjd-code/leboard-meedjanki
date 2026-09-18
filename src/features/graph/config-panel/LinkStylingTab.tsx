/**
 * LinkStylingTab - Combined link/edge configuration with topology settings
 */

import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Link2,
  MoveRight,
  Sparkles,
  Palette,
  GitBranch,
  Tags,
} from 'lucide-react';
import { LinkConfig, TopologyConfig, LinkStyle } from "@/shared/stores/useGraphStore";
import { ColorPicker } from './ColorPicker';
import { CollapsibleSection } from './CollapsibleSection';

interface LinkStylingTabProps {
  config: LinkConfig;
  topologyConfig: TopologyConfig;
  is3D: boolean;
  onUpdate: (updates: Partial<LinkConfig>) => void;
  onTopologyUpdate: (updates: Partial<TopologyConfig>) => void;
  onTopologyStyleUpdate: (linkType: keyof TopologyConfig["styles"], updates: Partial<LinkStyle>) => void;
}

const DASH_PRESETS = [
  { value: 'solid', label: 'Solid' },
  { value: '8,4', label: 'Dashed' },
  { value: '2,3', label: 'Dotted' },
  { value: '12,3,3,3', label: 'Dash-Dot' },
  { value: '20,5', label: 'Long Dash' },
];

const LINE_STYLES = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

const LINK_TYPE_INFO = {
  hierarchy: {
    label: "Hierarchy",
    description: "Parent-child folder structure",
    icon: GitBranch,
  },
  backlink: {
    label: "Backlinks",
    description: "Wikilink connections between notes",
    icon: Link2,
  },
  tag: {
    label: "Tags",
    description: "Shared tag connections",
    icon: Tags,
  },
};

export function LinkStylingTab({ 
  config, 
  topologyConfig, 
  is3D, 
  onUpdate, 
  onTopologyUpdate,
  onTopologyStyleUpdate 
}: LinkStylingTabProps) {
  return (
    <div className="space-y-4">
      {/* Link Types (Topology) */}
      <CollapsibleSection
        icon={<GitBranch className="w-4 h-4 text-primary" />}
        title="Link Types"
        defaultOpen={true}
      >
        <div className="space-y-3">
          {/* Hierarchy Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3">
              <GitBranch className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="font-medium text-sm">Hierarchical Links</Label>
                <p className="text-xs text-muted-foreground">Parent-child folder structure</p>
              </div>
            </div>
            <Switch
              checked={topologyConfig.showHierarchy}
              onCheckedChange={(checked) => onTopologyUpdate({ showHierarchy: checked })}
            />
          </div>

          {/* Backlinks Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="font-medium text-sm">Backlink Connections</Label>
                <p className="text-xs text-muted-foreground">Wikilinks between notes</p>
              </div>
            </div>
            <Switch
              checked={topologyConfig.showBacklinks}
              onCheckedChange={(checked) => onTopologyUpdate({ showBacklinks: checked })}
            />
          </div>

          {/* Tags Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3">
              <Tags className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="font-medium text-sm">Tag-Based Edges</Label>
                <p className="text-xs text-muted-foreground">Connect notes sharing tags</p>
              </div>
            </div>
            <Switch
              checked={topologyConfig.showTags}
              onCheckedChange={(checked) => onTopologyUpdate({ showTags: checked })}
            />
          </div>

          {/* Tag Threshold */}
          <div className="p-3 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-medium text-sm">Tag Threshold</Label>
              <Badge variant="outline" className="font-mono">
                {topologyConfig.tagThreshold} {topologyConfig.tagThreshold === 1 ? "tag" : "tags"}
              </Badge>
            </div>
            <Slider
              value={[topologyConfig.tagThreshold]}
              onValueChange={([value]) => onTopologyUpdate({ tagThreshold: value })}
              min={1}
              max={5}
              step={1}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Minimum shared tags to create a connection
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Per-Type Styling */}
      <CollapsibleSection
        icon={<Palette className="w-4 h-4 text-primary" />}
        title="Link Type Styling"
        defaultOpen={false}
      >
        <div className="space-y-4">
          {(["hierarchy", "backlink", "tag"] as const).map((linkType) => {
            const info = LINK_TYPE_INFO[linkType];
            const style = topologyConfig.styles[linkType];
            const Icon = info.icon;

            return (
              <div key={linkType} className="p-3 rounded-lg bg-card border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <Label className="font-medium text-sm">{info.label}</Label>
                </div>

                {/* Color Selection with HSL/HEX picker */}
                <ColorPicker
                  label="Color"
                  value={style.color}
                  onChange={(color) => onTopologyStyleUpdate(linkType, { color })}
                />

                {/* Line Style */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Line Style</Label>
                  <Select
                    value={style.lineStyle}
                    onValueChange={(value: "solid" | "dashed" | "dotted") =>
                      onTopologyStyleUpdate(linkType, { lineStyle: value })
                    }
                  >
                    <SelectTrigger className="w-full h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LINE_STYLES.map((ls) => (
                        <SelectItem key={ls.value} value={ls.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-0.5 bg-foreground"
                              style={{
                                borderBottom: `2px ${ls.value} currentColor`,
                                background: "none",
                              }}
                            />
                            {ls.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Opacity & Width */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Opacity ({Math.round(style.opacity * 100)}%)
                    </Label>
                    <Slider
                      value={[style.opacity]}
                      onValueChange={([value]) => onTopologyStyleUpdate(linkType, { opacity: value })}
                      min={0.1}
                      max={1}
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Width ({style.width}px)
                    </Label>
                    <Slider
                      value={[style.width]}
                      onValueChange={([value]) => onTopologyStyleUpdate(linkType, { width: value })}
                      min={0.5}
                      max={5}
                      step={0.5}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Geometric Properties */}
      <CollapsibleSection
        icon={<Link2 className="w-4 h-4 text-primary" />}
        title="Geometric Properties"
        defaultOpen={false}
      >
        <div className="space-y-4 p-3 rounded-lg bg-card border border-border">
          {/* Link Width */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Link Width</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {config.width}px
              </Badge>
            </div>
            <Slider
              value={[config.width]}
              onValueChange={([value]) => onUpdate({ width: value })}
              min={0.5}
              max={10}
              step={0.5}
            />
          </div>

          {/* Curvature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Curvature</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {config.curvature.toFixed(2)}
              </Badge>
            </div>
            <Slider
              value={[config.curvature]}
              onValueChange={([value]) => onUpdate({ curvature: value })}
              min={0}
              max={1}
              step={0.05}
            />
            <p className="text-xs text-muted-foreground">
              0 = straight line, 1 = max curve
            </p>
          </div>

          {/* Curve Rotation (when curvature > 0) */}
          {config.curvature > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Curve Rotation</Label>
                <Badge variant="outline" className="font-mono text-xs">
                  {Math.round(config.curveRotation * (180 / Math.PI))}°
                </Badge>
              </div>
              <Slider
                value={[config.curveRotation]}
                onValueChange={([value]) => onUpdate({ curveRotation: value })}
                min={0}
                max={Math.PI * 2}
                step={0.1}
              />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Visual Differentiation */}
      <CollapsibleSection
        icon={<Palette className="w-4 h-4 text-primary" />}
        title="Visual Appearance"
        defaultOpen={false}
      >
        <div className="space-y-4 p-3 rounded-lg bg-card border border-border">
          {/* Link Color */}
          <ColorPicker
            label="Default Link Color"
            value={config.color}
            onChange={(color) => onUpdate({ color })}
          />

          {/* Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Opacity</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {Math.round(config.opacity * 100)}%
              </Badge>
            </div>
            <Slider
              value={[config.opacity]}
              onValueChange={([value]) => onUpdate({ opacity: value })}
              min={0.1}
              max={1}
              step={0.05}
            />
          </div>

          {/* Dash Array */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Line Style</Label>
            <Select
              value={config.dashArray || 'solid'}
              onValueChange={(value) => onUpdate({ dashArray: value === 'solid' ? '' : value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DASH_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    <div className="flex items-center gap-3">
                      <svg width="48" height="4" className="flex-shrink-0">
                        <line
                          x1="0"
                          y1="2"
                          x2="48"
                          y2="2"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray={preset.value === 'solid' ? undefined : preset.value}
                        />
                      </svg>
                      {preset.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Custom Pattern</Label>
              <Input
                value={config.dashArray}
                onChange={(e) => onUpdate({ dashArray: e.target.value })}
                placeholder="e.g. 5,5,10,5"
                className="h-8 mt-1 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Directional Arrows */}
      <CollapsibleSection
        icon={<MoveRight className="w-4 h-4 text-primary" />}
        title="Directional Arrows"
        defaultOpen={false}
      >
        <div className="space-y-4 p-3 rounded-lg bg-card border border-border">
          {/* Enable Arrows */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Show Arrows</Label>
              <p className="text-xs text-muted-foreground">Display direction indicators</p>
            </div>
            <Switch
              checked={config.showArrows}
              onCheckedChange={(checked) => onUpdate({ showArrows: checked })}
            />
          </div>

          {config.showArrows && (
            <>
              {/* Arrow Length */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Arrow Length</Label>
                  <Badge variant="outline" className="font-mono text-xs">
                    {config.arrowLength}
                  </Badge>
                </div>
                <Slider
                  value={[config.arrowLength]}
                  onValueChange={([value]) => onUpdate({ arrowLength: value })}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>

              {/* Arrow Position */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Arrow Position</Label>
                  <Badge variant="outline" className="font-mono text-xs">
                    {Math.round(config.arrowRelPos * 100)}%
                  </Badge>
                </div>
                <Slider
                  value={[config.arrowRelPos]}
                  onValueChange={([value]) => onUpdate({ arrowRelPos: value })}
                  min={0}
                  max={1}
                  step={0.05}
                />
                <p className="text-xs text-muted-foreground">
                  0 = at source, 1 = at target
                </p>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Particle Flow Animation */}
      <CollapsibleSection
        icon={<Sparkles className="w-4 h-4 text-primary" />}
        title="Particle Animation"
        defaultOpen={false}
      >
        <div className="space-y-4 p-3 rounded-lg bg-card border border-border">
          {/* Enable Particles */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Show Particles</Label>
              <p className="text-xs text-muted-foreground">Animate flow along links</p>
            </div>
            <Switch
              checked={config.showParticles}
              onCheckedChange={(checked) => onUpdate({ showParticles: checked })}
            />
          </div>

          {config.showParticles && (
            <>
              {/* Particle Count */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Particle Count</Label>
                  <Badge variant="outline" className="font-mono text-xs">
                    {config.particles}
                  </Badge>
                </div>
                <Slider
                  value={[config.particles]}
                  onValueChange={([value]) => onUpdate({ particles: value })}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>

              {/* Particle Speed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Speed</Label>
                  <Badge variant="outline" className="font-mono text-xs">
                    {config.particleSpeed.toFixed(3)}
                  </Badge>
                </div>
                <Slider
                  value={[config.particleSpeed]}
                  onValueChange={([value]) => onUpdate({ particleSpeed: value })}
                  min={0.001}
                  max={0.05}
                  step={0.001}
                />
              </div>

              {/* Particle Width */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Particle Width</Label>
                  <Badge variant="outline" className="font-mono text-xs">
                    {config.particleWidth}px
                  </Badge>
                </div>
                <Slider
                  value={[config.particleWidth]}
                  onValueChange={([value]) => onUpdate({ particleWidth: value })}
                  min={1}
                  max={10}
                  step={0.5}
                />
              </div>

              {/* Particle Color */}
              <ColorPicker
                label="Particle Color"
                value={config.particleColor}
                onChange={(color) => onUpdate({ particleColor: color })}
              />
            </>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
