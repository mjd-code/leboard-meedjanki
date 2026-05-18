  "use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Settings, Sun, Moon, Palette, LogIn, LogOut, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PRESETS } from "@/components/admin/AdminAppearanceTab";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { apiFetch, removeLocalToken } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

interface FloatingSettingsFabProps {
  themeMode: "light" | "dark";
  toggleTheme: () => void;
  activePresetId: string;
  cyclePreset: () => void;
  activePresetName: string;
  isAdmin: boolean;
}

export function FloatingSettingsFab({
  themeMode,
  toggleTheme,
  activePresetId,
  cyclePreset,
  activePresetName,
  isAdmin,
}: FloatingSettingsFabProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <div className="fixed bottom-28 md:bottom-6 right-4 z-50 flex flex-col-reverse items-end gap-3">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-3 rounded-full bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all"
        aria-label="Settings"
      >
        {open ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
      </button>

      {/* Popover menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="bg-popover border border-border rounded-xl shadow-md p-3 flex flex-col gap-2 w-[240px]"
          >
            {/* Dark/Light toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm text-foreground w-full text-left"
            >
              {themeMode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {themeMode === "dark" ? "Light Mode" : "Dark Mode"}
            </button>

            {/* Preset cycle */}
            <button
              onClick={cyclePreset}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm text-foreground w-full text-left"
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span className="truncate">{activePresetName}</span>
            </button>

            {/* Auth actions */}
            <div className="h-px bg-border my-1 w-full" />
            {isAdmin ? (
              <>
                <button
                  onClick={() => { setOpen(false); router.push("/admin"); }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm text-foreground w-full"
                >
                  <Settings className="w-4 h-4" />
                  Admin Panel
                </button>
                <button
                  onClick={async () => {
                    await apiFetch("/api/logout", { method: "POST" });
                    removeLocalToken();
                    queryClient.setQueryData(["auth"], { authenticated: false });
                    trackEvent("admin_logout", { isAdmin: true });
                    setOpen(false);
                    router.push("/");
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm text-red-500 w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => { setOpen(false); router.push("/login"); }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm text-foreground w-full"
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}