import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, ArrowDown, ArrowUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type SortKey = 'points' | 'name' | 'newest' | 'oldest';

export interface SortOption {
  value: SortKey;
  label: string;
  /** Direction icon hint used in the trigger button. */
  direction?: 'asc' | 'desc';
}

export const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: 'points', label: 'Poin (tinggi → rendah)', direction: 'desc' },
  { value: 'name', label: 'Nama (A → Z)', direction: 'asc' },
  { value: 'newest', label: 'Terbaru', direction: 'desc' },
  { value: 'oldest', label: 'Terlama', direction: 'asc' },
];

interface Props {
  value: SortKey;
  onChange: (next: SortKey) => void;
  options?: SortOption[];
  variant?: 'light' | 'dark';
  className?: string;
}

export function StudentSortDropdown({
  value,
  onChange,
  options = DEFAULT_SORT_OPTIONS,
  variant = 'light',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = options.find((o) => o.value === value) || options[0];
  const isDark = variant === 'dark';

  const DirIcon = current.direction === 'asc' ? ArrowUp : current.direction === 'desc' ? ArrowDown : ArrowDownUp;

  return (
    <div className={`relative min-w-0 ${className}`} ref={ref}>
      <Button
        variant={isDark ? 'secondary' : 'outline'}
        onClick={() => setOpen((o) => !o)}
        className={`w-full sm:w-auto h-12 sm:h-10 rounded-2xl sm:rounded-xl shadow-soft font-bold gap-2 border-none active:scale-95 transition-all ${
          isDark ? 'bg-secondary/30 backdrop-blur-md hover:bg-secondary/50' : 'bg-background hover:bg-secondary/50'
        }`}
      >
        <ArrowDownUp className="h-4 w-4" />
        <span>Urutkan</span>
        <DirIcon className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute left-0 mt-2 w-48 sm:w-56 bg-card border-none rounded-2xl shadow-soft z-50 p-1.5 sm:p-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 pt-1 pb-2">
            Urutkan berdasarkan
          </div>
          {options.map((opt) => {
            const active = opt.value === value;
            const Icon = opt.direction === 'asc' ? ArrowUp : opt.direction === 'desc' ? ArrowDown : ArrowDownUp;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-sm transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary-700 font-bold'
                    : 'hover:bg-secondary/50 text-foreground'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Icon className="h-3.5 w-3.5 opacity-60 shrink-0" />
                  <span className="truncate">{opt.label}</span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Sort a list of students using the given key. Mutates a copy, never the original.
 * - points: by `totalPoints` desc (must be precomputed by caller, fallback 0).
 * - name: alphabetical asc.
 * - newest/oldest: by `createdAt` (desc/asc). Falls back to `id` order if missing.
 */
export function sortStudents<
  T extends { name?: string; totalPoints?: number; createdAt?: string; created_at?: string }
>(list: T[], key: SortKey): T[] {
  const copy = [...list];
  switch (key) {
    case 'points':
      copy.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      break;
    case 'name':
      copy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'newest':
      copy.sort(
        (a, b) =>
          new Date(b.createdAt || b.created_at || 0).getTime() -
          new Date(a.createdAt || a.created_at || 0).getTime()
      );
      break;
    case 'oldest':
      copy.sort(
        (a, b) =>
          new Date(a.createdAt || a.created_at || 0).getTime() -
          new Date(b.createdAt || b.created_at || 0).getTime()
      );
      break;
  }
  return copy;
}