"use client";

import React, { useState, useEffect } from "react";
import { Download, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallApkButton() {
  const [isStandalone, setIsStandalone] = useState(true); // Default to true to prevent hydration mismatch flashes
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed app/TWA)
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    setIsStandalone(mediaQuery.matches || (window.navigator as any).standalone === true);

    const listener = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  if (isStandalone) return null; // Hide if already installed

  const apkUrl = "/app-release.apk"; // Ensure this is available in public/
  const fullApkUrl = typeof window !== 'undefined' ? `${window.location.origin}${apkUrl}` : apkUrl;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = apkUrl;
    a.download = "leboard-app.apk";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullApkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl max-w-sm mx-auto">
      <h3 className="font-semibold text-sm text-center">Install Android App</h3>
      <p className="text-xs text-muted-foreground text-center mb-1">
        Get the best experience by installing our native APK.
      </p>
      
      <Button 
        onClick={handleDownload} 
        className="w-full font-bold shadow-sm"
      >
        <Download className="w-4 h-4 mr-2" />
        Download APK
      </Button>

      <Button 
        variant="outline" 
        onClick={copyLink} 
        className="w-full text-xs h-9"
      >
        {copied ? (
          <><Check className="w-3.5 h-3.5 mr-2 text-green-500" /> Link Copied</>
        ) : (
          <><Copy className="w-3.5 h-3.5 mr-2" /> Copy link to share</>
        )}
      </Button>
    </div>
  );
}
