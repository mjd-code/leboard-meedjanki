import React, { useRef, useEffect, useState } from "react";
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
  Image as ImageIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, removeLocalToken } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { AdminStudentsTab } from "./AdminStudentsTab";
import { AdminGoalsTab } from "./AdminGoalsTab";
import { AdminStatisticsTab } from "./AdminStatisticsTab";
import { AdminImportExportTab } from "../AdminImportExportTab";
import CacheHealthTab from "../CacheHealthTab";
import { AdminUserManagement } from "./AdminUserManagement";
import { AdminBlogTab } from "./AdminBlogTab";
import { AdminDatabaseTab } from "./AdminDatabaseTab";
import { AdminGalleryTab } from "./AdminGalleryTab";
import { useAuthRole } from "@/hooks/useAuthRole";
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
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tabsContainer = tabsRef.current;
    if (!tabsContainer) return;

    const handleWheel = (e: WheelEvent) => {
      // Hanya tangkap jika ada scroll vertikal dari mouse
      if (e.deltaY !== 0) {
        e.preventDefault(); // Matikan scroll halaman ke bawah

        // Geser manual ke samping tanpa dihalangi oleh CSS Snapping
        tabsContainer.scrollLeft += e.deltaY;
      }
    };

    tabsContainer.addEventListener("wheel", handleWheel, { passive: false });
    return () => tabsContainer.removeEventListener("wheel", handleWheel);
  }, []);

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
            className="bg-card border border-red-200 px-4 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 flex items-center justify-center active:scale-95 transition-all"
            aria-label="Keluar"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Scrollable Horizontal Tabs */}
        <div className="flex w-full">
          <div
            ref={tabsRef}
            data-horizontal-scroll="true"
            /* HAPUS: snap-x. TAMBAHKAN: w-full */
            className="scrollbar-hide flex flex-nowrap items-center overflow-x-auto select-none bg-card/95 backdrop-blur-sm rounded-xl border border-border p-1 shadow-soft w-full"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            <div className="inline-flex items-center gap-2 px-2 py-2">
              {[
                { id: "students", label: "Santri", icon: Users, show: true },
                {
                  id: "goals",
                  label: "Kategori & Tugas",
                  icon: Target,
                  show: true,
                },
                {
                  id: "blog",
                  label: "Insight CMS",
                  icon: BookOpen,
                  show: true,
                },
                {
                  id: "gallery",
                  label: "Galeri",
                  icon: ImageIcon,
                  show: true,
                },
                {
                  id: "database",
                  label: "Database Manager",
                  icon: HardDrive,
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
                    /* HAPUS: snap-start. TAMBAHKAN: shrink-0 */
                    className={`group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm sm:text-base transition-all whitespace-nowrap active:scale-95 shrink-0 ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <tab.icon
                      className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-colors ${
                        activeTab === tab.id
                          ? "text-primary-foreground"
                          : "text-muted-foreground/60 group-hover:text-muted-foreground"
                      }`}
                    />
                    {tab.label}
                  </button>
                ))}
            </div>
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
          {activeTab === "gallery" && <AdminGalleryTab />}
          {activeTab === "database" && <AdminDatabaseTab />}
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
