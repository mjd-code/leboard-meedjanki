import { createClient } from "@supabase/supabase-js";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const FIREBASE_APP_COLLECTIONS = [
  "admin_users",
  "students",
  "master_goals",
  "categories",
  "activity_logs",
  "page_views",
  "settings",
  "app_events",
];

async function run() {
  const DEFAULT_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_NK7ByKJ_l2qizNoICxrnXQ_-2zTWOiE";
  const DEFAULT_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://xmsjbzujyfrkecgwfxlc.supabase.co";

  const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

  const firebaseConfig = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  for (const table of FIREBASE_APP_COLLECTIONS) {
    console.log(`Migrating ${table}...`);
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.error(`Error reading ${table} from Supabase:`, error);
        continue;
      }
      if (!data || data.length === 0) {
        console.log(`No data in ${table}`);
        continue;
      }
      for (const row of data) {
        let idStr = String(row.id || row.uuid || row.key || Date.now() + Math.random());
        const docRef = doc(db, table, idStr);
        await setDoc(docRef, row);
      }
      console.log(`Migrated ${data.length} rows to ${table}`);
    } catch (e) {
      console.error(`Error processing ${table}:`, e);
    }
  }

  console.log("Migration complete.");
  process.exit(0);
}

run().catch(console.error);
