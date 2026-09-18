/**
 * Offline Store - Manages offline/online status and service worker state
 * 
 * Replaces useOfflineStatus hook with Zustand for consistency
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface OfflineState {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  cacheStatus: 'ready' | 'updating' | 'error' | 'unknown';
  
  // Computed
  canWorkOffline: boolean;
  
  // Actions
  setOnline: (online: boolean) => void;
  setServiceWorkerReady: (ready: boolean) => void;
  setCacheStatus: (status: OfflineState['cacheStatus']) => void;
  initialize: () => () => void;
}

export const useOfflineStore = create<OfflineState>()(
  devtools(
    (set, get) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isServiceWorkerReady: false,
      cacheStatus: 'unknown',
      canWorkOffline: false,
      
      setOnline: (online) => set(
        (state) => ({
          isOnline: online,
          canWorkOffline: state.isServiceWorkerReady && state.cacheStatus === 'ready',
        }),
        false,
        'setOnline'
      ),
      
      setServiceWorkerReady: (ready) => set(
        (state) => ({
          isServiceWorkerReady: ready,
          canWorkOffline: ready && state.cacheStatus === 'ready',
        }),
        false,
        'setServiceWorkerReady'
      ),
      
      setCacheStatus: (status) => set(
        (state) => ({
          cacheStatus: status,
          canWorkOffline: state.isServiceWorkerReady && status === 'ready',
        }),
        false,
        'setCacheStatus'
      ),
      
      initialize: () => {
        const { setOnline, setServiceWorkerReady, setCacheStatus } = get();
        
        // Online/Offline listeners
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Check service worker status
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then(() => {
              setServiceWorkerReady(true);
              setCacheStatus('ready');
            })
            .catch(() => {
              setCacheStatus('error');
            });
          
          // Listen for service worker updates
          const handleControllerChange = () => {
            setCacheStatus('updating');
            setTimeout(() => setCacheStatus('ready'), 2000);
          };
          
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
          
          return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          };
        }
        
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      },
    }),
    { name: 'OfflineStore' }
  )
);

// Auto-initialize on module load (client-side only)
if (typeof window !== 'undefined') {
  // Defer initialization to avoid blocking
  setTimeout(() => {
    useOfflineStore.getState().initialize();
  }, 0);
}
