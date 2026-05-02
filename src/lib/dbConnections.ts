// Multi-database connection manager.
// Lets the app point at the default Lovable Cloud project OR a user-supplied
// external Supabase project (URL + key). Active selection persists in
// localStorage and is used by firebaseApi.ts via getActiveClient().

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultClient } from '../integrations/supabase/client';
import { clearCache as clearLocalCache } from './localCache';
import {
  connectFirestore,
  testFirestore,
  parseFirebaseConfig,
  fsSelect,
  fsInsert,
  fsUpdate,
  fsDeleteAll,
  fsDeleteById,
  disposeFirestore,
  FIREBASE_APP_COLLECTIONS,
  bootstrapFirestoreSchema,
  fsTransfer,
  type FirestoreCollectionProbe,
  type FirestoreWriteMode,
  type FirebaseConfig,
} from './firestoreDriver';

export type { FirestoreCollectionProbe, FirestoreWriteMode } from './firestoreDriver';

export type DbProvider = "supabase" | "firebase";
export type DbKeyType = "service_role" | "publishable" | "unknown";

export type DbConnection = {
  id: string;
  label: string;
  url: string;
  key: string; // service role or anon key (user-supplied)
  provider?: DbProvider; // defaults to "supabase" for backwards compat
  firebaseConfig?: FirebaseConfig; // populated for provider==="firebase"
  isDefault?: boolean;
  createdAt?: string;
};

const STORAGE_KEY = "janki_db_connections_v1";
const ACTIVE_KEY = "janki_db_active_v1";
const DEFAULT_ID = "lovable-cloud-firebase";

export const DEFAULT_CONNECTION_ID = DEFAULT_ID;
export const DB_EVENTS = {
  CHANGED: "db-connection-changed",
};



// Fallbacks for backwards compatibility
const DEFAULT_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xmsjbzujyfrkecgwfxlc.supabase.co";
const DEFAULT_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_NK7ByKJ_l2qizNoICxrnXQ_-2zTWOiE";

const defaultConnection: DbConnection = {
  id: DEFAULT_ID,
  label: "Firebase — gen-lang-client-0351002450",
  url: "firestore://" + "gen-lang-client-0351002450",
  key: "{\"projectId\":\"gen-lang-client-0351002450\",\"appId\":\"1:120685709098:web:09eeb8e2dbd550eb3bc053\",\"apiKey\":\"AIzaSyB1f7zabwJxQEw_73u89OEeDIwFrRjbFnY\",\"authDomain\":\"gen-lang-client-0351002450.firebaseapp.com\",\"firestoreDatabaseId\":\"ai-studio-04bdc2d3-f530-4d76-abc7-85d55ea3f4f0\",\"storageBucket\":\"gen-lang-client-0351002450.firebasestorage.app\",\"messagingSenderId\":\"120685709098\",\"measurementId\":\"\"}",
  provider: "firebase",
  firebaseConfig: {
  "projectId": "gen-lang-client-0351002450",
  "appId": "1:120685709098:web:09eeb8e2dbd550eb3bc053",
  "apiKey": "AIzaSyB1f7zabwJxQEw_73u89OEeDIwFrRjbFnY",
  "authDomain": "gen-lang-client-0351002450.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-04bdc2d3-f530-4d76-abc7-85d55ea3f4f0",
  "storageBucket": "gen-lang-client-0351002450.firebasestorage.app",
  "messagingSenderId": "120685709098",
  "measurementId": ""
},
  isDefault: true,
};


// In-memory cache of created clients per connection id
const clientCache = new Map<string, SupabaseClient>();
clientCache.set(DEFAULT_ID, defaultClient as unknown as SupabaseClient);

function readStored(): DbConnection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c) => c && typeof c.id === "string" && typeof c.url === "string" && typeof c.key === "string",
    );
  } catch {
    return [];
  }
}

function writeStored(list: DbConnection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listConnections(): DbConnection[] {
  return [defaultConnection, ...readStored()];
}

export function getActiveId(): string {
  try {
    return localStorage.getItem(ACTIVE_KEY) || DEFAULT_ID;
  } catch {
    return DEFAULT_ID;
  }
}

export function getActiveConnection(): DbConnection {
  const id = getActiveId();
  return listConnections().find((c) => c.id === id) || defaultConnection;
}

// Track connections that have failed recently so we can transparently fall
// back to the default Lovable Cloud / Firebase connection instead of hanging
// the entire app on a broken external Supabase project the user added once
// and forgot about.
const failedConnectionIds = new Set<string>();

export function markConnectionFailed(id: string) {
  if (id === DEFAULT_ID) return;
  failedConnectionIds.add(id);
  try {
    // Auto-revert active selection so subsequent reads use the working default.
    if (getActiveId() === id) {
      localStorage.setItem(ACTIVE_KEY, DEFAULT_ID);
      window.dispatchEvent(new CustomEvent(DB_EVENTS.CHANGED, { detail: { id: DEFAULT_ID, reason: "fallback" } }));
      console.warn(`[dbConnections] Active connection ${id} failed; reverted to default.`);
    }
  } catch {}
}

export function isConnectionFailed(id: string) {
  return failedConnectionIds.has(id);
}

function resolveActiveConnection(): DbConnection {
  const conn = getActiveConnection();
  if (conn.id !== DEFAULT_ID && failedConnectionIds.has(conn.id)) {
    return defaultConnection;
  }
  return conn;
}

export function getClientFor(conn: DbConnection): SupabaseClient {
  if (clientCache.has(conn.id)) return clientCache.get(conn.id)!;
  const c = createClient(conn.url, conn.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clientCache.set(conn.id, c);
  return c;
}

export function getActiveClient(): SupabaseClient {
  return getClientFor(getActiveConnection());
}

export function setActive(id: string) {
  const conn = listConnections().find((c) => c.id === id);
  if (!conn) return;
  localStorage.setItem(ACTIVE_KEY, id);
  // Drop any cached payload for OTHER connections so the UI shows fresh
  // data from the newly-selected backend instead of stale local cache.
  // We keep the cache for the connection we're switching TO so the UI
  // can render instantly while the background refresh runs.
  try {
    const all = listConnections();
    all.forEach((c) => { if (c.id !== id) clearLocalCache(c.id); });
  } catch {}
  window.dispatchEvent(new CustomEvent(DB_EVENTS.CHANGED, { detail: { id } }));
}

export function addConnection(input: { label: string; url: string; key: string }): DbConnection {
  const id = `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const conn: DbConnection = {
    id,
    label: input.label.trim() || "External Supabase",
    url: input.url.trim().replace(/\/+$/, ""),
    key: input.key.trim(),
    provider: "supabase",
    createdAt: new Date().toISOString(),
  };
  const stored = readStored();
  stored.push(conn);
  writeStored(stored);
  window.dispatchEvent(new CustomEvent(DB_EVENTS.CHANGED, { detail: { id } }));
  return conn;
}

/**
 * Add a Firebase/Firestore connection. The "key" field stores the raw
 * stringified config blob so existing code paths (export/import, edit form)
 * can keep treating it as opaque text.
 */
export function addFirebaseConnection(input: {
  label: string;
  config: string | FirebaseConfig;
}): DbConnection {
  const cfg =
    typeof input.config === "string" ? parseFirebaseConfig(input.config) : input.config;
  const id = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const conn: DbConnection = {
    id,
    label: input.label.trim() || "Firebase project",
    url: `firestore://${cfg.projectId}`,
    key: JSON.stringify(cfg),
    provider: "firebase",
    firebaseConfig: cfg,
    createdAt: new Date().toISOString(),
  };
  const stored = readStored();
  stored.push(conn);
  writeStored(stored);
  window.dispatchEvent(new CustomEvent(DB_EVENTS.CHANGED, { detail: { id } }));
  return conn;
}

export function updateConnection(id: string, patch: Partial<Pick<DbConnection, "label" | "url" | "key">>) {
  if (id === DEFAULT_ID) return;
  const stored = readStored();
  const idx = stored.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const merged = { ...stored[idx], ...patch };
  // If this is a Firebase connection and the key (config blob) changed,
  // re-parse and refresh the typed config so subsequent calls use it.
  if (merged.provider === "firebase" && patch.key) {
    try {
      merged.firebaseConfig = parseFirebaseConfig(patch.key);
      merged.url = `firestore://${merged.firebaseConfig.projectId}`;
    } catch {
      /* leave as-is; UI will surface the error on test */
    }
    disposeFirestore(id);
  }
  stored[idx] = merged;
  writeStored(stored);
  clientCache.delete(id);
  window.dispatchEvent(new CustomEvent(DB_EVENTS.CHANGED, { detail: { id } }));
}

export function removeConnection(id: string) {
  if (id === DEFAULT_ID) return;
  const stored = readStored().filter((c) => c.id !== id);
  writeStored(stored);
  clientCache.delete(id);
  disposeFirestore(id);
  if (getActiveId() === id) setActive(DEFAULT_ID);
  window.dispatchEvent(new CustomEvent(DB_EVENTS.CHANGED, { detail: { id } }));
}

function decodeJwtRole(key: string): string | null {
  try {
    const parts = key.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function getConnectionKeyType(conn: Pick<DbConnection, "key">): DbKeyType {
  const key = conn.key?.trim?.() || "";
  if (!key) return "unknown";
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("sb_secret_")) return "service_role";

  const role = decodeJwtRole(key);
  if (role === "service_role") return "service_role";
  if (role === "anon") return "publishable";
  return "unknown";
}

function buildRestHeaders(conn: DbConnection, accept = "application/json") {
  return {
    apikey: conn.key,
    Authorization: `Bearer ${conn.key}`,
    Accept: accept,
    "Accept-Profile": "public",
  };
}

export async function listConnectionTables(
  conn: DbConnection,
): Promise<{ tables: string[]; error?: string }> {
  if (conn.provider === "firebase") {
    return { tables: [...FIREBASE_APP_COLLECTIONS] };
  }
  // Service-role keys are blocked in the browser. Use the edge proxy.
  if (getConnectionKeyType(conn) === "service_role") {
    try {
      const r = await callProxy({ url: conn.url, key: conn.key, op: "list_tables" });
      return { tables: r.tables || [] };
    } catch (e: any) {
      return { tables: [], error: String(e?.message || e) };
    }
  }
  try {
    const res = await fetch(`${conn.url}/rest/v1/`, {
      method: "GET",
      headers: buildRestHeaders(conn, "application/openapi+json"),
    });

    if (!res.ok) {
      return { tables: [], error: `${res.status} ${res.statusText}`.trim() };
    }

    const doc = await res.json();
    const tables = Object.keys(doc?.paths || {})
      .map((path) => path.replace(/^\//, ""))
      .filter((path) => path && !path.startsWith("rpc/") && !path.includes("{"))
      .sort();

    return { tables };
  } catch (e: any) {
    return { tables: [], error: String(e?.message || e) };
  }
}

export async function testConnection(
  conn: DbConnection,
  expectedTables: string[] = [],
): Promise<{
  ok: boolean;
  error?: string;
  keyType: DbKeyType;
  tables: string[];
  missingTables: string[];
  probes?: FirestoreCollectionProbe[];
}> {
  if (conn.provider === "firebase") {
    const cfg = conn.firebaseConfig || (() => {
      try { return parseFirebaseConfig(conn.key); } catch { return null; }
    })();
    if (!cfg) {
      return {
        ok: false,
        error: "Invalid Firebase config",
        keyType: "unknown",
        tables: [],
        missingTables: expectedTables,
        probes: [],
      };
    }
    const r = await testFirestore(conn.id, cfg, expectedTables);
    return {
      ok: r.ok,
      error: r.error,
      keyType: "service_role", // treat firebase as fully-privileged for transfer flow
      tables: r.ok ? [...FIREBASE_APP_COLLECTIONS] : [],
      missingTables: r.missingTables,
      probes: r.probes,
    };
  }
  const keyType = getConnectionKeyType(conn);
  try {
    const openApi = await listConnectionTables(conn);
    if (!openApi.error) {
      const missingTables = expectedTables.filter((table) => !openApi.tables.includes(table));
      return { ok: true, keyType, tables: openApi.tables, missingTables };
    }
    // For service-role keys we cannot fall back to the JS client (browser blocked).
    if (keyType === "service_role") {
      return {
        ok: false,
        error: openApi.error || "Proxy unreachable",
        keyType,
        tables: [],
        missingTables: expectedTables,
      };
    }

    const client = getClientFor(conn);
    const { error } = await client.from("_lovable_probe_does_not_exist").select("*").limit(1);
    if (!error) return { ok: true, keyType, tables: [], missingTables: expectedTables };
    const msg = error.message || "";
    const code = (error as any).code || "";
    if (
      code === "42P01" ||
      code === "PGRST205" ||
      /not.*find|does not exist|relation/i.test(msg)
    ) {
      return { ok: true, keyType, tables: [], missingTables: expectedTables };
    }
    return { ok: false, error: msg, keyType, tables: [], missingTables: expectedTables };
  } catch (e: any) {
    return {
      ok: false,
      error: String(e?.message || e),
      keyType,
      tables: [],
      missingTables: expectedTables,
    };
  }
}



// ---------- Edge-function proxy for service-role operations ----------
// Service-role (sb_secret_*) keys are rejected by Supabase if used from a
// browser origin. We route those calls through our own edge function which
// runs server-side and forwards them safely.

const PROXY_URL = `${DEFAULT_URL}/functions/v1/db-proxy`;

export async function callProxy(payload: {
  url: string;
  key: string;
  op: "list_tables" | "select" | "insert" | "upsert" | "delete" | "exec_sql";
  table?: string;
  query?: string;
  rows?: any[];
  onConflict?: string;
  sql?: string;
}): Promise<any> {
  // Hard timeout so a broken/unreachable proxy can never hang the UI.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: DEFAULT_KEY,
        Authorization: `Bearer ${DEFAULT_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    throw new Error(`Proxy unreachable: ${e?.message || e}`);
  }
  clearTimeout(timer);
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(data?.error || `Proxy ${res.status}: ${text || res.statusText}`);
  }
  return data;
}

// Helper used by the Transfer + CRUD UI to perform reads/writes against any
// connection, automatically choosing direct JS client (publishable keys) or
// the proxy (service-role keys).
export async function connSelect(conn: DbConnection, table: string): Promise<any[]> {
  if (conn.provider === "firebase") {
    const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
    return fsSelect(conn.id, cfg, table);
  }
  if (getConnectionKeyType(conn) === "service_role") {
    const r = await callProxy({ url: conn.url, key: conn.key, op: "select", table, query: "select=*" });
    return Array.isArray(r) ? r : [];
  }
  const { data, error } = await getClientFor(conn).from(table).select("*").limit(10000);
  if (error) throw error;
  return data || [];
}

/**
 * Generic select with optional PostgREST query string (e.g. "id=eq.123&select=*").
 * Routes through edge proxy when the active key is a service_role token (which
 * Supabase rejects when called directly from a browser).
 */
export async function connSelectQuery(
  conn: DbConnection,
  table: string,
  query = "select=*",
): Promise<any[]> {
  if (conn.provider === "firebase") {
    // PostgREST query strings are not honored by Firestore; just return all
    // rows from the collection. Callers that rely on filters will still get
    // a usable dataset (caller filters in JS).
    const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
    return fsSelect(conn.id, cfg, table);
  }
  if (getConnectionKeyType(conn) === "service_role") {
    const r = await callProxy({ url: conn.url, key: conn.key, op: "select", table, query });
    return Array.isArray(r) ? r : [];
  }
  const res = await fetch(`${conn.url}/rest/v1/${table}?${query}`, {
    headers: { ...buildRestHeaders(conn), "Accept-Profile": "public" },
  });
  if (!res.ok) throw new Error(`select ${table} failed: ${res.status}`);
  return await res.json();
}

/**
 * Update by raw PostgREST filter (e.g. "id=eq.123"). Returns updated rows.
 */
export async function connUpdate(
  conn: DbConnection,
  table: string,
  filter: string,
  patch: Record<string, any>,
): Promise<any[]> {
  if (conn.provider === "firebase") {
    const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
    // Translate the simplest PostgREST filter we use everywhere: id=eq.<id>
    const m = filter.match(/(?:^|&)id=eq\.([^&]+)/);
    if (!m) {
      throw new Error(
        `Firestore connUpdate only supports "id=eq.<id>" filters (got "${filter}")`,
      );
    }
    const updated = await fsUpdate(conn.id, cfg, table, decodeURIComponent(m[1]), patch);
    return [updated];
  }
  if (getConnectionKeyType(conn) === "service_role") {
    // Service-role: PATCH via proxy. Add a tiny op via callProxy.update isn't
    // implemented, so we tunnel through the REST endpoint by reusing the
    // proxy's authenticated forwarding via select op is not appropriate.
    // Inline a custom REST call from the browser is blocked, so use direct
    // fetch through the edge function's pass-through (we extend op).
    const r = await callProxy({
      url: conn.url,
      key: conn.key,
      op: "update" as any,
      table,
      query: filter,
      rows: [patch],
    });
    return Array.isArray(r) ? r : [];
  }
  const res = await fetch(`${conn.url}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      ...buildRestHeaders(conn),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`update ${table} failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

/**
 * Insert rows and return them (with generated ids/timestamps).
 */
export async function connInsertReturning(
  conn: DbConnection,
  table: string,
  rows: any[],
): Promise<any[]> {
  if (!rows.length) return [];
  if (conn.provider === "firebase") {
    const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
    return fsInsert(conn.id, cfg, table, rows);
  }
  if (getConnectionKeyType(conn) === "service_role") {
    const r = await callProxy({
      url: conn.url,
      key: conn.key,
      op: "insert",
      table,
      rows,
    });
    return Array.isArray(r?.rows) ? r.rows : Array.isArray(r) ? r : rows;
  }
  const res = await fetch(`${conn.url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      ...buildRestHeaders(conn),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`insert ${table} failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

/**
 * Upsert and return the resulting rows.
 */
export async function connUpsertReturning(
  conn: DbConnection,
  table: string,
  rows: any[],
  onConflict = "id",
): Promise<any[]> {
  if (!rows.length) return [];
  if (conn.provider === "firebase") {
    const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
    return fsInsert(conn.id, cfg, table, rows, { upsert: true });
  }
  if (getConnectionKeyType(conn) === "service_role") {
    const r = await callProxy({
      url: conn.url,
      key: conn.key,
      op: "upsert",
      table,
      rows,
      onConflict,
    });
    return Array.isArray(r?.rows) ? r.rows : Array.isArray(r) ? r : rows;
  }
  const res = await fetch(`${conn.url}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: {
      ...buildRestHeaders(conn),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`upsert ${table} failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

export async function connInsert(
  conn: DbConnection,
  table: string,
  rows: any[],
  opts?: { upsert?: boolean; onConflict?: string },
): Promise<void> {
  if (!rows.length) return;
  if (conn.provider === "firebase") {
    const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
    await fsInsert(conn.id, cfg, table, rows, { upsert: !!opts?.upsert });
    return;
  }
  if (getConnectionKeyType(conn) === "service_role") {
    await callProxy({
      url: conn.url,
      key: conn.key,
      op: opts?.upsert ? "upsert" : "insert",
      table,
      rows,
      onConflict: opts?.onConflict || "id",
    });
    return;
  }
  const c = getClientFor(conn);
  const op = opts?.upsert
    ? c.from(table).upsert(rows, { onConflict: opts?.onConflict || "id" })
    : c.from(table).insert(rows);
  const { error } = await op;
  if (error) throw error;
}

export async function connDeleteAll(conn: DbConnection, table: string): Promise<void> {
  if (conn.provider === "firebase") {
    const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
    await fsDeleteAll(conn.id, cfg, table);
    return;
  }
  if (getConnectionKeyType(conn) === "service_role") {
    await callProxy({ url: conn.url, key: conn.key, op: "delete", table, query: "id=not.is.null" });
    return;
  }
  const { error } = await getClientFor(conn).from(table).delete().not("id", "is", null);
  if (error) throw error;
}

export async function connDeleteById(conn: DbConnection, table: string, id: string): Promise<void> {
  if (conn.provider === "firebase") {
    const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
    await fsDeleteById(conn.id, cfg, table, id);
    return;
  }
  if (getConnectionKeyType(conn) === "service_role") {
    await callProxy({
      url: conn.url,
      key: conn.key,
      op: "delete",
      table,
      query: `id=eq.${encodeURIComponent(id)}`,
    });
    return;
  }
  const { error } = await getClientFor(conn).from(table).delete().eq("id", id);
  if (error) throw error;
}

/**
 * Seed a Firebase destination with placeholder documents so the canonical app
 * collections are visible in the Firestore console. No-op for Supabase
 * destinations.
 */
export async function bootstrapFirebaseSchema(
  conn: DbConnection,
  collections: string[] = FIREBASE_APP_COLLECTIONS,
) {
  if (conn.provider !== "firebase") {
    throw new Error("bootstrapFirebaseSchema only supports Firebase connections");
  }
  const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
  return bootstrapFirestoreSchema(conn.id, cfg, collections);
}

/**
 * Document-aware transfer for Firestore destinations. Honors id preservation
 * and per-document conflict rules (merge / replace / skip). Falls back to the
 * generic `connInsert` path for Supabase destinations.
 */
export async function connTransferRows(
  dest: DbConnection,
  table: string,
  rows: any[],
  opts: {
    mode: "upsert" | "replace" | "skip";
    /** When true and dest is Supabase, wipe destination table first. */
    wipeBeforeReplace?: boolean;
  },
): Promise<{ written: number; skipped: number; created: number; errors: string[] }> {
  if (dest.provider === "firebase") {
    const cfg = dest.firebaseConfig || parseFirebaseConfig(dest.key);
    const fsMode: FirestoreWriteMode =
      opts.mode === "replace" ? "replace" : opts.mode === "skip" ? "skip" : "merge";
    return fsTransfer(dest.id, cfg, table, rows, fsMode);
  }
  // Supabase path: replace = wipe + insert; skip not supported (PostgREST has
  // no native "do nothing on conflict" via REST), so it degrades to upsert.
  if (opts.mode === "replace" && opts.wipeBeforeReplace) {
    await connDeleteAll(dest, table);
  }
  if (rows.length) {
    await connInsert(dest, table, rows, {
      upsert: opts.mode !== "replace" || !opts.wipeBeforeReplace,
      onConflict: "id",
    });
  }
  return { written: rows.length, skipped: 0, created: 0, errors: [] };
}

// SQL used to bootstrap the destination project with the same tables the
// app expects. Safe to re-run (CREATE IF NOT EXISTS + RLS guard).
export const APP_SCHEMA_SQL = `
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo text default '',
  bio text default '',
  total_points integer default 0,
  previous_rank integer,
  assigned_goals jsonb not null default '[]'::jsonb,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.master_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  points integer not null default 0,
  category_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'system',
  action text not null,
  details text default '',
  timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.page_views (
  date date primary key,
  hits integer not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  path text,
  device text not null default 'desktop',
  is_admin boolean not null default false,
  session_id text not null,
  ref_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
do $$ begin
  perform 1;
  -- Enable RLS + public policies so the publishable key can also read/write.
  execute 'alter table public.students enable row level security';
  execute 'alter table public.master_goals enable row level security';
  execute 'alter table public.categories enable row level security';
  execute 'alter table public.activity_logs enable row level security';
  execute 'alter table public.page_views enable row level security';
  execute 'alter table public.settings enable row level security';
  execute 'alter table public.app_events enable row level security';
exception when others then null; end $$;
do $$ declare t text; begin
  for t in select unnest(array['students','master_goals','categories','activity_logs','page_views','settings','app_events']) loop
    begin execute format('create policy "Public read %1$s" on public.%1$I for select using (true)', t); exception when duplicate_object then null; end;
    begin execute format('create policy "Public insert %1$s" on public.%1$I for insert with check (true)', t); exception when duplicate_object then null; end;
    begin execute format('create policy "Public update %1$s" on public.%1$I for update using (true)', t); exception when duplicate_object then null; end;
    begin execute format('create policy "Public delete %1$s" on public.%1$I for delete using (true)', t); exception when duplicate_object then null; end;
  end loop;
end $$;
`;

// SQL helper that the user must paste once into the destination's SQL editor
// to enable exec_sql calls from this app. Returned to the UI for copy/paste.
export const EXEC_SQL_BOOTSTRAP = `create or replace function public.exec_sql(sql text)
returns void
language plpgsql
security definer
set search_path = public
as $$ begin execute sql; end; $$;`;
