"use client";

import { useAppDataQuery } from "@/hooks/useAppQueries";
import dynamic from "next/dynamic";
const LeaderboardPage = dynamic(() => import("@/components/pages/LeaderboardPage").then(mod => mod.LeaderboardPage), { ssr: false });
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { AssignedGoal } from "@/lib/types";

export default function Page() {
  const router = useRouter();
  const { data: appData, isLoading } = useAppDataQuery();

  const students = appData?.students || [];
  const masterGoals = appData?.masterGoals || [];
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

  return (
    <LeaderboardPage 
      students={students} 
      masterGoals={masterGoals} 
      calculateTotalPoints={calculateTotalPoints} 
      navigateTo={navigateTo} 
      isLoading={isLoading} 
      appSettings={appSettings} 
    />
  );
}
