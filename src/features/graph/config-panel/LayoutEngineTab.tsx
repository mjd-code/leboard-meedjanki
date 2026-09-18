/**
 * Multi-modal layout engine settings: projection, link routing, spacing and
 * per-depth sub-layout rules.
 */

import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';
import { Slider } from '@/shared/ui/slider';
import { Button } from '@/shared/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useGraphEngineStore } from '@/shared/stores/useGraphEngineStore';
import type { LayoutKind } from '@/core/graph/engine/types';

const LAYOUTS: { value: LayoutKind; label: string }[] = [
  { value: 'force', label: 'Force' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'tree', label: 'Tree' },
  { value: 'fishbone', label: 'Fishbone' },
];

export function LayoutEngineTab() {
  const engine = useGraphEngineStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm">Canvas engine</Label>
          <p className="text-xs text-muted-foreground">
            Multi-modal renderer with worker-computed layouts.
          </p>
        </div>
        <Switch
          checked={engine.useCanvasEngine}
          onCheckedChange={(v) => engine.patch({ useCanvasEngine: v })}
        />
      </div>


      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Default layout</Label>
          <Select value={engine.layout} onValueChange={(v) => engine.setLayout(v as LayoutKind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAYOUTS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Link routing</Label>
          <Select
            value={engine.routing}
            onValueChange={(v) => engine.patch({ routing: v as typeof engine.routing })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (per layout)</SelectItem>
              <SelectItem value="straight">Straight</SelectItem>
              <SelectItem value="elbow">Orthogonal elbow</SelectItem>
              <SelectItem value="bezier">Bezier</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Timeline date property</Label>
          <Input
            value={engine.timeField}
            onChange={(e) => engine.patch({ timeField: e.target.value })}
            placeholder="date"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Label zoom threshold ({engine.labelZoomThreshold.toFixed(2)}x)</Label>
          <Slider
            min={0.1}
            max={2}
            step={0.05}
            value={[engine.labelZoomThreshold]}
            onValueChange={([v]) => engine.patch({ labelZoomThreshold: v })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Timeline lane height ({engine.laneHeight})</Label>
          <Slider
            min={20}
            max={120}
            step={2}
            value={[engine.laneHeight]}
            onValueChange={([v]) => engine.patch({ laneHeight: v })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tree level distance ({engine.levelDistance})</Label>
          <Slider
            min={50}
            max={260}
            step={5}
            value={[engine.levelDistance]}
            onValueChange={([v]) => engine.patch({ levelDistance: v })}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Per-depth sub-layouts</Label>
            <p className="text-xs text-muted-foreground">
              First matching rule wins; anything else uses the default layout.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={engine.addDepthRule}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Rule
          </Button>
        </div>

        {engine.depthRules.length === 0 ? (
          <p className="text-xs text-muted-foreground/70">No depth rules yet.</p>
        ) : (
          <div className="space-y-2">
            {engine.depthRules.map((rule) => (
              <div key={rule.id} className="flex items-end gap-2 rounded-md border border-border/40 p-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">From</Label>
                  <Input
                    type="number"
                    className="w-16"
                    value={rule.fromDepth}
                    onChange={(e) =>
                      engine.updateDepthRule(rule.id, { fromDepth: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">To</Label>
                  <Input
                    type="number"
                    className="w-16"
                    value={rule.toDepth}
                    onChange={(e) =>
                      engine.updateDepthRule(rule.id, { toDepth: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px]">Layout</Label>
                  <Select
                    value={rule.kind}
                    onValueChange={(v) => engine.updateDepthRule(rule.id, { kind: v as LayoutKind })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LAYOUTS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => engine.removeDepthRule(rule.id)}
                  aria-label="Remove rule"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
