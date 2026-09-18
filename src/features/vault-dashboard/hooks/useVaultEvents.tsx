/**
 * useVaultEvents - React hook for subscribing to domain events
 * 
 * This hook provides a clean way for UI components to react to
 * vault and node changes without direct coupling to VaultManager.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { 
  eventBus, 
  EventType, 
  DomainEvent,
  NodeCreatedPayload,
  NodeUpdatedPayload,
  NodeDeletedPayload,
  NodeMovedPayload,
  GraphUpdatedPayload,
  VaultSavedPayload,
} from "@/shared/events/events";

interface UseVaultEventsOptions {
  /** Only receive events for this vault (optional) */
  vaultId?: string | null;
  /** Enable debug logging */
  debug?: boolean;
}

interface VaultEventHandlers {
  onNodeCreated?: (payload: NodeCreatedPayload) => void;
  onNodeUpdated?: (payload: NodeUpdatedPayload) => void;
  onNodeDeleted?: (payload: NodeDeletedPayload) => void;
  onNodeMoved?: (payload: NodeMovedPayload) => void;
  onGraphUpdated?: (payload: GraphUpdatedPayload) => void;
  onVaultSaved?: (payload: VaultSavedPayload) => void;
  onVaultSwitched?: (vaultId: string) => void;
  onUndoPerformed?: () => void;
  onRedoPerformed?: () => void;
}

/**
 * Hook to subscribe to specific vault events
 * 
 * @example
 * ```tsx
 * useVaultEvents({
 *   onNodeUpdated: (payload) => {
 *     console.log('Node updated:', payload.id);
 *     // Trigger re-render or update local state
 *   },
 *   onGraphUpdated: (payload) => {
 *     console.log('Graph changed:', payload.source);
 *   }
 * }, { vaultId: currentVaultId });
 * ```
 */
export function useVaultEvents(
  handlers: VaultEventHandlers,
  options: UseVaultEventsOptions = {}
): void {
  const { vaultId, debug = false } = options;
  
  // Use refs to avoid recreating subscriptions on handler changes
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    // Helper to create filtered handler
    const createHandler = <T,>(
      handler: ((payload: T) => void) | undefined
    ) => {
      if (!handler) return undefined;
      
      return (event: DomainEvent<T>) => {
        // Filter by vaultId if specified
        if (vaultId && event.vaultId !== vaultId) return;
        
        if (debug) {
          console.log(`[useVaultEvents] ${event.type}`, event.payload);
        }
        
        handler(event.payload);
      };
    };

    // Subscribe to each event type if handler provided
    if (handlersRef.current.onNodeCreated) {
      const handler = createHandler(handlersRef.current.onNodeCreated);
      if (handler) {
        unsubscribes.push(eventBus.subscribe(EventType.NODE_CREATED, handler));
      }
    }

    if (handlersRef.current.onNodeUpdated) {
      const handler = createHandler(handlersRef.current.onNodeUpdated);
      if (handler) {
        unsubscribes.push(eventBus.subscribe(EventType.NODE_UPDATED, handler));
      }
    }

    if (handlersRef.current.onNodeDeleted) {
      const handler = createHandler(handlersRef.current.onNodeDeleted);
      if (handler) {
        unsubscribes.push(eventBus.subscribe(EventType.NODE_DELETED, handler));
      }
    }

    if (handlersRef.current.onNodeMoved) {
      const handler = createHandler(handlersRef.current.onNodeMoved);
      if (handler) {
        unsubscribes.push(eventBus.subscribe(EventType.NODE_MOVED, handler));
      }
    }

    if (handlersRef.current.onGraphUpdated) {
      const handler = createHandler(handlersRef.current.onGraphUpdated);
      if (handler) {
        unsubscribes.push(eventBus.subscribe(EventType.GRAPH_UPDATED, handler));
      }
    }

    if (handlersRef.current.onVaultSaved) {
      const handler = createHandler(handlersRef.current.onVaultSaved);
      if (handler) {
        unsubscribes.push(eventBus.subscribe(EventType.VAULT_SAVED, handler));
      }
    }

    if (handlersRef.current.onVaultSwitched) {
      unsubscribes.push(
        eventBus.subscribe(EventType.VAULT_SWITCHED, (event) => {
          if (debug) {
            console.log(`[useVaultEvents] VAULT_SWITCHED`, event.payload);
          }
          handlersRef.current.onVaultSwitched?.((event.payload as { vaultId: string }).vaultId);
        })
      );
    }

    if (handlersRef.current.onUndoPerformed) {
      unsubscribes.push(
        eventBus.subscribe(EventType.UNDO_PERFORMED, (event) => {
          if (vaultId && event.vaultId !== vaultId) return;
          handlersRef.current.onUndoPerformed?.();
        })
      );
    }

    if (handlersRef.current.onRedoPerformed) {
      unsubscribes.push(
        eventBus.subscribe(EventType.REDO_PERFORMED, (event) => {
          if (vaultId && event.vaultId !== vaultId) return;
          handlersRef.current.onRedoPerformed?.();
        })
      );
    }

    // Cleanup all subscriptions on unmount
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [vaultId, debug]);
}

/**
 * Hook to subscribe to ALL events (useful for debugging)
 */
export function useAllVaultEvents(
  callback: (event: DomainEvent) => void,
  options: { enabled?: boolean } = {}
): void {
  const { enabled = true } = options;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    return eventBus.subscribeAll((event) => {
      callbackRef.current(event);
    });
  }, [enabled]);
}

/**
 * Hook to get event history (useful for debugging)
 */
export function useEventHistory(limit = 20): DomainEvent[] {
  return eventBus.getHistory(limit);
}

/**
 * Hook to force re-render when specific events occur
 * Returns a trigger counter that increments on each event
 */
export function useEventTrigger(
  eventTypes: EventType[],
  vaultId?: string | null
): number {
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    const handler = (event: DomainEvent) => {
      if (vaultId && event.vaultId !== vaultId) return;
      setTrigger(prev => prev + 1);
    };

    return eventBus.subscribeMany(eventTypes, handler);
  }, [eventTypes, vaultId]);

  return trigger;
}

// Re-export EventType for convenience
export { EventType };
