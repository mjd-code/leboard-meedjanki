import firebaseConfig from '../../firebase-applet-config.json';
import {
  parseFirebaseConfig,
  fsSelect,
  fsInsert,
  fsUpdate,
  fsDeleteAll,
  fsDeleteById,
  type FirebaseConfig,
} from './firestoreDriver';

export const DEFAULT_CONNECTION_ID = "lovable-cloud-firebase";

// Provide a mock connection that holds our Firebase env config
const defaultConnection = {
  id: DEFAULT_CONNECTION_ID,
  label: "Firebase backend",
  provider: "firebase" as const,
  url: "firestore://app",
  key: "{}",
  firebaseConfig: firebaseConfig as FirebaseConfig
};

export type DbConnection = typeof defaultConnection;

export function getActiveConnection() {
  return defaultConnection;
}

export function markConnectionFailed(id: string) {
  // no-op
}

export async function connSelect(conn: DbConnection, table: string): Promise<any[]> {
  const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
  return fsSelect(conn.id, cfg, table);
}

export async function connSelectQuery(conn: DbConnection, table: string, query?: string): Promise<any[]> {
  // Ignoring the postgREST query string in simple firebase driver
  const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
  return fsSelect(conn.id, cfg, table);
}

export async function connInsertReturning(conn: DbConnection, table: string, rows: any[]): Promise<any[]> {
  if (!rows.length) return [];
  const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
  return fsInsert(conn.id, cfg, table, rows);
}

export async function connUpsertReturning(conn: DbConnection, table: string, rows: any[], onConflict = "id"): Promise<any[]> {
  if (!rows.length) return [];
  const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
  return fsInsert(conn.id, cfg, table, rows, { upsert: true });
}

export async function connUpdate(conn: DbConnection, table: string, filter: string, patch: Record<string, any>): Promise<any[]> {
  const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
  const m = filter.match(/(?:^|&)id=eq\.([^&]+)/);
  if (!m) {
    throw new Error(`Firestore connUpdate only supports "id=eq.<id>" filters (got "${filter}")`);
  }
  const updated = await fsUpdate(conn.id, cfg, table, decodeURIComponent(m[1]), patch);
  return [updated];
}

export async function connDeleteById(conn: DbConnection, table: string, id: string): Promise<void> {
  const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
  await fsDeleteById(conn.id, cfg, table, id);
}

export async function connDeleteAll(conn: DbConnection, table: string): Promise<void> {
  const cfg = conn.firebaseConfig || parseFirebaseConfig(conn.key);
  await fsDeleteAll(conn.id, cfg, table);
}
