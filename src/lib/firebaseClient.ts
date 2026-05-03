import { initializeApp, getApps } from "firebase/app";
import firebaseConfig from "../../firebase-applet-config.json";

function initApp() {
  const apps = getApps();
  const defaultApp = apps.find((a: any) => a.name === '[DEFAULT]');
  if (defaultApp) return defaultApp;
  return initializeApp(firebaseConfig);
}

const app = initApp();
export { app };
