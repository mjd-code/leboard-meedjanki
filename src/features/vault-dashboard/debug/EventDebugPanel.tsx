/**
 * EventDebugPanel - Real-time event flow visualization for development
 * 
 * Shows live domain events flowing through the system for debugging purposes.
 * Only rendered in development mode.
 */

import { useState, useEffect, useRef } from 'react';
import { useAllVaultEvents, useEventHistory, EventType } from "@/features/vault-dashboard/hooks/useVaultEvents";
import { DomainEvent } from "@/shared/events/events";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { 
  Bug, 
  X, 
  Pause, 
  Play, 
  Trash2,
  ChevronDown,
  ChevronRight,
  Activity
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import { cn } from "@/shared/lib";

interface EventLogEntry {
  id: number;
  event: DomainEvent;
  timestamp: Date;
}

const eventTypeColors: Partial<Record<EventType, string>> = {
  [EventType.NODE_CREATED]: 'bg-green-500/20 text-green-400 border-green-500/30',
  [EventType.NODE_UPDATED]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [EventType.NODE_DELETED]: 'bg-red-500/20 text-red-400 border-red-500/30',
  [EventType.NODE_MOVED]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  [EventType.GRAPH_UPDATED]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  [EventType.VAULT_SAVED]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  [EventType.VAULT_SWITCHED]: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  [EventType.UNDO_PERFORMED]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  [EventType.REDO_PERFORMED]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export function EventDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const eventIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  // Subscribe to all events
  useAllVaultEvents(
    (event) => {
      if (isPaused) return;
      
      const entry: EventLogEntry = {
        id: eventIdRef.current++,
        event,
        timestamp: new Date(),
      };
      
      setEvents(prev => [...prev.slice(-99), entry]); // Keep last 100 events
    },
    { enabled: isOpen }
  );

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isPaused]);

  const toggleExpand = (id: number) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const getEventColor = (type: EventType): string => {
    return eventTypeColors[type] || 'bg-muted text-muted-foreground border-border';
  };

  const formatEventType = (type: string): string => {
    return type.replace(/_/g, ' ').toLowerCase();
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-card border-border shadow-lg hover:bg-accent"
        onClick={() => setIsOpen(true)}
        title="Open Event Debug Panel"
      >
        <Bug className="h-4 w-4" />
        {events.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] flex items-center justify-center text-primary-foreground">
            {events.length > 99 ? '99+' : events.length}
          </span>
        )}
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[500px] bg-card border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Event Flow</span>
          <Badge variant="secondary" className="text-xs">
            {events.length} events
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearEvents}
            title="Clear events"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Event List */}
      <ScrollArea className="flex-1 p-2" ref={scrollRef}>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bug className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No events captured yet</p>
            <p className="text-xs opacity-70">Events will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-1">
            {events.map((entry) => (
              <Collapsible
                key={entry.id}
                open={expandedEvents.has(entry.id)}
                onOpenChange={() => toggleExpand(entry.id)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-md border text-left transition-colors hover:bg-muted/50",
                    getEventColor(entry.event.type as EventType)
                  )}>
                    {expandedEvents.has(entry.id) ? (
                      <ChevronDown className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="text-xs font-mono flex-1 truncate">
                      {formatEventType(entry.event.type)}
                    </span>
                    <span className="text-[10px] opacity-70 flex-shrink-0">
                      {entry.timestamp.toLocaleTimeString('en-US', { 
                        hour12: false, 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit'
                      })}.{String(entry.timestamp.getMilliseconds()).padStart(3, '0')}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 ml-5 p-2 rounded bg-muted/30 border border-border/50">
                    <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(entry.event.payload, null, 2)}
                    </pre>
                    {entry.event.vaultId && (
                      <div className="mt-1 pt-1 border-t border-border/30">
                        <span className="text-[10px] text-muted-foreground">
                          Vault: {entry.event.vaultId}
                        </span>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Status Bar */}
      {isPaused && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-t border-amber-500/30 text-center">
          <span className="text-xs text-amber-400">Paused - events are not being captured</span>
        </div>
      )}
    </div>
  );
}
