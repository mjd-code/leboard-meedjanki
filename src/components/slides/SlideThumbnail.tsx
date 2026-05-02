import React from 'react';
import { cn } from '@/lib/utils';

interface SlideThumbnailProps {
  slideNumber: number;
  isActive?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function SlideThumbnail({
  slideNumber,
  isActive = false,
  onClick,
  children,
}: SlideThumbnailProps) {
  return (
    <div className="group relative">
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-1 pt-2">
          <span className="text-xs text-muted-foreground font-mono">
            {slideNumber}
          </span>
        </div>
        
        <div
          className={cn(
            'slide-thumbnail relative flex-1 aspect-video bg-[hsl(var(--slide-bg))] rounded-md overflow-hidden border cursor-pointer',
            isActive ? 'active ring-2 ring-primary' : 'border-border hover:border-primary/50'
          )}
          onClick={onClick}
        >
          {/* Solid background to prevent bleed-through */}
          <div className="absolute inset-0 bg-white dark:bg-slate-900" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none isolate">
            <div 
              className="origin-top-left"
              style={{ 
                transform: 'scale(0.125)', 
                width: '800%', 
                height: '800%' 
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
