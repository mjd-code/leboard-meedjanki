import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBd7GSBo-TX1jq5owp0umA_LfORfqnYMZ0",
  authDomain: "ngambonpesantren.firebaseapp.com",
  projectId: "ngambonpesantren",
  storageBucket: "ngambonpesantren.firebasestorage.app",
  messagingSenderId: "910820220862",
  appId: "1:910820220862:web:567e3698c39c0c574023ef",
};

const DB_ID = "ngambonpesantren-db-firebase-01";

// Initialize app once (HMR-safe)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);

/**
 * Firestore with IndexedDB offline persistence.
 *
 * - On the browser we use `initializeFirestore` + `persistentLocalCache` with
 *   the multi-tab manager so multiple tabs share one cache (replaces the
 *   deprecated `enableMultiTabIndexedDbPersistence`).
 * - On the server (SSR) IndexedDB does not exist; we fall back to the
 *   default in-memory `getFirestore` so imports don't crash during build.
 * - Wrapped in try/catch: if the browser blocks IDB (e.g. private mode in
 *   older Safari) we degrade to the default in-memory Firestore.
 */
function createDb() {
  if (typeof window === "undefined") {
    return getFirestore(app, DB_ID);
  }
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      DB_ID,
    );
  } catch {
    return getFirestore(app, DB_ID);
  }
}

const db = createDb();

export { app, auth, db };
