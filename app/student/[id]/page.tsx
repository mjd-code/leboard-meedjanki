"use client";

import { useAppDataQuery } from "@/hooks/useAppQueries";
import dynamic from "next/dynamic";
const StudentProfileComponent = dynamic(() => import("@/components/pages/StudentProfilePage").then(mod => mod.StudentProfilePage), { ssr: false });
import { useRouter, useParams } from "next/navigation";
import { useCallback } from "react";
import type { AssignedGoal } from "@/lib/types";

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { data: appData } = useAppDataQuery();

  const students = appData?.students || [];
  const masterGoals = appData?.masterGoals || [];
  const categories = appData?.categories || [];
  const groups = (appData as any)?.groups || [];

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

  const navigateTo = (path: string, navParams: any = {}) => {
    if (path === "/student" && navParams.id) {
      router.push(`/student/${navParams.id}`);
    } else {
      router.push(path);
    }
  };

  const studentId = typeof params.id === "string" ? params.id : "";

  return (
    <StudentProfileComponent 
      studentId={studentId} 
      students={students} 
      masterGoals={masterGoals}
      categories={categories}
      groups={groups}
      calculateTotalPoints={calculateTotalPoints}
      navigateTo={navigateTo}
    />
  );
}
