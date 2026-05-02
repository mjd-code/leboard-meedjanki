import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import {
  RANGE_PRESET_OPTIONS,
  type RangePreset,
  type DateRange,
  presetToRange,
  toDateInputValue,
  fromDateInputValue,
  endOfDay,
  startOfDay,
} from '../lib/timeRanges';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface TimeRangeValue {
  preset: RangePreset;
  range: DateRange;
}

interface Props {
  value: TimeRangeValue;
  onChange: (next: TimeRangeValue) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function TimeRangeFilter({ value, onChange, size = 'sm', className = '' }: Props) {
  const [presetOpen, setPresetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  
  const presetRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const isCustom = value.preset === 'custom';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (presetOpen && presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setPresetOpen(false);
      }
      if (pickerOpen && pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [presetOpen, pickerOpen]);

  const handlePreset = (preset: string) => {
    const presetVal = preset as RangePreset;
    if (presetVal === 'custom') {
      const seed = value.range.start && value.range.end
        ? value.range
        : presetToRange('last-month');
      onChange({ preset: presetVal, range: { start: seed.start, end: seed.end } });
      setPickerOpen(true);
      return;
    }
    onChange({ preset: presetVal, range: presetToRange(presetVal) });
  };

  const handleStart = (s: string) => {
    const d = fromDateInputValue(s);
    onChange({
      preset: 'custom',
      range: { start: d ? startOfDay(d) : null, end: value.range.end },
    });
  };
  const handleEnd = (s: string) => {
    const d = fromDateInputValue(s);
    onChange({
      preset: 'custom',
      range: { start: value.range.start, end: d ? endOfDay(d) : null },
    });
  };

  const sizeCls = size === 'sm' 
    ? 'h-10 sm:h-8 text-xs px-3 rounded-xl sm:rounded-lg' 
    : 'h-12 sm:h-10 text-sm px-4 rounded-2xl sm:rounded-xl';

  const customLabel =
    value.range.start && value.range.end
      ? `${toDateInputValue(value.range.start)} → ${toDateInputValue(value.range.end)}`
      : 'Pilih rentang';
      
  const activePresetInfo = RANGE_PRESET_OPTIONS.find(o => o.value === value.preset);

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}>
      {/* Preset select */}
      <div className="relative w-full sm:w-[150px]" ref={presetRef}>
        <Button 
            variant="outline" 
            onClick={() => setPresetOpen(o => !o)}
            className={`w-full bg-background hover:bg-secondary/50 border-border font-bold text-muted-foreground hover:text-foreground shadow-soft justify-between gap-2 border-none active:scale-95 transition-all ${sizeCls}`}
        >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-70 hidden sm:block" />
            <span className="truncate flex-1 text-left sm:text-center">{activePresetInfo?.label || "Pilih rentang"}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
        {presetOpen && (
            <div className="absolute top-full left-0 mt-2 min-w-[200px] sm:min-w-[180px] w-[calc(100vw-3rem)] sm:w-auto max-w-[300px] bg-card border border-border rounded-2xl shadow-lg z-[100] p-1.5 sm:p-2 animate-in fade-in zoom-in-95 duration-200">
                 <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 pt-1 pb-2">
                   Rentang Waktu
                 </div>
                {RANGE_PRESET_OPTIONS.map((o) => {
                    const active = value.preset === o.value;
                    return (
                      <button
                          key={o.value}
                          type="button"
                          onClick={() => {
                              handlePreset(o.value);
                              setPresetOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-sm transition-colors ${
                              active 
                              ? 'bg-primary/10 text-primary-700 font-bold' 
                              : 'hover:bg-secondary/50 text-foreground'
                          }`}
                      >
                          <span className="flex items-center gap-2 min-w-0">
                            <CalendarIcon className="h-3.5 w-3.5 opacity-60 shrink-0" />
                            <span className="truncate">{o.label}</span>
                          </span>
                          {active && <Check className="h-4 w-4 shrink-0 opacity-70" />}
                      </button>
                    );
                })}
            </div>
        )}
      </div>

      {/* Custom date range trigger */}
      {isCustom && (
        <div className="relative w-full sm:w-auto" ref={pickerRef}>
          <Button
            variant="outline"
            onClick={() => setPickerOpen(o => !o)}
            className={`w-full bg-background hover:bg-secondary/50 border-border font-bold text-muted-foreground hover:text-foreground shadow-soft border-none active:scale-95 transition-all gap-2 ${sizeCls}`}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{customLabel}</span>
          </Button>

          {pickerOpen && (
             <div className="absolute top-full left-0 sm:right-0 sm:left-auto mt-2 w-[calc(100vw-3rem)] sm:w-[280px] max-w-[300px] bg-card p-4 rounded-2xl shadow-soft border border-border z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tanggal mulai</label>
                    <Input
                      type="date"
                      value={toDateInputValue(value.range.start)}
                      max={toDateInputValue(value.range.end) || undefined}
                      onChange={(e) => handleStart(e.target.value)}
                      className="bg-secondary/30 h-10 border-border rounded-xl font-bold text-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tanggal akhir</label>
                    <Input
                      type="date"
                      value={toDateInputValue(value.range.end)}
                      min={toDateInputValue(value.range.start) || undefined}
                      onChange={(e) => handleEnd(e.target.value)}
                      className="bg-secondary/30 h-10 border-border rounded-xl font-bold text-foreground"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="ghost"
                      onClick={() => setPickerOpen(false)}
                      className="text-xs font-black uppercase tracking-widest text-primary hover:text-primary/90 h-8 rounded-lg"
                    >
                      Done
                    </Button>
                  </div>
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function createDefaultTimeRangeValue(preset: RangePreset = 'all-time'): TimeRangeValue {
  return { preset, range: presetToRange(preset) };
}
