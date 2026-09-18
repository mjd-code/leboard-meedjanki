/**
 * AutoSaveIndicator - Shows when data is being saved to the vault
 */

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Check, Loader2 } from 'lucide-react';
import { cn } from "@/shared/lib";

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date | null;
  className?: string;
}

export function AutoSaveIndicator({ 
  status, 
  lastSaved,
  className 
}: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  // Show "saved" state briefly after save completes
  useEffect(() => {
    if (status === 'saved') {
      setShowSaved(true);
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (status === 'idle' && !showSaved) {
    return null;
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all duration-300",
        status === 'saving' && "bg-primary/10 text-primary",
        (status === 'saved' || showSaved) && "bg-green-500/10 text-green-500",
        status === 'error' && "bg-destructive/10 text-destructive",
        className
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      
      {(status === 'saved' || showSaved) && status !== 'saving' && (
        <>
          <Check className="w-3 h-3" />
          <span>Saved</span>
          {lastSaved && (
            <span className="text-muted-foreground ml-1">
              {formatTime(lastSaved)}
            </span>
          )}
        </>
      )}
      
      {status === 'error' && (
        <>
          <CloudOff className="w-3 h-3" />
          <span>Save failed</span>
        </>
      )}
    </div>
  );
}