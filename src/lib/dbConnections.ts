// Phase 1 unification: env-driven single connection that routes directly to
// the unified Firestore native SDK. No more JSON config, no proxy multi-DB.
import { firebaseConfig } from './firebase/config';
import {
  fsSelect,
  fsInsert,
  fsUpdate,
  fsDeleteAll,
  fsDeleteById,
  type FirebaseConfig,
} from './firestoreDriver';

export const DEFAULT_CONNECTION_ID = "lovable-cloud-firebase";

const ENV_FIREBASE_CONFIG: FirebaseConfig = {
  ...(firebaseConfig as any),
  // Pull explicit DB id from env if present; never literal "(default)".
  firestoreDatabaseId:
    (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DB_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DB_ID !== "(default)"
        ? process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DB_ID
        : ""),
};

const defaultConnection = {
  id: DEFAULT_CONNECTION_ID,
  label: "Firebase backend",
  provider: "firebase" as const,
  url: "firestore://app",
  key: "{}",
  firebaseConfig: ENV_FIREBASE_CONFIG,
};

export type DbConnection = typeof defaultConnection;

export function getActiveConnection() {
  return defaultConnection;
}

export function markConnectionFailed(_id: string) {
  /* no-op */
}

export async function connSelect(conn: DbConnection, table: string): Promise<any[]> {
  return fsSelect(conn.id, conn.firebaseConfig, table);
}

export async function connSelectQuery(conn: DbConnection, table: string, _query?: string): Promise<any[]> {
  return fsSelect(conn.id, conn.firebaseConfig, table);
}

export async function connInsertReturning(conn: DbConnection, table: string, rows: any[]): Promise<any[]> {
  if (!rows.length) return [];
  return fsInsert(conn.id, conn.firebaseConfig, table, rows);
}

export async function connUpsertReturning(conn: DbConnection, table: string, rows: any[], _onConflict = "id"): Promise<any[]> {
  if (!rows.length) return [];
  return fsInsert(conn.id, conn.firebaseConfig, table, rows, { upsert: true });
}

export async function connUpdate(conn: DbConnection, table: string, filter: string, patch: Record<string, any>): Promise<any[]> {
  const m = filter.match(/(?:^|&)id=eq\.([^&]+)/);
  if (!m) {
    throw new Error(`Firestore connUpdate only supports "id=eq.<id>" filters (got "${filter}")`);
  }
  const updated = await fsUpdate(conn.id, conn.firebaseConfig, table, decodeURIComponent(m[1]), patch);
  return [updated];
}

export async function connDeleteById(conn: DbConnection, table: string, id: string): Promise<void> {
  await fsDeleteById(conn.id, conn.firebaseConfig, table, id);
}

export async function connDeleteAll(conn: DbConnection, table: string): Promise<void> {
  await fsDeleteAll(conn.id, conn.firebaseConfig, table);
}
