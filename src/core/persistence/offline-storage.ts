/**
 * Offline Storage Utilities
 * 
 * Helper functions for managing offline data storage and cache
 */

/**
 * Check if the app is running in offline mode
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Check if service worker is available and active
 */
export async function isServiceWorkerReady(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return !!registration.active;
  } catch {
    return false;
  }
}

/**
 * Get estimated cache storage usage
 */
export async function getCacheStorageInfo(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      usage,
      quota,
      percentage,
    };
  } catch {
    return null;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Clear all app caches (useful for debugging or reset)
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('[OfflineStorage] All caches cleared');
  } catch (error) {
    console.error('[OfflineStorage] Error clearing caches:', error);
  }
}

/**
 * Prefetch important resources for offline use
 */
export async function prefetchResources(urls: string[]): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cache = await caches.open('prefetch-cache');
    await Promise.all(
      urls.map(url =>
        fetch(url).then(response => {
          if (response.ok) {
            return cache.put(url, response);
          }
        }).catch(err => {
          console.warn(`[OfflineStorage] Failed to prefetch ${url}:`, err);
        })
      )
    );
    console.log('[OfflineStorage] Resources prefetched successfully');
  } catch (error) {
    console.error('[OfflineStorage] Error prefetching resources:', error);
  }
}

/**
 * Log cache status for debugging
 */
export async function logCacheStatus(): Promise<void> {
  if (!('caches' in window)) {
    console.log('[OfflineStorage] Cache API not available');
    return;
  }

  try {
    const cacheNames = await caches.keys();
    console.log('[OfflineStorage] Active caches:', cacheNames);

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      console.log(`[OfflineStorage] Cache "${cacheName}": ${requests.length} entries`);
    }

    const storageInfo = await getCacheStorageInfo();
    if (storageInfo) {
      console.log('[OfflineStorage] Storage usage:', {
        used: formatBytes(storageInfo.usage),
        quota: formatBytes(storageInfo.quota),
        percentage: storageInfo.percentage.toFixed(2) + '%',
      });
    }
  } catch (error) {
    console.error('[OfflineStorage] Error logging cache status:', error);
  }
}

