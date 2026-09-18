import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapApp } from "@/app/bootstrap";
import { logCacheStatus } from "@/core/persistence/offline-storage";

bootstrapApp();

console.log('main.tsx: Starting application render...');

try {
  const rootElement = document.getElementById("root");
  console.log('main.tsx: Root element found:', !!rootElement);
  
  if (rootElement) {
    createRoot(rootElement).render(<App />);
    console.log('main.tsx: App rendered successfully');
  } else {
    console.error('main.tsx: Root element not found!');
  }
} catch (error) {
  console.error('main.tsx: Error during render:', error);
}

// Log cache status for debugging in development
if (import.meta.env.DEV) {
  setTimeout(() => {
    logCacheStatus();
  }, 2000);
}
