// ============================================================================
// Firebase Admin SDK singleton.
// Server-only. Initializes once per Node process using env credentials.
// Exposes Firestore + Realtime Database handles.
// ============================================================================
import "server-only";
import {
  initializeApp,
  cert,
  getApps,
  getApp,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "";
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || "";
const PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || "").replace(
  /\\n/g,
  "\n",
);
const DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL ||
  (PROJECT_ID
    ? `https://${PROJECT_ID}-default-rtdb.asia-southeast1.firebasedatabase.app`
    : undefined);

function initAdmin(): App {
  if (getApps().length) return getApp();
  const credential =
    PROJECT_ID && CLIENT_EMAIL && PRIVATE_KEY
      ? cert({
          projectId: PROJECT_ID,
          clientEmail: CLIENT_EMAIL,
          privateKey: PRIVATE_KEY,
        })
      : applicationDefault();
  return initializeApp({
    credential,
    projectId: PROJECT_ID || undefined,
    databaseURL: DATABASE_URL,
  });
}

const app = initAdmin();

export const adminApp = app;
export const adminDb = getFirestore(app);
export const adminRtdb = getDatabase(app);
export { FieldValue };

// Firestore database id (custom, non-default) — apply if configured.
const FIRESTORE_DB_ID = process.env.FIREBASE_FIRESTORE_DB_ID;
if (FIRESTORE_DB_ID) {
  try {
    adminDb.settings({ databaseId: FIRESTORE_DB_ID, ignoreUndefinedProperties: true });
  } catch {
    /* settings may already be locked in dev hot-reload */
  }
} else {
  try {
    adminDb.settings({ ignoreUndefinedProperties: true });
  } catch {}
}