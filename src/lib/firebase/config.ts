import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBd7GSBo-TX1jq5owp0umA_LfORfqnYMZ0",
  authDomain: "ngambonpesantren.firebaseapp.com",
  projectId: "ngambonpesantren",
  storageBucket: "ngambonpesantren.firebasestorage.app",
  messagingSenderId: "910820220862",
  appId: "1:910820220862:web:567e3698c39c0c574023ef"
};

// Initialize Firebase securely to prevent duplicate instances during HMR
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app, "ngambonpesantren-db-firebase-01");

export { app, auth, db };
