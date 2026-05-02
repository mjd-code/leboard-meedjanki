import React from 'react';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SlideItem {
  id: string;
  component: React.ComponentType;
  name: string;
  isWIP: boolean;
  pendingAgentAction?: boolean;
}

interface SlideOverviewGridProps {
  slides: SlideItem[];
  activeSlideIndex: number;
  onSlideClick: (index: number) => void;
  onClose: () => void;
}

export function SlideOverviewGrid({
  slides,
  activeSlideIndex,
  onSlideClick,
  onClose,
}: SlideOverviewGridProps) {
  const handleSlideClick = (index: number) => {
    onSlideClick(index);
    onClose();
  };

  return (
    <div className="fixed inset-0 top-12 bg-background z-[60] overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">All Slides</h2>
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Press Grid or click a slide to close
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={cn(
                'relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-colors',
                index === activeSlideIndex
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => handleSlideClick(index)}
            >
              {/* Slide number badge */}
              <div className="absolute top-2 left-2 z-10 bg-background/90 px-2 py-0.5 rounded text-xs font-mono">
                {index + 1}
              </div>
              
              {/* Pending agent action indicator */}
              {slide.pendingAgentAction && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="absolute bottom-2 left-2 z-10">
                        <div className="flex items-center justify-center h-5 w-5 rounded bg-primary/90 text-primary-foreground">
                          <Bot className="h-3 w-3" />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Awaiting Lovable update</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Slide preview */}
              <div className="aspect-video bg-[hsl(var(--slide-bg))] overflow-hidden">
                <div 
                  className="origin-top-left pointer-events-none"
                  style={{ 
                    transform: 'scale(0.15)', 
                    width: '666.67%', 
                    height: '666.67%' 
                  }}
                >
                  <slide.component />
                </div>
              </div>
              
              {/* Slide name */}
              <div className="p-2 bg-card border-t">
                <p className="text-xs truncate text-muted-foreground">
                  {slide.name}
                </p>
              </div>
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
