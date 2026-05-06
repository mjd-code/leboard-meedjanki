import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Target,
  Flame,
  Circle,
  CheckCircle2,
  ChevronDown,
  CheckSquare,
  FolderTree,
  ChevronUp,
} from "lucide-react";
import {
  TimeRangeValue,
  createDefaultTimeRangeValue,
  TimeRangeFilter,
} from "../TimeRangeFilter";
import { DateRange, isWithinRange, POINTS_CAPTION } from "../../lib/timeRanges";
import { RankMovement } from "../ui/RankMovement";
import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  Line,
  BarChart,
  Bar,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageFallback, dicebearAvatar } from "../ImageFallback";
import type {
  Student,
  MasterGoal,
  AssignedGoal,
  Category,
  Group,
} from "../../lib/types";
import { ActionMenu } from "../ui/ActionMenu";
import { ConfirmModal } from "../ui/ConfirmModal";
import { Button } from "@/components/ui/button";
import { buildHierarchy } from "@/lib/hierarchy";

export // --- STUDENT PROFILE PAGE (with collapsible goals) ---
function StudentProfilePage({
  studentId,
  students,
  masterGoals,
  categories,
  groups = [],
  calculateTotalPoints,
  navigateTo,
}: {
  studentId: string;
  students: Student[];
  masterGoals: MasterGoal[];
  categories: Category[];
  groups?: Group[];
  calculateTotalPoints: (goals: AssignedGoal[]) => number;
  navigateTo: (path: string, params?: any) => void;
}) {
  const student = students.find((s) => s.id === studentId);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [expandedGroups, setExpandedGroups] = useState<
    Record<string, boolean>
  >({});
  // Both charts now share the same reusable TimeRangeFilter (preset + date range).
  const [historyFilterValue, setHistoryFilterValue] = useState<TimeRangeValue>(
    () => createDefaultTimeRangeValue("all-time"),
  );
  const [timelineFilterValue, setTimelineFilterValue] =
    useState<TimeRangeValue>(() => createDefaultTimeRangeValue("last-week"));

  const timelineData = React.useMemo(() => {
    if (!student?.assignedGoals)
      return { rows: [], totalGoals: 0, totalPoints: 0, days: 0 };
    // Resolve the active range. Unbounded sides fall back to the goal data extents.
    const now = new Date();
    const completedTs = student.assignedGoals
      .filter((g) => g.completed && g.completedAt)
      .map((g) => new Date(g.completedAt!).getTime())
      .filter((t) => !isNaN(t));
    const minTs = completedTs.length ? Math.min(...completedTs) : now.getTime();
    const startDate = timelineFilterValue.range.start ?? new Date(minTs);
    const endDate = timelineFilterValue.range.end ?? now;
    const start = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    const end = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
    );
    const dayMs = 86400000;
    const days = Math.max(
      1,
      Math.min(366, Math.round((end.getTime() - start.getTime()) / dayMs) + 1),
    );
    const compact = days > 14;

    // Build a date->{goals,points} map keyed by YYYY-MM-DD
    const map = new Map<string, { goals: number; points: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { goals: 0, points: 0 });
    }

    let totalGoals = 0;
    let totalPoints = 0;
    student.assignedGoals.forEach((g) => {
      if (!g.completed || !g.completedAt) return;
      const cd = new Date(g.completedAt);
      const key = cd.toISOString().slice(0, 10);
      if (!map.has(key)) return;
      const mg = masterGoals.find((m) => m.id === g.goalId);
      const pts = mg?.points || 0;
      const cur = map.get(key)!;
      cur.goals += 1;
      cur.points += pts;
      totalGoals += 1;
      totalPoints += pts;
    });

    const rows = Array.from(map.entries()).map(([date, v]) => {
      const d = new Date(date);
      const label = compact
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : d.toLocaleDateString(undefined, { weekday: "short" });
      return { date: label, goals: v.goals, points: v.points };
    });
    return { rows, totalGoals, totalPoints, days };
  }, [student?.assignedGoals, masterGoals, timelineFilterValue]);

  const historicalData = React.useMemo(() => {
    if (!student?.assignedGoals || student.assignedGoals.length === 0)
      return [];

    // Some older completed goals might not have completedAt.
    // Space them out hourly backwards from now so they show up beautifully on the chart.
    const now = Date.now();
    const zeroCount = student.assignedGoals.filter(
      (g) => g.completed && !g.completedAt,
    ).length;
    let baseTime = now - zeroCount * 3600000;

    const completedGoals = student.assignedGoals
      .filter((g) => g.completed)
      .map((g) => ({
        ...g,
        timestamp: g.completedAt ? new Date(g.completedAt).getTime() : 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((g) => {
        if (g.timestamp === 0) {
          baseTime += 3600000;
          return { ...g, timestamp: baseTime };
        }
        return g;
      });

    // Filter to active range; pick chart granularity automatically based on span.
    const range: DateRange = historyFilterValue.range;
    const inRange = completedGoals.filter((g) =>
      isWithinRange(g.timestamp, range),
    );

    // Determine the visible span so we can choose label granularity.
    const firstTs =
      inRange[0]?.timestamp ?? completedGoals[0]?.timestamp ?? Date.now();
    const lastTs =
      inRange[inRange.length - 1]?.timestamp ??
      completedGoals[completedGoals.length - 1]?.timestamp ??
      Date.now();
    const spanStart = range.start ? range.start.getTime() : firstTs;
    const spanEnd = range.end ? range.end.getTime() : lastTs;
    const spanDays = Math.max(1, (spanEnd - spanStart) / 86400000);

    type Granularity = "hours" | "days" | "weeks" | "months" | "years";
    const granularity: Granularity =
      spanDays <= 2
        ? "hours"
        : spanDays <= 60
          ? "days"
          : spanDays <= 180
            ? "weeks"
            : spanDays <= 1095
              ? "months"
              : "years";

    const labelFor = (date: Date): string => {
      if (granularity === "hours")
        return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:00`;
      if (granularity === "days")
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
      if (granularity === "weeks") {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDays = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNumber = Math.ceil(
          (pastDays + firstDayOfYear.getDay() + 1) / 7,
        );
        return `W${weekNumber} ${date.getFullYear()}`;
      }
      if (granularity === "months") {
        const m = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        return `${m[date.getMonth()]} '${date.getFullYear().toString().slice(-2)}`;
      }
      return `${date.getFullYear()}`;
    };

    // Cumulative running total across goals in range.
    let runningTotal = 0;
    const historyMap = new Map<string, number>();
    inRange.forEach((g) => {
      const mg = masterGoals.find((m) => m.id === g.goalId);
      runningTotal += mg?.points || 0;
      historyMap.set(labelFor(new Date(g.timestamp)), runningTotal);
    });

    const data = Array.from(historyMap.entries()).map(([date, points]) => ({
      date,
      points,
    }));
    if (data.length > 0 && data[0].points > 0) {
      data.unshift({ date: "Start", points: 0 });
    }
    return data;
  }, [student?.assignedGoals, masterGoals, historyFilterValue]);

  if (!student)
    return (
      <div
        className="text-center py-20 font-bold text-muted-foreground underline cursor-pointer"
        onClick={() => navigateTo("/")}
      >
        Kembali ke Beranda
      </div>
    );

  const totalPoints = calculateTotalPoints(student.assignedGoals);
  const rankedStudents = [...students]
    .map((s) => ({
      ...s,
      totalPts: calculateTotalPoints(s.assignedGoals || []),
    }))
    .sort((a, b) => b.totalPts - a.totalPts);
  const currentRankIndex = rankedStudents.findIndex((s) => s.id === studentId);
  const currentRank = currentRankIndex >= 0 ? currentRankIndex + 1 : 0;

  // Build the 3-tier tree, then narrow each category to only goals assigned
  // to THIS student so the Papan Tugas reflects the student's own workload.
  const assignedById = new Map<string, AssignedGoal>();
  (student.assignedGoals || []).forEach((ag) => assignedById.set(ag.goalId, ag));
  const fullTree = buildHierarchy(groups, categories, masterGoals);
  const studentTree = fullTree
    .map((node) => ({
      group: node.group,
      categories: node.categories
        .map((c) => {
          const goals = c.goals
            .filter((g) => assignedById.has(g.id))
            .map((g) => ({ ...g, ...assignedById.get(g.id)! }));
          return { category: c.category, goals };
        })
        .filter((c) => c.goals.length > 0),
    }))
    .filter((n) => n.categories.length > 0);
  const hasAnyAssignment = studentTree.length > 0;

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };
  const toggleGroup = (gid: string) => {
    setExpandedGroups((prev) => ({ ...prev, [gid]: prev[gid] === undefined ? false : !prev[gid] }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigateTo("/")}
        className="hover:text-primary transition-colors font-bold text-xs uppercase tracking-[0.2em] mb-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
      </Button>

      <div className="bg-card rounded-xl p-4 sm:p-8 shadow-soft border-none relative overflow-hidden group">
        <div className="relative z-10 flex flex-col items-center text-center mt-4">
          <div className="relative">
            <ImageFallback
              src={student.photo || dicebearAvatar(student.name)}
              alt={student.name}
              variant="avatar"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-background bg-background object-cover shadow-soft"
              wrapperClassName="w-24 h-24 sm:w-32 sm:h-32 rounded-full shadow-soft"
            />
            <div className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-full text-primary-foreground shadow-soft">
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">
              {student.name}
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto italic">
              "{student.bio}"
            </p>
          </div>

          <div className="flex gap-4 mt-8 w-full">
            <Card className="flex-1 bg-secondary/20 shadow-none border-border">
              <CardContent className="p-4 flex flex-col justify-center items-center">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Peringkat
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="text-2xl font-black text-foreground">
                    #{currentRank}
                  </div>
                  <RankMovement
                    currentRank={currentRank}
                    previousRank={student.previousRank}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1 bg-primary border-primary shadow-primary-glow">
              <CardContent className="p-4 flex flex-col justify-center items-center">
                <div className="text-[10px] font-black text-primary-foreground/80 uppercase tracking-widest mb-1">
                  {POINTS_CAPTION.ALL_TIME}
                </div>
                <div className="text-2xl font-black text-primary-foreground">
                  {totalPoints}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {historicalData.length > 0 && (
        <Card className="rounded-xl shadow-soft border-border overflow-visible relative z-30">
          <CardHeader className="p-6 border-b border-border flex flex-col items-start gap-3 space-y-0 relative z-30">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Riwayat Perkembangan
            </h4>
            <div className="w-full sm:w-auto">
              <TimeRangeFilter
                value={historyFilterValue}
                onChange={setHistoryFilterValue}
              />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-48 w-full min-w-0" style={{ minHeight: "192px" }}>
              <ChartContainer
                config={{
                  points: { label: "Points", color: "hsl(var(--primary))" },
                }}
                className="h-full w-full"
              >
                <LineChart data={historicalData}>
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                    tickFormatter={(value) =>
                      value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                    }
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="points"
                    stroke="var(--color-points)"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "var(--color-points)" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl shadow-soft border-border overflow-visible mb-6 relative z-20">
        <CardHeader className="p-6 border-b border-border flex flex-col items-start gap-4 space-y-0 relative z-20 w-full">
          <div className="w-full">
            <h4 className="font-bold text-foreground flex items-center gap-2 mb-2">
              <CheckSquare className="w-5 h-5 text-primary" /> Lini Masa
              Aktivitas
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              Tugas harian yang diselesaikan.
            </p>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Badge variant="secondary" className="px-2 py-1 rounded-lg">
                {timelineData.totalGoals} Tugas
              </Badge>
              <Badge variant="secondary" className="px-2 py-1 rounded-lg">
                {timelineData.totalPoints} poin
              </Badge>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <TimeRangeFilter
              value={timelineFilterValue}
              onChange={setTimelineFilterValue}
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-48 w-full min-w-0" style={{ minHeight: "192px" }}>
            <ChartContainer
              config={{
                goals: { label: "Goals", color: "hsl(var(--primary))" },
              }}
              className="h-full w-full"
            >
              <BarChart data={timelineData.rows}>
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval={
                    timelineData.days > 14
                      ? Math.ceil(timelineData.days / 10)
                      : 0
                  }
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="goals"
                  fill="var(--color-goals)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-black text-foreground flex items-center gap-2 px-2">
          <Target className="w-6 h-6 text-primary" /> Papan Tugas
        </h2>

        {!hasAnyAssignment ? (
          <Card className="rounded-xl p-8 text-center shadow-soft border-border">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              Belum Ada Tugas
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Santri ini belum diberi tugas belajar apa pun. Buka Panel Admin
              untuk memberikan tugas pertama mereka.
            </p>
          </Card>
        ) : (
          studentTree.map((node) => {
            const groupOpen = expandedGroups[node.group.id] !== false;
            const groupGoals = node.categories.flatMap((c) => c.goals);
            const groupCompleted = groupGoals.filter((g) => g.completed).length;
            const groupPoints = groupGoals
              .filter((g) => g.completed)
              .reduce((sum, g) => sum + (g.points || 0), 0);
            return (
              <motion.div
                layout
                key={node.group.id}
                className="rounded-xl border-border bg-card border overflow-hidden shadow-soft"
              >
                <button
                  onClick={() => toggleGroup(node.group.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className={`p-3 rounded-xl ${groupOpen ? "bg-primary text-primary-foreground shadow-soft" : "bg-secondary text-muted-foreground"}`}
                    >
                      <FolderTree className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-foreground leading-tight mb-1 truncate">
                        {node.group.name}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                          {groupCompleted}/{groupGoals.length} selesai
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                          {groupPoints} pts
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                          {node.categories.length} kategori
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {groupOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {groupOpen && (
                    <motion.div
                      layout
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-background border-t border-border"
                    >
                      <div className="p-3 space-y-3">
                        {node.categories.map((catNode) => {
                          const cid = catNode.category.id;
                          const isExpanded = expandedCategories[cid] !== false;
                          const goals = catNode.goals;
                          const completedCount = goals.filter((g) => g.completed).length;
                          const progress =
                            goals.length > 0 ? (completedCount / goals.length) * 100 : 0;
                          return (
                            <Card
                              key={cid}
                              className="rounded-xl border-border overflow-hidden shadow-none border"
                            >
                              <button
                                onClick={() => toggleCategory(cid)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/20 transition-colors"
                              >
                                <div className="flex-1 min-w-0 pr-4">
                                  <h4
                                    className="font-bold text-foreground leading-tight mb-1 truncate"
                                    title={catNode.category.name}
                                  >
                                    {catNode.category.name}
                                  </h4>
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                      <motion.div
                                        className="h-full bg-primary rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest min-w-[3rem] text-right">
                                      {completedCount}/{goals.length}
                                    </span>
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                              </button>
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    layout
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-t border-border"
                                  >
                                    <div className="p-3 space-y-2">
                                      {goals.map((goal: any, idx: number) => (
                                        <div
                                          key={`${goal.id}-${idx}`}
                                          className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border/60 transition-all relative overflow-hidden"
                                        >
                                          {goal.completed && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                          )}
                                          <div
                                            className={`shrink-0 z-10 ${goal.completed ? "text-primary" : "text-muted-foreground"}`}
                                          >
                                            {goal.completed ? (
                                              <CheckCircle2 className="w-5 h-5" />
                                            ) : (
                                              <Circle className="w-5 h-5" />
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0 z-10">
                                            <h5
                                              className={`text-sm font-bold leading-tight ${goal.completed ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground"}`}
                                              title={goal.title}
                                            >
                                              {goal.title}
                                            </h5>
                                            {goal.description && (
                                              <p
                                                className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5"
                                                title={goal.description}
                                              >
                                                {goal.description}
                                              </p>
                                            )}
                                          </div>
                                          <Badge
                                            variant={goal.completed ? "secondary" : "default"}
                                            className="z-10 px-2 py-1 shrink-0"
                                          >
                                            +{goal.points ?? 0} pts
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Card>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
