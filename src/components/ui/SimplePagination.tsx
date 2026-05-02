'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SimplePagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  // Build a compact list with ellipses
  const pages: (number | 'dots')[] = [];
  const push = (v: number | 'dots') => pages.push(v);
  const window = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) {
      push(i);
    } else if (pages[pages.length - 1] !== 'dots') {
      push('dots');
    }
  }

  const btn = 'min-w-9 h-9 px-3 inline-flex items-center justify-center rounded-full text-xs font-bold uppercase tracking-widest border transition-colors';

  return (
    <nav className={cn('flex items-center justify-center gap-1.5 mt-12', className)} aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className={cn(btn, 'border-border text-foreground hover:border-foreground disabled:opacity-40 disabled:hover:border-border')}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((p, i) =>
        p === 'dots' ? (
          <span key={`d-${i}`} className="px-2 text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              btn,
              p === page
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-foreground/70 hover:border-foreground'
            )}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className={cn(btn, 'border-border text-foreground hover:border-foreground disabled:opacity-40 disabled:hover:border-border')}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
