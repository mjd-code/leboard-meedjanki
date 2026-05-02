// Local cache + write-queue layer.
// Goal: keep the app responsive when the active backend (Firebase or
// Supabase) is slow, errors out, or is offline. Reads return cached data
// immediately while a background fetch refreshes it. Writes update the local
// cache instantly and queue a remote sync that retries with backoff.

const PREFIX = "janki_cache_v1::";
const QUEUE_KEY = "janki_sync_queue_v1";

type CacheEntry<T> = { data: T; ts: number };
type QueueOp = {
  id: string;
  connId: string;
  url: string;
  init: { method: string; headers?: Record<string, string>; body?: string };
  attempts: number;
  nextAttempt: number;
};

function safeGet(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch {}
}
function safeDel(k: string) {
  try { localStorage.removeItem(k); } catch {}
}

function cacheKey(connId: string, scope: string) {
  return `${PREFIX}${connId}::${scope}`;
}

export function readCache<T = any>(connId: string, scope: string): T | null {
  const raw = safeGet(cacheKey(connId, scope));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    return parsed.data;
  } catch { return null; }
}

export function writeCache<T>(connId: string, scope: string, data: T) {
  const entry: CacheEntry<T> = { data, ts: Date.now() };
  safeSet(cacheKey(connId, scope), JSON.stringify(entry));
}

export function clearCache(connId?: string) {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(PREFIX) && (!connId || k.startsWith(`${PREFIX}${connId}::`))) keys.push(k);
    }
    keys.forEach(safeDel);
  } catch {}
}

// ---------- Write queue ----------
function readQueue(): QueueOp[] {
  const raw = safeGet(QUEUE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as QueueOp[]; } catch { return []; }
}
function writeQueue(q: QueueOp[]) { safeSet(QUEUE_KEY, JSON.stringify(q)); }

export function enqueueSync(op: Omit<QueueOp, "id" | "attempts" | "nextAttempt">) {
  const q = readQueue();
  q.push({
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    attempts: 0,
    nextAttempt: Date.now(),
  });
  writeQueue(q);
}

export function pendingSyncCount(): number {
  return readQueue().length;
}

let draining = false;
type Drainer = (op: QueueOp) => Promise<boolean>;

export async function drainQueue(send: Drainer) {
  if (draining) return;
  draining = true;
  try {
    let q = readQueue();
    const now = Date.now();
    const remaining: QueueOp[] = [];
    for (const op of q) {
      if (op.nextAttempt > now) { remaining.push(op); continue; }
      try {
        const ok = await send(op);
        if (!ok) {
          op.attempts++;
          op.nextAttempt = Date.now() + Math.min(60000, 1000 * 2 ** op.attempts);
          if (op.attempts < 8) remaining.push(op);
        }
      } catch {
        op.attempts++;
        op.nextAttempt = Date.now() + Math.min(60000, 1000 * 2 ** op.attempts);
        if (op.attempts < 8) remaining.push(op);
      }
    }
    writeQueue(remaining);
    if (remaining.length) {
      window.dispatchEvent(new CustomEvent("sync-queue-updated", { detail: { pending: remaining.length } }));
    } else {
      window.dispatchEvent(new CustomEvent("sync-queue-updated", { detail: { pending: 0 } }));
    }
  } finally {
    draining = false;
  }
}
