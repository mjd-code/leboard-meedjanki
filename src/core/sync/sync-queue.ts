/**
 * Offline sync queue — durable IndexedDB store of vault pushes that could not
 * reach the cloud (offline, auth gap, network error). Replayed on reconnect.
 */

export interface QueuedVaultPush {
  /** vaultId — one pending push per vault (latest snapshot wins). */
  id: string;
  cloudId: string | null;
  name: string;
  graph_data: { nodes: unknown[]; links: unknown[] };
  graph_config: Record<string, unknown>;
  backup_config: Record<string, unknown>;
  /** Server `updated_at` the local snapshot was based on, if known. */
  baseUpdatedAt: string | null;
  queuedAt: number;
  retries: number;
}

const DB_NAME = 'VaultSyncQueueDB';
const DB_VERSION = 1;
const STORE = 'pushes';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const syncQueue = {
  async put(entry: QueuedVaultPush): Promise<void> {
    await tx('readwrite', (s) => s.put(entry) as IDBRequest<IDBValidKey>);
  },

  async all(): Promise<QueuedVaultPush[]> {
    try {
      const rows = await tx<QueuedVaultPush[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedVaultPush[]>);
      return rows ?? [];
    } catch {
      return [];
    }
  },

  async get(id: string): Promise<QueuedVaultPush | undefined> {
    try {
      return await tx<QueuedVaultPush | undefined>('readonly', (s) => s.get(id) as IDBRequest<QueuedVaultPush | undefined>);
    } catch {
      return undefined;
    }
  },

  async remove(id: string): Promise<void> {
    await tx('readwrite', (s) => s.delete(id) as IDBRequest<undefined>);
  },

  async count(): Promise<number> {
    try {
      return await tx<number>('readonly', (s) => s.count() as IDBRequest<number>);
    } catch {
      return 0;
    }
  },

  async clear(): Promise<void> {
    await tx('readwrite', (s) => s.clear() as IDBRequest<undefined>);
  },
};
