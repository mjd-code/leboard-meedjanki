'use client';

import React from 'react';
import { Search, SlidersHorizontal, X, ArrowDownAZ, Flame, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortKey = 'newest' | 'oldest' | 'popular' | 'az';

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'newest', label: 'Terbaru', icon: Clock },
  { key: 'oldest', label: 'Terlama', icon: Clock },
  { key: 'popular', label: 'Terpopuler', icon: Flame },
  { key: 'az', label: 'A → Z', icon: ArrowDownAZ },
];

export function SmartSearchBar({
  value,
  onChange,
  sort,
  onSortChange,
  placeholder = 'Cari berita, topik, atau penulis…',
  resultCount,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  placeholder?: string;
  resultCount?: number;
  className?: string;
}) {
  const [showSort, setShowSort] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowSort(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-12 pl-11 pr-10 rounded-full bg-background border border-border text-sm font-serif-body placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div ref={wrapRef} className="relative">
          <button
            type="button"
            onClick={() => setShowSort((s) => !s)}
            aria-label="Sort"
            className={cn(
              'h-12 px-4 inline-flex items-center gap-2 rounded-full border border-border bg-background text-xs font-bold uppercase tracking-widest hover:border-foreground transition-colors',
              showSort && 'border-foreground'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">{SORT_OPTIONS.find((s) => s.key === sort)?.label}</span>
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-background border border-border rounded-xl shadow-soft z-30 overflow-hidden">
              {SORT_OPTIONS.map((s) => {
                const Icon = s.icon;
                const active = sort === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      onSortChange(s.key);
                      setShowSort(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-muted transition-colors',
                      active && 'bg-muted font-bold'
                    )}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" /> {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {typeof resultCount === 'number' && (
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-3 font-semibold">
          {resultCount} hasil ditemukan
        </p>
      )}
    </div>
  );
}
