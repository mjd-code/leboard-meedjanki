"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { applyThemeColors, PRESETS } from "@/components/admin/AdminAppearanceTab";
import { useAuthQuery, useAppDataQuery } from "@/hooks/useAppQueries";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { apiFetch, removeLocalToken } from "@/lib/api";
import { trackEvent, setAnalyticsAdminFlag } from "@/lib/analytics";
import { ImageFallback } from "@/components/ImageFallback";
import { FloatingActionContainer } from "@/components/ui/FloatingActionContainer";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { PwaDownloadPrompt } from "@/components/ui/PwaDownloadPrompt";
import { Trophy, Settings, LogOut, LogIn, Loader2, Home, LayoutDashboard, Sun, Moon, Palette } from "lucide-react";

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
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme-preset") : null;
    if (saved && PRESETS[saved]) setPresetOverride(saved);
  }, []);

  useEffect(() => {
    const merged = { ...appSettings, ...(presetOverride ? { activePresetId: presetOverride } : {}) };
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
    PRESETS[presetOverride || appSettings.activePresetId || "fresh_majestic"]?.name || "Theme";

  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme-mode") as "light" | "dark";
    if (saved) setThemeMode(saved);
  }, []);

  useEffect(() => {
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme-mode", themeMode);
  }, [themeMode]);

  const toggleTheme = () => setThemeMode((prev) => (prev === "light" ? "dark" : "light"));

  useEffect(() => {
    if ("serviceWorker" in navigator && !localStorage.getItem("vite_sw_cleared_v2")) {
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
    apiFetch("/api/track-visit", { method: "POST" }).catch(() => {});
    trackEvent("page_view");

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

  if (isAuthLoading || isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-primary font-bold tracking-widest uppercase text-xs">Memuat Aplikasi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col pb-20 md:pb-0">
      {/* Navbar Global */}
      <nav className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40 shadow-soft hidden md:block">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push("/")}>
              {appSettings.logoUrl ? (
                <ImageFallback src={appSettings.logoUrl} alt="Logo" variant="logo" className="h-10 w-10 object-contain rounded-xl" wrapperClassName="h-10 w-10" />
              ) : (
                <div className="bg-primary p-2 rounded-xl group-hover:rotate-6 transition-transform">
                  <Trophy className="h-6 w-6 text-primary-foreground" />
                </div>
              )}
              <span className="font-bold text-xl tracking-tight text-foreground">{appSettings.appName || "PPMH"}</span>
            </div>

            <div className="flex items-center space-x-4">
              <button onClick={toggleTheme} className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-secondary rounded-xl">
                {themeMode === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={cyclePreset}
                title={`Theme preset: ${activePresetName} (klik untuk ganti)`}
                aria-label="Cycle theme preset"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-secondary rounded-xl"
              >
                <Palette className="w-5 h-5" />
              </button>
              <button onClick={() => router.push("/")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${pathname === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>
                Beranda
              </button>
              <button onClick={() => router.push("/blog")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${(pathname || "").startsWith("/blog") || (pathname || "").startsWith("/berita") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>
                Berita
              </button>
              <button onClick={() => router.push("/leaderboard")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${pathname === "/leaderboard" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>
                Leaderboard
              </button>

              {isAdmin ? (
                <>
                  <button onClick={() => router.push("/admin")} className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${(pathname || "").startsWith("/admin") ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-secondary"}`}>
                    <Settings className="h-4 w-4" /> Admin Panel
                  </button>
                  <button
                    onClick={async () => {
                      await apiFetch("/api/logout", { method: "POST" });
                      removeLocalToken();
                      queryClient.setQueryData(["auth"], { authenticated: false });
                      trackEvent("admin_logout", { isAdmin: true });
                      router.push("/");
                    }}
                    className="p-2 text-muted-foreground/60 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <button onClick={() => router.push("/login")} className="px-4 py-2 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 border border-primary/20 transition-all">
                  Admin Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 overflow-x-hidden">
        <ErrorBoundary>
          <div key={pathname}>
            {children}
          </div>
        </ErrorBoundary>
      </main>

      <FloatingActionContainer>
        <button onClick={toggleTheme} className="md:hidden p-3 bg-secondary border border-border text-foreground transition-colors shadow-soft rounded-full z-50">
          {themeMode === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <ScrollToTop />
      </FloatingActionContainer>

      <PwaDownloadPrompt />

      {/* Bottom Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-8 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-between items-center md:hidden z-50">
        <button
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(50);
            router.push("/");
          }}
          className={`flex flex-col items-center gap-1.5 transition-colors ${pathname === "/" || (pathname || "").startsWith("/student") ? "text-primary" : "text-muted-foreground/60 hover:text-muted-foreground"}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Beranda</span>
        </button>

        {appSettings?.logoUrl ? (
          <div className="w-16 h-16 -mt-8 rounded-full border-4 border-border bg-card shadow-soft flex items-center justify-center overflow-hidden z-10 cursor-pointer active:scale-95 transition-transform" onClick={() => router.push("/")}>
            <ImageFallback src={appSettings.logoUrl} alt="Logo" variant="logo" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
          </div>
        ) : (
          <div className="w-16 h-16 -mt-8 rounded-full border-4 border-border bg-card shadow-soft flex items-center justify-center z-10 text-primary cursor-pointer active:scale-95 transition-transform" onClick={() => router.push("/")}>
            <Trophy className="w-8 h-8" />
          </div>
        )}

        <button
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(50);
            if (isAdmin) router.push("/admin");
            else router.push("/login");
          }}
          className={`flex flex-col items-center gap-1.5 transition-colors ${(pathname || "").startsWith("/admin") || pathname === "/login" ? "text-primary" : "text-muted-foreground/60 hover:text-muted-foreground"}`}
        >
          {isAdmin ? <LayoutDashboard className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
          <span className="text-[10px] font-bold uppercase tracking-wider">{isAdmin ? "Admin" : "Masuk"}</span>
        </button>
      </nav>
    </div>
  );
}
