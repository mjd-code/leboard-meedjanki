'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * HScroller — horizontal snap scroller with edge fade + arrow controls.
 * Children should be flex-shrink-0 cards with explicit widths
 * (e.g. w-[78%] sm:w-[46%] md:w-[32%] lg:w-[28%]).
 */
export function HScroller({
  children,
  className,
  ariaLabel,
  showArrows = true,
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  showArrows?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = React.useState(false);
  const [canRight, setCanRight] = React.useState(true);

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  };

  return (
    <div className={cn('relative group/hscroll', className)}>
      {/* Edge fades — desktop/tablet only. Disabled on mobile to avoid broken overlays. */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-12 z-10 transition-opacity duration-300 hidden sm:block bg-gradient-to-r from-background via-background/80 to-transparent',
          canLeft ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-12 z-10 transition-opacity duration-300 hidden sm:block bg-gradient-to-l from-background via-background/80 to-transparent',
          canRight ? 'opacity-100' : 'opacity-0'
        )}
      />

      {showArrows && (
        <>
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className={cn(
              'hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full bg-background/95 backdrop-blur border border-border shadow-soft text-foreground hover:bg-foreground hover:text-background transition-all',
              canLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className={cn(
              'hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full bg-background/95 backdrop-blur border border-border shadow-soft text-foreground hover:bg-foreground hover:text-background transition-all',
              canRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        className="flex gap-5 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide scroll-smooth pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 [-webkit-overflow-scrolling:touch]"
      >
        {children}
      </div>
    </div>
  );
}

export function HScrollItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'snap-start shrink-0 w-[78%] sm:w-[46%] md:w-[34%] lg:w-[28%]',
        className
      )}
    >
      {children}
    </div>
  );
}
