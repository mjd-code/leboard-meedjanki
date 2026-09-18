import { useOfflineStore } from "@/shared/stores/useOfflineStore";
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from "@/shared/ui/alert";

export function OfflineIndicator() {
  const isOnline = useOfflineStore((state) => state.isOnline);
  const canWorkOffline = useOfflineStore((state) => state.canWorkOffline);
  const cacheStatus = useOfflineStore((state) => state.cacheStatus);

  // Don't show anything if online and cache is ready
  if (isOnline && cacheStatus === 'ready') {
    return null;
  }

  // Show updating status
  if (cacheStatus === 'updating') {
    return (
      <Alert className="border-primary/50 bg-primary/5">
        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
        <AlertDescription className="text-sm">
          Updating offline cache...
        </AlertDescription>
      </Alert>
    );
  }

  // Show offline with cache ready
  if (!isOnline && canWorkOffline) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/5">
        <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-sm text-amber-900 dark:text-amber-100">
          You're offline. Your vault is cached and changes will sync when you're back online.
        </AlertDescription>
      </Alert>
    );
  }

  // Show offline without cache
  if (!isOnline && !canWorkOffline) {
    return (
      <Alert className="border-destructive/50 bg-destructive/5">
        <WifiOff className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-sm text-destructive">
          You're offline and some features may be unavailable. Connect to the internet to enable full functionality.
        </AlertDescription>
      </Alert>
    );
  }

  // Show cache error
  if (cacheStatus === 'error') {
    return (
      <Alert className="border-destructive/50 bg-destructive/5">
        <Wifi className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-sm text-destructive">
          Offline mode unavailable. Try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
