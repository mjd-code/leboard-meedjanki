"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  applyThemeColors,
  PRESETS,
} from "@/components/admin/AdminAppearanceTab";
import { useAuthQuery, useAppDataQuery } from "@/hooks/useAppQueries";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { removeLocalToken } from "@/lib/auth";
import { setAnalyticsAdminFlag } from "@/lib/analytics";
import { ImageFallback } from "@/components/ImageFallback";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { FloatingSettingsFab } from "@/components/ui/FloatingSettingsFab";
import { PwaDownloadPrompt } from "@/components/ui/PwaDownloadPrompt";
import {
  Trophy,
  Settings,
  LogOut,
  Loader2,
  Newspaper,
  BarChart3,
  Sun,
  Moon,
} from "lucide-react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AppContent>{children}</AppContent>
    </ErrorBoundary>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Phase 2: Defer Firebase-dependent rendering until after client mount to
  // eliminate SSR hydration mismatch (server has no Firebase access; client
  // resolves auth/data asynchronously).
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const { data: authData, isLoading: isAuthLoading } = useAuthQuery();
  const { data: appData, isLoading: isAppDataLoading } = useAppDataQuery();

  // Auto-refresh queries when DB changes (posts, students, categories, settings, master_goals)
  useRealtimeSync();

  const appSettings = appData?.appSettings || {};
  const isAdmin = !!authData?.authenticated;
  const isLoading = isAppDataLoading && !appData;

  // Local override for preset (cycle button). Falls back to server appSettings.
  const [presetOverride, setPresetOverride] = useState<string | null>(null);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("theme-preset")
        : null;
    if (saved && PRESETS[saved]) {
      setPresetOverride(saved);
    } else {
      // Default to fresh_majestic (Green-Yellow) on first visit
      setPresetOverride("fresh_majestic_yellow");
      if (typeof window !== "undefined")
        localStorage.setItem("theme-preset", "fresh_majestic_yellow");
    }
  }, []);

  useEffect(() => {
    const merged = {
      ...appSettings,
      ...(presetOverride ? { activePresetId: presetOverride } : {}),
    };
    if (Object.keys(merged).length > 0) applyThemeColors(merged);
  }, [appSettings, presetOverride]);

  const cyclePreset = useCallback(() => {
    const keys = Object.keys(PRESETS);
    const current = presetOverride || appSettings.activePresetId || keys[0];
    const idx = keys.indexOf(current);
    const next = keys[(idx + 1) % keys.length];
    setPresetOverride(next);
    localStorage.setItem("theme-preset", next);
  }, [presetOverride, appSettings.activePresetId]);

  const activePresetName =
    PRESETS[
      presetOverride || appSettings.activePresetId || "fresh_majestic_yellow"
    ]?.name || "Theme";

  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme-mode") as "light" | "dark" | null;
    // Phase 1: Force dark on first visit, ignore OS preference
    if (saved) {
      setThemeMode(saved);
    } else {
      localStorage.setItem("theme-mode", "dark");
    }
  }, []);

  useEffect(() => {
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme-mode", themeMode);
  }, [themeMode]);

  const toggleTheme = () =>
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));

  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      !localStorage.getItem("vite_sw_cleared_v2")
    ) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        let cleared = false;
        for (const registration of registrations) {
          registration.unregister();
          console.log("Unregistered old ServiceWorker:", registration);
          cleared = true;
        }
        localStorage.setItem("vite_sw_cleared_v2", "true");
        if (cleared) {
          setTimeout(() => window.location.reload(), 500);
        }
      });
    }
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      queryClient.setQueryData(["auth"], { authenticated: false });
      router.push("/login");
    };
    window.addEventListener("auth-expired", handleAuthExpired);

    setAnalyticsAdminFlag(isAdmin);
    // GA4 now handles page views and unique visitor tracking.
    // Only keep admin flag for internal analytics events.

    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, [isAdmin, queryClient, router]);

  const refreshData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["app-data"] });
  }, []);

  useEffect(() => {
    let t: any = null;
    const handler = () => {
      clearTimeout(t);
      t = setTimeout(() => refreshData(), 150);
    };
    window.addEventListener("db-connection-changed", handler);
    return () => {
      window.removeEventListener("db-connection-changed", handler);
      clearTimeout(t);
    };
  }, [refreshData]);

  // Phase 2: SSR returns null to guarantee no hydration mismatch. The first
  // client paint also returns null, then mounts the real tree on the next
  // commit. Loader is only shown after mount while data is loading.
  if (!isMounted) return null;

  if (isAuthLoading || isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-primary font-bold tracking-widest uppercase text-xs">
          Memuat Aplikasi...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col pb-20 md:pb-0">
      {/* Navbar Global – Leaderboard | Logo (center) | Berita */}
      <nav className="bg-background border-b border-border sticky top-0 z-40 shadow-soft hidden md:block">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between items-center h-20">
            {/* Left: Leaderboard */}
            <button
              onClick={() => router.push("/leaderboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${pathname === "/leaderboard" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
            >
              <BarChart3 className="w-5 h-5" />
              Peringkat
            </button>

            {/* Center: Logo (absolute center) */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 cursor-pointer group bg-background border rounded-full mt-10"
              onClick={() => router.push("/")}
            >
              {appSettings.logoUrl ? (
                <ImageFallback
                  src={appSettings.logoUrl}
                  alt="Logo"
                  variant="logo"
                  className="h-22 w-22 object-contain rounded-xl"
                  wrapperClassName="h-22 w-22"
                />
              ) : (
                <div className="bg-primary p-2 rounded-xl group-hover:rotate-6 transition-transform">
                  <Trophy className="h-6 w-6 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Right: Berita */}
            <button
              onClick={() => router.push("/blog")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${(pathname || "").startsWith("/blog") || (pathname || "").startsWith("/berita") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
            >
              <Newspaper className="w-5 h-5" />
              Berita
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 overflow-x-hidden">
        <ErrorBoundary>
          <div key={pathname}>{children}</div>
        </ErrorBoundary>
      </main>

      {/* Floating Settings FAB – bottom-right, below ScrollToTop */}
      <FloatingSettingsFab
        themeMode={themeMode}
        toggleTheme={toggleTheme}
        activePresetId={
          presetOverride ||
          appSettings.activePresetId ||
          "fresh_majestic_yellow"
        }
        cyclePreset={cyclePreset}
        activePresetName={activePresetName}
        isAdmin={isAdmin}
      />

      {/* Scroll to top – bottom-right, above FAB (with breathing room) */}
      <div className="fixed bottom-40 md:bottom-18 right-4 z-50">
        <ScrollToTop />
      </div>

      <PwaDownloadPrompt />

      {/* Mobile Bottom Nav – Leaderboard | Logo (absolute center) | Berita */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden z-50">
        {/* Logo – absolute center of screen */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-10">
          {appSettings?.logoUrl ? (
            <div
              className="w-20 h-20 rounded-full border border-border bg-card shadow-soft flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform"
              onClick={() => router.push("/")}
            >
              <ImageFallback
                src={appSettings.logoUrl}
                alt="Logo"
                variant="logo"
                className="w-full h-full object-cover"
                wrapperClassName="w-full h-full"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-full border-4 border-border bg-card shadow-soft flex items-center justify-center text-primary cursor-pointer active:scale-95 transition-transform"
              onClick={() => router.push("/")}
            >
              <Trophy className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-8">
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(50);
              router.push("/leaderboard");
            }}
            className={`flex flex-col items-center gap-1.5 transition-colors ${pathname === "/leaderboard" ? "text-primary" : "text-muted-foreground/60 hover:text-muted-foreground"}`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Peringkat
            </span>
          </button>

          {/* Spacer for logo */}
          <div className="w-16" />

          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(50);
              router.push("/blog");
            }}
            className={`flex flex-col items-center gap-1.5 transition-colors ${(pathname || "").startsWith("/blog") || (pathname || "").startsWith("/berita") ? "text-primary" : "text-muted-foreground/60 hover:text-muted-foreground"}`}
          >
            <Newspaper className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Berita
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
