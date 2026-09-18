/** Sync and offline storage controls: queue state, manual retry, cache usage. */

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { syncEngine, type SyncEngineStatus } from '@/core/sync/SyncEngine';
import {
  clearAllCaches,
  formatBytes,
  getCacheStorageInfo,
} from '@/core/persistence/offline-storage';
import { useOfflineStore } from '@/shared/stores';
import { toast } from 'sonner';

export function SyncPanel() {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const [status, setStatus] = useState<SyncEngineStatus>(() => syncEngine.getStatus());
  const [pending, setPending] = useState(() => syncEngine.getPendingCount());
  const [cache, setCache] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    const offStatus = syncEngine.onStatusChange(setStatus);
    const offPending = syncEngine.onPendingChange(setPending);
    void getCacheStorageInfo().then((info) => info && setCache(info));
    return () => {
      offStatus();
      offPending();
    };
  }, []);

  const retry = useCallback(async () => {
    await syncEngine.replayQueue();
    toast.success('Sync retried');
  }, []);

  const clearCache = useCallback(async () => {
    await clearAllCaches();
    const info = await getCacheStorageInfo();
    setCache(info);
    toast.success('Offline cache cleared');
  }, []);

  return (
    <section aria-labelledby="sync-heading" className="space-y-3">
      <h2 id="sync-heading" className="text-sm font-semibold">
        Sync &amp; offline
      </h2>
      <dl className="text-sm space-y-1">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Connection</dt>
          <dd>{isOnline ? 'Online' : 'Offline'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Sync status</dt>
          <dd>{status}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Waiting to upload</dt>
          <dd>{pending} change{pending === 1 ? '' : 's'}</dd>
        </div>
        {cache && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Offline cache</dt>
            <dd>
              {formatBytes(cache.usage)} of {formatBytes(cache.quota)}
            </dd>
          </div>
        )}
      </dl>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => void retry()} disabled={!isOnline}>
          <RefreshCw className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
          Retry now
        </Button>
        <Button size="sm" variant="outline" onClick={() => void clearCache()}>
          <Trash2 className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
          Clear offline cache
        </Button>
      </div>
    </section>
  );
}
