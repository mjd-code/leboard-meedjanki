import React, { useState } from "react";
// Tooltip extracted locally? Or just removed because we didn't add the lib
import {
  LogOut,
  CheckSquare,
  Target,
  FolderTree,
  Palette,
  Settings,
  Database,
  Server,
  Info,
  LayoutDashboard,
  Loader2,
  MoreHorizontal,
  ShieldCheck,
  Search,
  Users,
  UserCog,
  BookOpen,
  HardDrive,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, removeLocalToken } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { AdminStudentsTab } from "./AdminStudentsTab";
import { AdminGoalsTab } from "./AdminGoalsTab";
import { AdminAppearanceTab } from "./AdminAppearanceTab";
import { AdminStatisticsTab } from "./AdminStatisticsTab";
import { AdminImportExportTab } from "../AdminImportExportTab";
import CacheHealthTab from "../CacheHealthTab";
import { AdminUserManagement } from "./AdminUserManagement";
import { AdminBlogTab } from "./AdminBlogTab";
import { AdminDatabaseTab } from "./AdminDatabaseTab";
import { useAuthRole } from "@/hooks/useAuthRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type {
  Category,
  MasterGoal,
  AssignedGoal,
  Student,
  Group,
} from "../../lib/types";

// --- ADMIN DASHBOARD ---
export function AdminDashboard({
  students,
  refreshData,
  masterGoals,
  categories,
  groups = [],
  calculateTotalPoints,
  appSettings,
  setAppSettings,
  navigateTo,
}: {
  students: Student[];
  refreshData: () => void;
  masterGoals: MasterGoal[];
  categories: Category[];
  groups?: Group[];
  calculateTotalPoints: (goals: AssignedGoal[]) => number;
  appSettings: any;
  setAppSettings: any;
  navigateTo: (path: string, params?: any) => void;
}) {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuthRole();
  const [activeTab, setActiveTab] = useState("students");
  const [isRefreshing, setIsRefreshing] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground">Kontrol Admin</h1>
          <p className="text-muted-foreground font-medium">
            Kelola Santri, Tugas belajar, dan Kategori.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setIsRefreshing(true);
              await refreshData();
              setIsRefreshing(false);
            }}
            disabled={isRefreshing}
            className="bg-card border border-border px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary flex items-center gap-2 active:scale-95 transition-all"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreHorizontal className="w-4 h-4" />
            )}
            Sinkronisasi Paksa
          </button>

          <button
            onClick={async () => {
              await apiFetch("/api/logout", { method: "POST" });
              removeLocalToken();
              queryClient.setQueryData(["auth"], { authenticated: false });
              trackEvent("admin_logout", { isAdmin: true });
              navigateTo("/");
            }}
            className="bg-card border border-red-200 px-4 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 flex items-center justify-center active:scale-95 transition-all md:hidden"
            aria-label="Keluar"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Scrollable Horizontal Tabs */}
        <div className="sticky top-0 md:top-16 z-30 bg-card/95 backdrop-blur-sm rounded-2xl border border-border overflow-x-auto no-scrollbar scrollbar-hide snap-x px-2 py-1 shadow-soft">
          <div className="flex items-center gap-2 sm:gap-4 border-b border-border min-w-max px-4 sm:px-0">
            {[
              { id: "students", label: "Santri", icon: Users, show: true },
              {
                id: "goals",
                label: "Kategori & Tugas",
                icon: Target,
                show: true,
              },
              { id: "blog", label: "Insight CMS", icon: BookOpen, show: true },
              {
                id: "database",
                label: "Database Manager",
                icon: HardDrive,
                show: true,
              },
              {
                id: "appearance",
                label: "Tampilan",
                icon: Palette,
                show: true,
              },
              {
                id: "statistics",
                label: "Statistik",
                icon: Search,
                show: true,
              },
              {
                id: "import-export",
                label: "Impor / Ekspor",
                icon: Database,
                show: true,
              },
              {
                id: "admin-users",
                label: isSuperAdmin ? "Manajemen Admin" : "Profil Editor",
                icon: UserCog,
                show: true,
              },
              {
                id: "cache",
                label: "Manajemen PWA",
                icon: ShieldCheck,
                show: true,
              },
            ]
              .filter((t) => t.show)
              .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    setActiveTab(tab.id);
                  }}
                  className={`group flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 min-h-11 font-bold text-base sm:text-lg transition-all whitespace-nowrap active:scale-95 border-b-[3px] snap-start ${
                    activeTab === tab.id
                      ? "border-primary-600 text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-colors ${activeTab === tab.id ? "text-primary" : "text-muted-foreground/60 group-hover:text-muted-foreground"}`}
                  />
                  {tab.label}
                </button>
              ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-card rounded-xl md:rounded-xl border border-border shadow-soft overflow-hidden min-h-[600px]">
          {activeTab === "students" && (
            <AdminStudentsTab
              students={students}
              refreshData={refreshData}
              masterGoals={masterGoals}
              categories={categories}
              groups={groups}
              calculateTotalPoints={calculateTotalPoints}
            />
          )}
          {activeTab === "goals" && (
            <AdminGoalsTab
              masterGoals={masterGoals}
              refreshData={refreshData}
              categories={categories}
              groups={groups}
            />
          )}
          {activeTab === "blog" && <AdminBlogTab />}
          {activeTab === "database" && <AdminDatabaseTab />}
          {activeTab === "appearance" && (
            <AdminAppearanceTab
              refreshData={refreshData}
              appSettings={appSettings}
              setAppSettings={() =>
                queryClient.invalidateQueries({ queryKey: ["app-data"] })
              }
            />
          )}
          {activeTab === "statistics" && <AdminStatisticsTab />}
          {activeTab === "import-export" && (
            <AdminImportExportTab
              apiFetch={apiFetch}
              students={students}
              masterGoals={masterGoals}
              categories={categories}
              refreshData={refreshData}
            />
          )}
          {activeTab === "admin-users" && <AdminUserManagement />}
          {activeTab === "cache" && <CacheHealthTab />}
        </div>
      </div>
    </div>
  );
}
