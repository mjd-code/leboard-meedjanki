import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Trophy, Medal, Crown, Flame, Loader2 } from "lucide-react";
import { StudentSearchAdvanced } from "../StudentSearchAdvanced";
import { trackEvent } from "../../lib/analytics";
import { ImageFallback, dicebearAvatar } from "../ImageFallback";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RankMovement } from "../ui/RankMovement";
import type {
  Student,
  MasterGoal,
  AssignedGoal,
  Category,
} from "../../lib/types";
import {
  TIME_RANGE,
  TIME_RANGE_OPTIONS,
  type TimeRange,
} from "../../lib/timeRanges";
import {
  StudentSearchFilter,
  applyStudentSearchFilter,
  emptyStudentSearchFilter,
  type StudentSearchFilterValue,
} from "../StudentSearchFilter";
import {
  StudentSortDropdown,
  sortStudents,
  type SortKey,
} from "../StudentSortDropdown";
import { cn } from "@/lib/utils";

export // --- LEADERBOARD PAGE ---
function LeaderboardPage({
  students,
  masterGoals,
  calculateTotalPoints,
  navigateTo,
  isLoading,
  appSettings,
}: {
  students: Student[];
  masterGoals: MasterGoal[];
  calculateTotalPoints: (goals: AssignedGoal[]) => number;
  navigateTo: (path: string, params?: any) => void;
  isLoading: boolean;
  appSettings?: any;
}) {
  const [timeFilter, setTimeFilter] = useState<TimeRange>(TIME_RANGE.ALL_TIME);
  const [searchFilter, setSearchFilter] = useState<StudentSearchFilterValue>(
    emptyStudentSearchFilter,
  );
  const [sortKey, setSortKey] = useState<SortKey>("points");

  const sortedStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];

    const now = new Date();

    // Boundaries setup
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Monday 00:00 boundary for Weekly
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const filterGoals = (goals: AssignedGoal[]) => {
      if (!goals || !Array.isArray(goals)) return [];

      return goals.filter((g) => {
        if (!g.completed) return false;

        // "all-time" includes all completed goals regardless of date
        if (timeFilter === TIME_RANGE.ALL_TIME) return true;

        // "Monthly" and "Weekly" require completedAt to check boundaries
        if (!g.completedAt) return false;

        const completionDate = new Date(g.completedAt);
        const compTime = completionDate.getTime();

        // Robust check for invalid date
        if (isNaN(compTime)) return false;

        if (timeFilter === TIME_RANGE.MONTHLY) {
          return compTime >= startOfMonth.getTime();
        }
        if (timeFilter === TIME_RANGE.WEEKLY) {
          return compTime >= startOfWeek.getTime();
        }
        return false;
      });
    };

    const studentsWithPoints = students.map((student) => {
      const filteredGoals = filterGoals(student.assignedGoals || []);

      // Calculate points internally for maximum reliability and to avoid stale closures
      const totalPoints = filteredGoals.reduce((total, assigned) => {
        const goalData = masterGoals.find(
          (mg) => String(mg.id) === String(assigned.goalId),
        );
        if (goalData) {
          const pts =
            goalData.points !== undefined
              ? goalData.points
              : (goalData as any).pointValue || (goalData as any).pts || 0;
          const numPts =
            typeof pts === "number" ? pts : parseInt(String(pts), 10);
          return total + (isNaN(numPts) ? 0 : numPts);
        }
        return total;
      }, 0);

      // Secondary Sort: Most recently achieved points comes first
      const lastCompletion = filteredGoals.reduce((max, g) => {
        if (!g.completedAt) return max;
        const compTime = new Date(g.completedAt).getTime();
        return isNaN(compTime) ? max : compTime > max ? compTime : max;
      }, 0);

      return {
        ...student,
        totalPoints,
        lastCompletion,
      };
    });

    return [...studentsWithPoints].sort((a, b) => {
      // Primary Sort: Total points descending
      const ptsA = a.totalPoints || 0;
      const ptsB = b.totalPoints || 0;
      if (ptsB !== ptsA) {
        return ptsB - ptsA;
      }
      // Secondary Sort: Recent achievement (as per "baru sampai lama" request)
      return (b.lastCompletion || 0) - (a.lastCompletion || 0);
    });
  }, [students, masterGoals, calculateTotalPoints, timeFilter]);

  const top3 = [sortedStudents[1], sortedStudents[0], sortedStudents[2]];
  const restOfStudentsRaw = sortedStudents.slice(3);
  const restOfStudents = useMemo(() => {
    const filtered = applyStudentSearchFilter(restOfStudentsRaw, searchFilter);
    // Default leaderboard ordering is points-desc and is already produced upstream;
    // only re-sort when the user picks a different key.
    return sortKey === "points" ? filtered : sortStudents(filtered, sortKey);
  }, [restOfStudentsRaw, searchFilter, sortKey]);
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    (students || []).forEach((s) =>
      (s.tags || []).forEach((t) => t && set.add(t)),
    );
    return Array.from(set);
  }, [students]);
  const studentTagSource = useMemo(
    () => (students || []).map((s) => s.tags || []),
    [students],
  );
  const hasActiveFilter = !!(
    searchFilter.query || searchFilter.tags.length > 0
  );

  // Mocking "My Rank": User yang sedang login (Demo purpose, taking first student)
  const currentLoggedInStudentId = students[0]?.id;
  const myRankIndex = sortedStudents.findIndex(
    (s) => s.id === currentLoggedInStudentId,
  );
  const myRankData = myRankIndex !== -1 ? sortedStudents[myRankIndex] : null;

  const renderPodiumStudent = (
    student: any,
    position: "middle" | "left" | "right",
    idx: number,
  ) => {
    if (!student)
      return <div className="w-1/3 opacity-0" key={`empty-${position}`} />;

    const config = {
      middle: {
        rank: 1,
        height: "h-[160px] md:h-[200px]",
        avatarSize: "h-24 w-24 md:h-32 md:w-32",
        border: "border-yellow-400 border-2",
        crown: (
          <Crown className="w-8 h-8 md:w-10 md:h-10 text-yellow-500 absolute -top-6 left-1/2 -translate-x-1/2 drop-shadow-md z-20" />
        ),
        delay: 0,
        podiumColor: "from-primary/30 to-primary/10 border-primary/40",
      },
      left: {
        rank: 2,
        height: "h-[120px] md:h-[140px]",
        avatarSize: "h-16 w-16 md:h-20 md:w-20",
        border: "border-slate-300 border-2",
        crown: (
          <Medal className="w-6 h-6 md:w-8 md:h-8 text-slate-400 absolute -top-4 left-1/2 -translate-x-1/2 drop-shadow-md z-20" />
        ),
        delay: 0.1,
        podiumColor: "from-secondary to-secondary/30 border-border",
      },
      right: {
        rank: 3,
        height: "h-[100px] md:h-[120px]",
        avatarSize: "h-16 w-16 md:h-20 md:w-20",
        border: "border-orange-400 border-2",
        crown: (
          <Medal className="w-6 h-6 md:w-8 md:h-8 text-orange-500 absolute -top-4 left-1/2 -translate-x-1/2 drop-shadow-md z-20" />
        ),
        delay: 0.2,
        podiumColor: "from-secondary to-secondary/30 border-border",
      },
    }[position];

    return (
      <motion.div
        key={`${student.id}-${timeFilter}`}
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 15,
          delay: config.delay,
        }}
        className="flex flex-col items-center justify-end w-1/3 px-1 md:px-2 pt-6"
      >
        <div
          className={cn(
            "relative mb-2 flex flex-col items-center",
            config.rank === 1 && "z-10",
          )}
        >
          {config.crown}
          <div className="relative">
            <Avatar
              className={cn(
                config.avatarSize,
                "border-4 cursor-pointer relative z-10",
                config.border,
                config.rank === 1 && "shadow-primary-glow",
              )}
              onClick={() => {
                trackEvent("profile_open", {
                  refId: student.id,
                  metadata: { source: "podium" },
                });
                navigateTo("/student", { id: student.id });
              }}
            >
              <AvatarImage src={student.photo} alt={student.name} />
              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 md:-bottom-3 bg-foreground text-background text-[10px] md:text-sm font-black px-2 md:px-3 py-0.5 rounded-full border-2 border-background z-20 shadow-soft left-1/2 -translate-x-1/2">
              #{config.rank}
            </div>
          </div>
        </div>
        <div className="text-center w-full mt-2 md:mt-3 px-1 relative z-20">
          <h4
            className="font-bold text-foreground text-xs md:text-sm line-clamp-2 md:line-clamp-3 break-words leading-tight"
            title={student.name}
          >
            {student.name}
          </h4>
          <p className="text-[10px] md:text-xs font-black text-primary mt-0.5">
            {student.totalPoints} pts
          </p>
        </div>

        {/* Podium Base styling */}
        <div
          className={cn(
            "w-full bg-gradient-to-t mt-3 rounded-t-xl md:rounded-t-2xl border-t-[3px] shadow-inner backdrop-blur-sm",
            config.height,
            config.podiumColor,
          )}
        />
      </motion.div>
    );
  };

  return (
    <div className="space-y-6 pb-24 md:space-y-8">
      {/* HEADER & PODIUM */}
      <div className="pt-8 px-4 text-foreground relative overflow-hidden -mx-4 -mt-6 sm:mx-0 sm:mt-0">
        <div className="relative z-10 space-y-4 max-w-2xl mx-auto mb-6 text-center">
          <Badge
            variant="secondary"
            className="px-3 py-1 text-xs font-bold uppercase tracking-widest gap-2 bg-secondary/50 backdrop-blur-sm border-transparent text-primary hover:bg-secondary/60"
          >
            <Flame className="w-3 h-3 text-destructive" />{" "}
            {appSettings?.badgeTitle || "Season 2 Active"}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            {appSettings?.heroTitle || "Student Ranking"}
          </h1>
          <p className="text-muted-foreground drop-shadow-soft font-medium max-w-lg mx-auto text-sm md:text-base opacity-95 leading-relaxed">
            {appSettings?.heroSubtitle ||
              "Witness the rise of champions. Progress is tracked daily."}
          </p>

          {/* HORIZONTAL TIME FILTERS */}
          <div className="flex justify-center mt-6">
            <div className="bg-secondary/30 backdrop-blur-md p-1.5 rounded-full grid grid-flow-col auto-cols-fr gap-1 w-full max-w-md">
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTimeFilter(opt.value);
                    trackEvent("leaderboard_filter", {
                      metadata: { range: opt.value },
                    });
                  }}
                  className={`px-2 py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap text-center active:scale-95 ${
                    timeFilter === opt.value
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {opt.shortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TOP 3 PODIUM */}
        <div className="relative z-10 flex items-end justify-center max-w-3xl mx-auto px-2 mt-8">
          {renderPodiumStudent(top3[0], "left", 1)}
          {renderPodiumStudent(top3[1], "middle", 0)}
          {renderPodiumStudent(top3[2], "right", 2)}
        </div>
      </div>

      {/* REST OF STUDENTS LIST */}
      <div className="mx-0 max-w-5xl mx-auto space-y-4">
        <div className="px-0 pt-0 pb-4">
          <StudentSearchAdvanced
            value={searchFilter}
            onChange={setSearchFilter}
            sortKey={sortKey}
            onSortChange={setSortKey}
            availableTags={availableTags}
            studentTagSource={studentTagSource}
            placeholder="Cari peringkat 4 dan ke bawah..."
          />
        </div>
        <div className="px-0">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center gap-4 bg-card rounded-xl border-none shadow-inner">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm font-medium">
                Mengambil data papan peringkat...
              </p>
            </div>
          ) : restOfStudents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border-none shadow-inner">
              <p className="font-bold">
                {hasActiveFilter
                  ? "Tidak ada Santri yang sesuai dengan filter pencarian atau tag."
                  : "Tidak ada Santri lain yang ditemukan."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:gap-4 md:grid-cols-1">
              {restOfStudents.map((student, index) => {
                const rank = index + 4; // Because top 3 are extracted

                return (
                  <Card
                    key={`leader-${student.id}-${index}`}
                    onClick={() => {
                      trackEvent("profile_open", {
                        refId: student.id,
                        metadata: { source: "leaderboard" },
                      });
                      navigateTo("/student", { id: student.id });
                    }}
                    className="border-none bg-card shadow-soft hover:shadow-inner transition-all cursor-pointer group active:scale-[0.99] rounded-xl overflow-hidden"
                  >
                    <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-5">
                      <div className="flex flex-col items-center gap-1 w-8 md:w-12 shrink-0">
                        <div className="font-black text-xl md:text-2xl text-muted-foreground group-hover:text-primary transition-colors">
                          {rank}
                        </div>
                      </div>

                      <Avatar className="h-12 w-12 md:h-14 md:w-14 shrink-0 border border-border">
                        <AvatarImage src={student.photo} alt={student.name} />
                        <AvatarFallback>
                          {student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 pr-2">
                        <h3
                          className="font-bold text-foreground group-hover:text-primary transition-colors text-base md:text-lg line-clamp-1 break-words"
                          title={student.name}
                        >
                          {student.name}
                        </h3>
                        {student.bio && (
                          <p
                            className="text-xs md:text-sm text-muted-foreground line-clamp-1 break-words mt-0.5"
                            title={student.bio}
                          >
                            {student.bio}
                          </p>
                        )}
                        {(student.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(student.tags || []).slice(0, 3).map((tag, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="px-1.5 py-0 text-[10px] font-semibold bg-secondary/50 text-muted-foreground"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {(student.tags || []).length > 3 && (
                              <span className="text-[10px] font-bold text-muted-foreground ml-1">
                                +{(student.tags || []).length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 md:gap-4 text-right shrink-0">
                        <div className="flex flex-col items-end justify-center">
                          <div className="text-xl md:text-3xl font-black text-foreground group-hover:text-primary transition-colors">
                            {student.totalPoints}
                          </div>
                          <div className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">
                            Poin
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center justify-center w-12 md:w-16">
                          <RankMovement
                            currentRank={rank}
                            previousRank={student.previousRank}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
