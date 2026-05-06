"use client";

import { useAppDataQuery, useAuthQuery } from "@/hooks/useAppQueries";
import dynamic from "next/dynamic";
const AdminDashboard = dynamic(() => import("@/components/admin/AdminDashboard").then(mod => mod.AdminDashboard), { ssr: false });
import { LoginPage } from "@/components/pages/LoginPage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/analytics";
import type { AssignedGoal } from "@/lib/types";

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: authData } = useAuthQuery();
  const { data: appData } = useAppDataQuery();

  const isAdmin = !!authData?.authenticated;

  const students = appData?.students || [];
  const masterGoals = appData?.masterGoals || [];
  const categories = appData?.categories || [];
  const groups = (appData as any)?.groups || [];
  const appSettings = appData?.appSettings || {};

  const calculateTotalPoints = useCallback((assignedGoals: AssignedGoal[]) => {
    if (!assignedGoals || !masterGoals) return 0;
    return assignedGoals.reduce((total, assigned) => {
      if (assigned.completed) {
        const goalData = masterGoals.find((mg) => String(mg.id) === String(assigned.goalId));
        if (goalData) {
          const pts = goalData.points !== undefined ? goalData.points : (goalData as any).pointValue || (goalData as any).pts || 0;
          const numPts = typeof pts === "number" ? pts : parseInt(String(pts), 10);
          return total + (isNaN(numPts) ? 0 : numPts);
        }
      }
      return total;
    }, 0);
  }, [masterGoals]);

  const navigateTo = (path: string, params: any = {}) => {
    if (path === "/student" && params.id) {
      router.push(`/student/${params.id}`);
    } else {
      router.push(path);
    }
  };

  const refreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["app-data"] });
  };

  if (!isAdmin) {
    return (
      <LoginPage 
        onLogin={() => {
          queryClient.invalidateQueries({ queryKey: ["auth"] });
          trackEvent("admin_login", { isAdmin: true });
          router.push("/admin");
        }} 
        appSettings={appSettings} 
      />
    );
  }

  return (
    <AdminDashboard 
      students={students} 
      refreshData={refreshData}
      masterGoals={masterGoals} 
      categories={categories} 
      groups={groups}
      calculateTotalPoints={calculateTotalPoints}
      appSettings={appSettings}
      setAppSettings={() => queryClient.invalidateQueries({ queryKey: ["app-data"] })} 
      navigateTo={navigateTo}
    />
  );
}
