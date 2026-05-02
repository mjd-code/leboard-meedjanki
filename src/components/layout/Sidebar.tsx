import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SlideThumbnail } from '@/components/slides/SlideThumbnail';

interface SlideItem {
  id: string;
  content: React.ReactNode;
}

interface SidebarProps {
  slides: SlideItem[];
  activeSlideIndex: number;
  onSlideClick: (index: number) => void;
  width: number;
  onWidthChange: (width: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  onSnapClose?: () => void;
  className?: string;
}

export function Sidebar({
  slides,
  activeSlideIndex,
  onSlideClick,
  width,
  onWidthChange,
  onResizeStart,
  onResizeEnd,
  onSnapClose,
  className,
}: SidebarProps) {
  const [isResizing, setIsResizing] = useState(false);

  const SNAP_CLOSE_THRESHOLD = 150;
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 400;

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    onResizeStart?.();
    
    const startX = e.clientX;
    const startWidth = width;
    let shouldSnapClose = false;
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const rawWidth = startWidth + delta;
      
      // If dragged below threshold, mark for snap close
      if (rawWidth < SNAP_CLOSE_THRESHOLD) {
        shouldSnapClose = true;
        onWidthChange(MIN_WIDTH); // Keep at min visually
      } else {
        shouldSnapClose = false;
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, rawWidth));
        onWidthChange(newWidth);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      onResizeEnd?.();
      
      // Snap close if below threshold on release
      if (shouldSnapClose) {
        onSnapClose?.();
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width, onWidthChange, onResizeStart, onResizeEnd, onSnapClose]);

  return (
    <div
      className={cn(
        'h-full bg-background border-r flex flex-col outline-none relative',
        className
      )}
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        className={cn(
          'absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-primary/50 transition-colors z-30',
          isResizing && 'bg-primary'
        )}
        onMouseDown={handleResizeStart}
      />

      {/* Slide list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {slides.map((slide, index) => (
            <SlideThumbnail
              key={slide.id}
              slideNumber={index + 1}
              isActive={index === activeSlideIndex}
              onClick={() => onSlideClick(index)}
            >
              {slide.content}
            </SlideThumbnail>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
