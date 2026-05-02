import { cn } from '@/lib/utils';
import { Grid3X3, FileText, MoreVertical, Play, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ToolbarProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  showNotes?: boolean;
  onToggleNotes?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onStartPresentation?: () => void;
  onStartPresenterView?: () => void;
  className?: string;
}

export function Toolbar({
  showGrid,
  onToggleGrid,
  showNotes,
  onToggleNotes,
  isDarkMode,
  onToggleDarkMode,
  onStartPresentation,
  onStartPresenterView,
  className
}: ToolbarProps) {
  return (
    <div className={cn('h-12 border-b bg-background flex items-center', className)}>
      {/* Left section - Logo */}
      <div className="flex items-center px-4">
        <span className="text-sm font-medium tracking-tight text-foreground">Lovable Slides</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section - All options in menu */}
      <div className="flex items-center justify-end flex-shrink-0 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[70]">
            <DropdownMenuItem onClick={onToggleGrid}>
              <Grid3X3 className="h-4 w-4 mr-2" />
              {showGrid ? 'Hide Grid' : 'Show Grid'}
              <span className="ml-auto text-xs text-muted-foreground">⇧G</span>
            </DropdownMenuItem>
            {onToggleNotes && (
              <DropdownMenuItem onClick={onToggleNotes}>
                <FileText className="h-4 w-4 mr-2" />
                {showNotes ? 'Hide Notes' : 'Show Notes'}
                <span className="ml-auto text-xs text-muted-foreground">⇧N</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onStartPresentation && (
              <DropdownMenuItem onClick={onStartPresentation}>
                <Play className="h-4 w-4 mr-2" />
                Present
                <span className="ml-auto text-xs text-muted-foreground">⇧P</span>
              </DropdownMenuItem>
            )}
            {onStartPresenterView && (
              <DropdownMenuItem onClick={onStartPresenterView}>
                <Monitor className="h-4 w-4 mr-2" />
                Presenter View
                <span className="ml-auto text-xs text-muted-foreground">⇧V</span>
              </DropdownMenuItem>
            )}
            {onToggleDarkMode && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleDarkMode}>
                  {isDarkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}