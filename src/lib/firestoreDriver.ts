// Firestore driver for the Multi-Backend DB Management module.
// Implements the same surface (select / insert / upsert / update / delete /
// listTables / test) that dbConnections.ts exposes for Supabase, but mapped
// onto the NoSQL document model:
//   - "table"  -> Firestore collection name
//   - "row"    -> Firestore document
//   - "id"     -> document id
//
// The Firebase Web SDK is initialized client-side with a *publishable* config
// object (apiKey, projectId, etc. — these are not secrets in Firebase's
// security model; access is gated by Firestore Security Rules on the server).
// Each connection gets its own named FirebaseApp so multiple Firestore
// projects can coexist with the Supabase ones.

import {
  initializeApp,
  getApp,
  getApps,
  deleteApp,
} from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  limit as fsLimit,
} from "firebase/firestore";

// Local structural stand-ins. The firebase package re-exports these names as
// namespaces in some bundler configs which breaks `type` imports. We only
// need an opaque shape for our internal cache/maps.
type FirebaseOptions = Record<string, any>;
type FirebaseApp = { name: string; options: any; automaticDataCollectionEnabled?: boolean };
type Firestore = any;

export type FirebaseConfig = FirebaseOptions & {
  apiKey: string;
  projectId: string;
  databaseId?: string;
  firestoreDatabaseId?: string;
  authDomain?: string;
  appId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

/** Default collections the app expects (mirrors APP_TABLES). */
export const FIREBASE_APP_COLLECTIONS = [
  "admin_users",
  "students",
  "master_goals",
  "categories",
  "activity_logs",
  "page_views",
  "settings",
  "app_events",
];

/**
 * Default field templates seeded by `bootstrapFirestoreSchema`. Each template
 * is written as a single `__schema__` document so the collection becomes
 * visible in the Firestore console without polluting real data. The doc is
 * tagged `__bootstrap: true` so admins can filter or remove it later.
 */
export const FIREBASE_DEFAULT_DOCS: Record<string, Record<string, any>> = {
  admin_users: {
    email: "",
    password: "",
    full_name: "",
    photo_url: "",
    role: "admin",
    privileges: [],
    created_at: "",
  },
  students: {
    name: "",
    photo: "",
    bio: "",
    total_points: 0,
    previous_rank: null,
    assigned_goals: [],
    tags: [],
  },
  master_goals: {
    title: "",
    description: "",
    points: 0,
    category_id: null,
  },
  categories: { name: "" },
  activity_logs: {
    type: "system",
    action: "",
    details: "",
    timestamp: null,
  },
  page_views: { date: "", hits: 0 },
  settings: { data: {} },
  app_events: {
    event_type: "",
    path: "",
    device: "desktop",
    is_admin: false,
    session_id: "",
    ref_id: null,
    metadata: {},
  },
};

const appCache = new Map<string, FirebaseApp>();
const dbCache = new Map<string, Firestore>();

/** Parse a Firebase config blob from JSON or `key=value` lines. */
export function parseFirebaseConfig(input: string): FirebaseConfig {
  const trimmed = (input || "").trim();
  if (!trimmed) throw new Error("Empty Firebase config");

  // Try JSON first.
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    if (!parsed.apiKey || !parsed.projectId) {
      throw new Error("Firebase config missing apiKey or projectId");
    }
    return parsed as FirebaseConfig;
  }

  // Fallback: parse `key: "value"` or `key=value` lines.
  const out: any = {};
  trimmed.split(/\r?\n/).forEach((line) => {
    const m = line.match(/([a-zA-Z_]+)\s*[:=]\s*['"]?([^'",]+)['"]?/);
    if (m) out[m[1]] = m[2].trim();
  });
  if (!out.apiKey || !out.projectId) {
    throw new Error("Firebase config missing apiKey or projectId");
  }
  return out as FirebaseConfig;
}

/** Initialize (or reuse) a FirebaseApp + Firestore instance for a connection. */
export function connectFirestore(connId: string, config: FirebaseConfig): Firestore {
  if (dbCache.has(connId)) return dbCache.get(connId)!;

  let app: FirebaseApp;
  try {
    app = getApp(connId);
  } catch {
    app = initializeApp(config, connId);
  }
  appCache.set(connId, app);
  const databaseId = config.firestoreDatabaseId || config.databaseId || "(default)";
  let db: Firestore;
  try {
    db = initializeFirestore(app, { experimentalForceLongPolling: true }, databaseId);
  } catch {
    db = getFirestore(app, databaseId);
  }
  dbCache.set(connId, db);
  return db;
}

export function disposeFirestore(connId: string) {
  const app = appCache.get(connId);
  if (app) {
    deleteApp(app).catch(() => {});
  }
  appCache.delete(connId);
  dbCache.delete(connId);
}

/** Per-collection probe result returned by `testFirestore`. */
export type FirestoreCollectionProbe = {
  name: string;
  exists: boolean; // has at least 1 non-bootstrap document
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  docCount: number;
  readError?: string;
  writeError?: string;
  deleteError?: string;
};

export type FirestoreTestResult = {
  ok: boolean;
  error?: string;
  missingTables: string[]; // collections with 0 real docs
  probes: FirestoreCollectionProbe[];
};

/**
 * Detailed connectivity + Security-Rules dry-run.
 *
 * For each expected collection we attempt:
 *   1. read  — `getDocs(query(coll, limit(1)))`
 *   2. write — `setDoc(coll/__lovable_probe__, { ... }, { merge: true })`
 *   3. delete— `deleteDoc(coll/__lovable_probe__)`
 *
 * The probe document id is constant so re-runs are idempotent. Failures are
 * captured per-collection so the UI can show actionable error messages
 * (typically "Missing or insufficient permissions" from Firestore Rules).
 */
export async function testFirestore(
  connId: string,
  config: FirebaseConfig,
  expectedCollections: string[] = FIREBASE_APP_COLLECTIONS,
): Promise<FirestoreTestResult> {
  let db: Firestore;
  try {
    db = connectFirestore(connId, config);
  } catch (e: any) {
    return {
      ok: false,
      error: `Firebase init failed: ${String(e?.message || e)}`,
      missingTables: expectedCollections,
      probes: [],
    };
  }

  const PROBE_ID = "__lovable_probe__";
  const probes: FirestoreCollectionProbe[] = [];

  for (const name of expectedCollections) {
    const probe: FirestoreCollectionProbe = {
      name,
      exists: false,
      canRead: false,
      canWrite: false,
      canDelete: false,
      docCount: 0,
    };

    // 1) read
    try {
      const snaps = await getDocs(query(collection(db, name), fsLimit(2)));
      probe.canRead = true;
      probe.docCount = snaps.size;
      probe.exists = snaps.docs.some((d: any) => d.id !== PROBE_ID);
    } catch (e: any) {
      const msg = String(e?.message || e);
      // Add a helpful hint when the named Firestore DB does not exist.
      if (/NOT_FOUND|Database .* not found|database does not exist/i.test(msg)) {
        probe.readError =
          `${msg} — The Firestore database id "${
            (config as any).firestoreDatabaseId || (config as any).databaseId || "(default)"
          }" was not found on project "${config.projectId}". ` +
          `Either create that database in the Firebase console (Firestore → Add database), ` +
          `or remove the "firestoreDatabaseId" field so the connection uses the (default) database.`;
      } else if (/permission-denied|Missing or insufficient permissions/i.test(msg)) {
        probe.readError =
          `${msg} — Update Firestore Security Rules for project "${config.projectId}" to allow reads on collection "${name}". ` +
          `Quick test rule: \`match /{document=**} { allow read, write: if true; }\` (do NOT use in production).`;
      } else {
        probe.readError = msg;
      }
    }

    // 2) write dry-run
    try {
      await setDoc(
        doc(db, name, PROBE_ID),
        { __probe: true, ts: Date.now() },
        { merge: true },
      );
      probe.canWrite = true;
    } catch (e: any) {
      probe.writeError = String(e?.message || e);
    }

    // 3) delete dry-run (only meaningful if the write went through)
    if (probe.canWrite) {
      try {
        await deleteDoc(doc(db, name, PROBE_ID));
        probe.canDelete = true;
      } catch (e: any) {
        probe.deleteError = String(e?.message || e);
      }
    }

    probes.push(probe);
  }

  const anyReadable = probes.some((p) => p.canRead);
  const missingTables = probes.filter((p) => p.canRead && !p.exists).map((p) => p.name);
  const firstFatal = probes.find((p) => !p.canRead)?.readError;

  return {
    ok: anyReadable,
    error: anyReadable ? undefined : firstFatal || "Firestore unreachable",
    missingTables,
    probes,
  };
}

/**
 * Create missing collections by writing a single `__schema__` doc populated
 * with the canonical default fields. Re-running is safe because we use
 * `setDoc(..., { merge: true })`.
 *
 * Returns a per-collection log so the UI can render a detailed report.
 */
export async function bootstrapFirestoreSchema(
  connId: string,
  config: FirebaseConfig,
  collections: string[] = FIREBASE_APP_COLLECTIONS,
): Promise<{ name: string; ok: boolean; created: boolean; error?: string }[]> {
  const db = connectFirestore(connId, config);
  const SCHEMA_ID = "__schema__";
  const out: { name: string; ok: boolean; created: boolean; error?: string }[] = [];

  for (const name of collections) {
    try {
      // Skip seeding if the collection already has user data.
      const existing = await getDocs(query(collection(db, name), fsLimit(1)));
      const hasReal = existing.docs.some(
        (d: any) => d.id !== SCHEMA_ID && d.id !== "__lovable_probe__",
      );
      if (hasReal) {
        out.push({ name, ok: true, created: false });
        continue;
      }
      const template = FIREBASE_DEFAULT_DOCS[name] || {};
      await setDoc(
        doc(db, name, SCHEMA_ID),
        { ...template, __bootstrap: true, __created_at: Date.now() },
        { merge: true },
      );
      out.push({ name, ok: true, created: true });
    } catch (e: any) {
      out.push({ name, ok: false, created: false, error: String(e?.message || e) });
    }
  }
  return out;
}

/** Treat the canonical app collections as "tables". */
export async function listFirestoreTables(): Promise<string[]> {
  // The Web SDK cannot enumerate collections (admin-only API), so we expose
  // the curated list. Custom collection names can still be typed in the UI.
  return [...FIREBASE_APP_COLLECTIONS];
}

function snapshotToRow(snap: any): any {
  const data = snap.data() || {};
  return { id: snap.id, ...data };
}

export async function fsSelect(
  connId: string,
  config: FirebaseConfig,
  table: string,
  max = 1000,
): Promise<any[]> {
  const db = connectFirestore(connId, config);
  const snaps = await getDocs(query(collection(db, table), fsLimit(max)));
  return snaps.docs.map(snapshotToRow);
}

export async function fsInsert(
  connId: string,
  config: FirebaseConfig,
  table: string,
  rows: any[],
  opts?: { upsert?: boolean },
): Promise<any[]> {
  if (!rows.length) return [];
  const db = connectFirestore(connId, config);
  const out: any[] = [];
  for (const row of rows) {
    const { id, ...rest } = row || {};
    if (id) {
      // Use deterministic id; setDoc with merge=true acts as upsert.
      await setDoc(doc(db, table, String(id)), rest, {
        merge: !!opts?.upsert,
      });
      out.push({ id, ...rest });
    } else {
      const ref = await addDoc(collection(db, table), rest);
      out.push({ id: ref.id, ...rest });
    }
  }
  return out;
}

/**
 * Firestore-native bulk transfer that respects document-level conflict rules
 * and preserves the source `id` whenever possible.
 *
 *   - mode: "merge"   → setDoc(..., { merge: true })  (default upsert)
 *   - mode: "replace" → setDoc(..., { merge: false }) (overwrite full doc)
 *   - mode: "skip"    → only write when the destination doc does NOT exist
 *
 * Rows without an `id` always fall back to `addDoc` (auto-id) since there is
 * nothing to conflict with.
 */
export type FirestoreWriteMode = "merge" | "replace" | "skip";

export async function fsTransfer(
  connId: string,
  config: FirebaseConfig,
  table: string,
  rows: any[],
  mode: FirestoreWriteMode = "merge",
): Promise<{ written: number; skipped: number; created: number; errors: string[] }> {
  const stats = { written: 0, skipped: 0, created: 0, errors: [] as string[] };
  if (!rows.length) return stats;
  const db = connectFirestore(connId, config);

  for (const row of rows) {
    const { id, ...rest } = row || {};
    try {
      if (!id) {
        const ref = await addDoc(collection(db, table), rest);
        stats.created++;
        // Annotate stats but do not push to errors.
        void ref;
        continue;
      }
      const ref = doc(db, table, String(id));
      if (mode === "skip") {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          stats.skipped++;
          continue;
        }
        await setDoc(ref, rest, { merge: false });
        stats.written++;
      } else if (mode === "replace") {
        await setDoc(ref, rest, { merge: false });
        stats.written++;
      } else {
        // merge (default upsert)
        await setDoc(ref, rest, { merge: true });
        stats.written++;
      }
    } catch (e: any) {
      stats.errors.push(`id=${row?.id ?? "(auto)"} → ${String(e?.message || e)}`);
    }
  }
  return stats;
}

export async function fsUpdate(
  connId: string,
  config: FirebaseConfig,
  table: string,
  id: string,
  patch: Record<string, any>,
): Promise<any> {
  const db = connectFirestore(connId, config);
  const ref = doc(db, table, String(id));
  // Firestore updateDoc fails if the doc doesn't exist; setDoc(merge) is safer.
  await setDoc(ref, patch, { merge: true });
  const snap = await getDoc(ref);
  return snap.exists() ? snapshotToRow(snap) : { id, ...patch };
}

export async function fsDeleteById(
  connId: string,
  config: FirebaseConfig,
  table: string,
  id: string,
): Promise<void> {
  const db = connectFirestore(connId, config);
  await deleteDoc(doc(db, table, String(id)));
}

export async function fsDeleteAll(
  connId: string,
  config: FirebaseConfig,
  table: string,
): Promise<void> {
  const db = connectFirestore(connId, config);
  const snaps = await getDocs(collection(db, table));
  await Promise.all(snaps.docs.map((d: any) => deleteDoc(d.ref)));
}