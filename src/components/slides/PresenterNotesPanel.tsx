import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { FileText, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePresenterNotes } from '@/hooks/usePresenterNotes';

interface PresenterNotesPanelProps {
  slideId: string | null;
  slideIndex: number;
  onClose: () => void;
  className?: string;
}

export function PresenterNotesPanel({
  slideId,
  slideIndex,
  onClose,
  className,
}: PresenterNotesPanelProps) {
  const { content, loading, saveStatus, updateContent } = usePresenterNotes(slideId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'h-52 bg-gradient-to-b from-background to-muted/30 border-t border-border/50 flex flex-col w-full backdrop-blur-sm',
        'animate-in slide-in-from-bottom-4 duration-300 ease-out',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">Presenter Notes</span>
            <span className="text-xs text-muted-foreground">Slide {slideIndex + 1}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300',
            saveStatus === 'saved' && 'bg-green-500/10 text-green-600 dark:text-green-400',
            saveStatus === 'saving' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            saveStatus === 'error' && 'bg-red-500/10 text-red-600 dark:text-red-400',
            saveStatus === 'idle' && 'bg-muted text-muted-foreground'
          )}>
            {saveStatus === 'saved' ? (
              <>
                <Check className="h-3 w-3" />
                Saved
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : saveStatus === 'error' ? (
              <>
                <AlertCircle className="h-3 w-3" />
                Error saving
              </>
            ) : (
              'Auto-save enabled'
            )}
          </div>
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-4 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Loading notes...
            </div>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            placeholder="Add notes for this slide... (auto-saves as you type)"
            value={content}
            onChange={(e) => updateContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full h-full resize-none text-sm leading-relaxed",
              "bg-background/50 rounded-xl border border-border/50 p-4",
              "placeholder:text-muted-foreground/50",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
              "transition-all duration-200"
            )}
          />
        )}
      </div>
    </div>
  );
}
