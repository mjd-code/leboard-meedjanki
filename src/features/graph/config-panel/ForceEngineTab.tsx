/**
 * ForceEngineTab - D3-Force physics configuration with collapsible sections
 */

import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  GitBranch,
  Settings2,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Magnet,
} from 'lucide-react';
import { ForceConfig } from "@/shared/stores/useGraphStore";
import { CollapsibleSection } from './CollapsibleSection';

interface ForceEngineTabProps {
  config: ForceConfig;
  onUpdate: (updates: Partial<ForceConfig>) => void;
  onReheat: () => void;
  onStop: () => void;
}

const DAG_MODES = [
  { value: 'null', label: 'None (Organic)', description: 'Free-form force layout' },
  { value: 'td', label: 'Top-Down', description: 'Tree flows from top' },
  { value: 'bu', label: 'Bottom-Up', description: 'Tree flows from bottom' },
  { value: 'lr', label: 'Left-Right', description: 'Horizontal tree (L→R)' },
  { value: 'rl', label: 'Right-Left', description: 'Horizontal tree (R→L)' },
  { value: 'radialin', label: 'Radial In', description: 'Root at center, expand out' },
  { value: 'radialout', label: 'Radial Out', description: 'Leaves at center' },
];

export function ForceEngineTab({ config, onUpdate, onReheat, onStop }: ForceEngineTabProps) {
  return (
    <div className="space-y-4">
      {/* Simulation Control */}
      <CollapsibleSection
        icon={<Play className="w-4 h-4 text-primary" />}
        title="Simulation Control"
        defaultOpen={true}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1 gap-2"
              onClick={onReheat}
            >
              <RotateCcw className="w-4 h-4" />
              Reheat
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={onStop}
            >
              <Pause className="w-4 h-4" />
              Stop
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Reheat restarts physics, Stop freezes the layout
          </p>
        </div>
      </CollapsibleSection>

      {/* Layout Mode */}
      <CollapsibleSection
        icon={<GitBranch className="w-4 h-4 text-primary" />}
        title="Layout Mode (DAG)"
        defaultOpen={false}
      >
        <div className="space-y-4 p-3 rounded-lg bg-card border border-border">
          {/* DAG Mode */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">DAG Direction</Label>
            <Select
              value={config.dagMode}
              onValueChange={(value: ForceConfig['dagMode']) =>
                onUpdate({ dagMode: value })
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAG_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{mode.label}</span>
                      <span className="text-xs text-muted-foreground">{mode.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DAG Level Distance */}
          {config.dagMode !== 'null' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Level Distance</Label>
                <Badge variant="outline" className="font-mono text-xs">
                  {config.dagLevelDistance}px
                </Badge>
              </div>
              <Slider
                value={[config.dagLevelDistance]}
                onValueChange={([value]) => onUpdate({ dagLevelDistance: value })}
                min={20}
                max={200}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Spacing between hierarchy levels
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Physics Tuning */}
      <CollapsibleSection
        icon={<Settings2 className="w-4 h-4 text-primary" />}
        title="Physics Tuning"
        defaultOpen={false}
      >
        <div className="space-y-4 p-3 rounded-lg bg-card border border-border">
          {/* Alpha Decay */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Alpha Decay</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {config.alphaDecay.toFixed(3)}
              </Badge>
            </div>
            <Slider
              value={[config.alphaDecay]}
              onValueChange={([value]) => onUpdate({ alphaDecay: value })}
              min={0}
              max={0.1}
              step={0.002}
            />
            <p className="text-xs text-muted-foreground">
              Low = simulation runs longer, High = stabilizes quickly
            </p>
          </div>

          {/* Velocity Decay */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Velocity Decay (Friction)</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {config.velocityDecay.toFixed(2)}
              </Badge>
            </div>
            <Slider
              value={[config.velocityDecay]}
              onValueChange={([value]) => onUpdate({ velocityDecay: value })}
              min={0}
              max={1}
              step={0.05}
            />
            <p className="text-xs text-muted-foreground">
              Higher = more friction/drag, nodes slow faster
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Force Parameters */}
      <CollapsibleSection
        icon={<Magnet className="w-4 h-4 text-primary" />}
        title="Force Parameters"
        defaultOpen={false}
      >
        <div className="space-y-4 p-3 rounded-lg bg-card border border-border">
          {/* Charge Strength */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Charge Strength</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {config.chargeStrength}
              </Badge>
            </div>
            <Slider
              value={[config.chargeStrength]}
              onValueChange={([value]) => onUpdate({ chargeStrength: value })}
              min={-1000}
              max={0}
              step={10}
            />
            <p className="text-xs text-muted-foreground">
              Negative = repel, more negative = stronger push apart
            </p>
          </div>

          {/* Link Distance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Link Distance</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {config.linkDistance}px
              </Badge>
            </div>
            <Slider
              value={[config.linkDistance]}
              onValueChange={([value]) => onUpdate({ linkDistance: value })}
              min={20}
              max={300}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Target distance between connected nodes
            </p>
          </div>

          {/* Center Strength */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Center Force</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {config.centerStrength.toFixed(2)}
              </Badge>
            </div>
            <Slider
              value={[config.centerStrength]}
              onValueChange={([value]) => onUpdate({ centerStrength: value })}
              min={0}
              max={2}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Pull toward graph center
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Warmup/Cooldown */}
      <CollapsibleSection
        icon={<Timer className="w-4 h-4 text-primary" />}
        title="Warmup & Cooldown"
        defaultOpen={false}
      >
        <div className="space-y-4 p-3 rounded-lg bg-card border border-border">
          {/* Warmup Ticks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Warmup Ticks</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {config.warmupTicks}
              </Badge>
            </div>
            <Slider
              value={[config.warmupTicks]}
              onValueChange={([value]) => onUpdate({ warmupTicks: value })}
              min={0}
              max={500}
              step={10}
            />
            <p className="text-xs text-muted-foreground">
              Pre-calculate layout before rendering
            </p>
          </div>

          {/* Cooldown Ticks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Cooldown Ticks</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {config.cooldownTicks}
              </Badge>
            </div>
            <Slider
              value={[config.cooldownTicks]}
              onValueChange={([value]) => onUpdate({ cooldownTicks: value })}
              min={0}
              max={500}
              step={10}
            />
          </div>

          {/* Cooldown Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Cooldown Time</Label>
              <Badge variant="outline" className="font-mono text-xs">
                {(config.cooldownTime / 1000).toFixed(1)}s
              </Badge>
            </div>
            <Slider
              value={[config.cooldownTime]}
              onValueChange={([value]) => onUpdate({ cooldownTime: value })}
              min={1000}
              max={60000}
              step={1000}
            />
            <p className="text-xs text-muted-foreground">
              Max simulation time before auto-freeze
            </p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
