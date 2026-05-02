import { useState } from 'react';
import { Play, Moon, Sun, MoreHorizontal, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FloatingMenuProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onStartPresentation: () => void;
  onStartPresenterView?: () => void;
}

export function FloatingMenu({
  isDarkMode,
  onToggleDarkMode,
  onStartPresentation,
  onStartPresenterView,
}: FloatingMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col items-center gap-1 px-2 py-1 bg-card border border-border rounded-full shadow-md transition-all duration-200",
          isExpanded ? "opacity-100" : "opacity-80 hover:opacity-100"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Expanded state - show options above the trigger */}
        {isExpanded && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={onStartPresentation}
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Present (⇧P)</TooltipContent>
            </Tooltip>

            {onStartPresenterView && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    onClick={onStartPresenterView}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Presenter View (⇧V)</TooltipContent>
              </Tooltip>
            )}

            <div className="w-6 h-px bg-border" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={onToggleDarkMode}
                >
                  {isDarkMode ? (
                    <Sun className="h-3.5 w-3.5" />
                  ) : (
                    <Moon className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</TooltipContent>
            </Tooltip>

            <div className="w-6 h-px bg-border" />
          </>
        )}

        {/* Trigger icon - always visible at bottom */}
        <div className="h-6 w-6 flex items-center justify-center">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </TooltipProvider>
  );
}
