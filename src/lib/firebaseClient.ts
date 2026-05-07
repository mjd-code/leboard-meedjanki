// Phase 1 unification: re-export the single env-driven Firebase app.
// All other modules MUST import from here (or src/lib/firebase/config) — no
// more JSON config files, no hardcoded project ids.
export { app, auth, db, firebaseConfig } from "./firebase/config";
