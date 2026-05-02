import React from 'react';
import { cn } from '@/lib/utils';
import type { GridPosition } from '@/types/slide';

interface SlideGridProps {
  children: React.ReactNode;
  className?: string;
}

export function SlideGrid({ children, className }: SlideGridProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 grid grid-cols-6 grid-rows-6 gap-0 p-8',
        className
      )}
    >
      {children}
    </div>
  );
}

interface GridCellProps {
  children?: React.ReactNode;
  position: GridPosition;
  className?: string;
}

export function GridCell({ children, position, className }: GridCellProps) {
  const { col, row, colSpan = 1, rowSpan = 1 } = position;

  return (
    <div
      className={cn('relative', className)}
      style={{
        gridColumn: `${col} / span ${colSpan}`,
        gridRow: `${row} / span ${rowSpan}`,
      }}
    >
      {children}
    </div>
  );
}
