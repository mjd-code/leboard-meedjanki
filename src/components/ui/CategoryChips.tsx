'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { slugifyCategory } from '@/lib/categorySlug';
import { LayoutGrid } from 'lucide-react';

interface ChipCat {
  name: string;
  count: number;
}

/**
 * CategoryChips — horizontal pill bar.
 * - If `onSelect` is provided → behaves as a quick filter (active = activeName).
 * - Otherwise it links to /berita/kategori/[slug].
 */
export function CategoryChips({
  categories,
  activeName,
  onSelect,
  showAll = true,
  allLabel = 'Semua',
  className,
}: {
  categories: ChipCat[];
  activeName?: string | null;
  onSelect?: (name: string | null) => void;
  showAll?: boolean;
  allLabel?: string;
  className?: string;
}) {
  const isFilter = typeof onSelect === 'function';

  const baseChip =
    'snap-start shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all';

  return (
    <div className={cn('relative', className)}>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x -mx-4 px-4 sm:mx-0 sm:px-0 py-1">
        {showAll && (
          isFilter ? (
            <button
              type="button"
              onClick={() => onSelect!(null)}
              className={cn(
                baseChip,
                !activeName
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background border-border text-foreground/70 hover:border-foreground'
              )}
            >
              <LayoutGrid className="w-3 h-3" /> {allLabel}
            </button>
          ) : (
            <Link
              href="/berita/kategori"
              className={cn(baseChip, 'bg-background border-border text-foreground/70 hover:border-foreground')}
            >
              <LayoutGrid className="w-3 h-3" /> {allLabel}
            </Link>
          )
        )}

        {categories.map((c) => {
          const active = activeName === c.name;
          const content = (
            <>
              {c.name}
              <span className={cn('ml-1 text-[10px] opacity-70', active && 'opacity-100')}>
                {c.count}
              </span>
            </>
          );
          return isFilter ? (
            <button
              key={c.name}
              type="button"
              onClick={() => onSelect!(active ? null : c.name)}
              className={cn(
                baseChip,
                active
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background border-border text-foreground/70 hover:border-foreground'
              )}
            >
              {content}
            </button>
          ) : (
            <Link
              key={c.name}
              href={`/berita/kategori/${slugifyCategory(c.name)}`}
              className={cn(baseChip, 'bg-background border-border text-foreground/70 hover:border-foreground')}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
