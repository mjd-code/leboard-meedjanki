/**
 * ColorPicker - High-fidelity color selection with HEX/RGBA/HSL support
 */

import { useState, useEffect } from 'react';
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Slider } from "@/shared/ui/slider";
import { cn } from "@/shared/lib";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

// Preset colors using design system
const PRESET_COLORS = [
  { value: 'hsl(var(--primary))', label: 'Primary', bgClass: 'bg-primary' },
  { value: 'hsl(var(--accent))', label: 'Accent', bgClass: 'bg-accent' },
  { value: 'hsl(var(--secondary))', label: 'Secondary', bgClass: 'bg-secondary' },
  { value: 'hsl(var(--muted-foreground))', label: 'Muted', bgClass: 'bg-muted-foreground' },
  { value: 'hsl(var(--destructive))', label: 'Red', bgClass: 'bg-destructive' },
  { value: 'hsl(142, 76%, 36%)', label: 'Green', bgClass: 'bg-green-600' },
  { value: 'hsl(200, 98%, 39%)', label: 'Blue', bgClass: 'bg-blue-600' },
  { value: 'hsl(38, 92%, 50%)', label: 'Orange', bgClass: 'bg-orange-500' },
  { value: 'hsl(48, 100%, 60%)', label: 'Yellow', bgClass: 'bg-yellow-400' },
  { value: 'hsl(280, 75%, 55%)', label: 'Purple', bgClass: 'bg-purple-500' },
  { value: 'hsl(340, 82%, 52%)', label: 'Pink', bgClass: 'bg-pink-500' },
  { value: 'hsl(180, 70%, 45%)', label: 'Cyan', bgClass: 'bg-cyan-500' },
];

// Convert hex to HSL string
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// Parse HSL string to components
function parseHsl(hsl: string): { h: number; s: number; l: number } | null {
  const match = hsl.match(/hsl\((\d+),?\s*(\d+)%?,?\s*(\d+)%?\)/);
  if (!match) return null;
  return {
    h: parseInt(match[1]),
    s: parseInt(match[2]),
    l: parseInt(match[3]),
  };
}

export function ColorPicker({ label, value, onChange, className }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [hslValues, setHslValues] = useState({ h: 270, s: 70, l: 65 });

  // Sync input with value prop
  useEffect(() => {
    setInputValue(value);
    const parsed = parseHsl(value);
    if (parsed) {
      setHslValues(parsed);
    }
  }, [value]);

  const handleHexInput = (hex: string) => {
    setInputValue(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const hsl = hexToHsl(hex);
      onChange(hsl);
    }
  };

  const handleHslChange = (key: 'h' | 's' | 'l', val: number) => {
    const newHsl = { ...hslValues, [key]: val };
    setHslValues(newHsl);
    const hslString = `hsl(${newHsl.h}, ${newHsl.s}%, ${newHsl.l}%)`;
    setInputValue(hslString);
    onChange(hslString);
  };

  const handleRawInput = (val: string) => {
    setInputValue(val);
    onChange(val);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-10 h-9 p-0 border-2"
              style={{ backgroundColor: value }}
            >
              <span className="sr-only">Pick color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <Tabs defaultValue="presets" className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-8">
                <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
                <TabsTrigger value="hsl" className="text-xs">HSL</TabsTrigger>
                <TabsTrigger value="hex" className="text-xs">HEX</TabsTrigger>
              </TabsList>

              {/* Presets Tab */}
              <TabsContent value="presets" className="mt-3">
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => {
                        setInputValue(preset.value);
                        onChange(preset.value);
                      }}
                      className={cn(
                        'w-8 h-8 rounded-md border-2 transition-all hover:scale-110',
                        preset.bgClass,
                        value === preset.value ? 'border-foreground ring-2 ring-ring' : 'border-transparent'
                      )}
                      title={preset.label}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* HSL Tab */}
              <TabsContent value="hsl" className="mt-3 space-y-4">
                {/* Preview */}
                <div
                  className="w-full h-12 rounded-md border border-border"
                  style={{ backgroundColor: `hsl(${hslValues.h}, ${hslValues.s}%, ${hslValues.l}%)` }}
                />

                {/* Hue */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Hue</span>
                    <span className="font-mono">{hslValues.h}°</span>
                  </div>
                  <div
                    className="h-3 rounded-md"
                    style={{
                      background: 'linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))',
                    }}
                  />
                  <Slider
                    value={[hslValues.h]}
                    onValueChange={([v]) => handleHslChange('h', v)}
                    min={0}
                    max={360}
                    step={1}
                    className="mt-1"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Saturation</span>
                    <span className="font-mono">{hslValues.s}%</span>
                  </div>
                  <Slider
                    value={[hslValues.s]}
                    onValueChange={([v]) => handleHslChange('s', v)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                {/* Lightness */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Lightness</span>
                    <span className="font-mono">{hslValues.l}%</span>
                  </div>
                  <Slider
                    value={[hslValues.l]}
                    onValueChange={([v]) => handleHslChange('l', v)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              </TabsContent>

              {/* HEX Tab */}
              <TabsContent value="hex" className="mt-3 space-y-3">
                <div
                  className="w-full h-12 rounded-md border border-border"
                  style={{ backgroundColor: inputValue }}
                />
                <Input
                  type="text"
                  value={inputValue.startsWith('#') ? inputValue : ''}
                  onChange={(e) => handleHexInput(e.target.value)}
                  placeholder="#FF00FF"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter 6-digit hex code (e.g., #A855F7)
                </p>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        <Input
          value={inputValue}
          onChange={(e) => handleRawInput(e.target.value)}
          className="flex-1 h-9 font-mono text-xs"
          placeholder="hsl(270, 70%, 65%)"
        />
      </div>
    </div>
  );
}
