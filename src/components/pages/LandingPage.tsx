"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import type { Post, Student } from "../../lib/types";
import Link from "next/link";
import {
  ArrowRight,
  Trophy,
  BookOpen,
  Activity,
  Star,
  Users,
  Eye,
  Sparkles,
  GraduationCap,
  Newspaper,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { HScroller, HScrollItem } from "@/components/ui/HScroller";
import { CategoryChips } from "@/components/ui/CategoryChips";
import { ArticleCard } from "@/components/ui/ArticleCard";
import { PopoverSelect } from "@/components/ui/PopoverSelect";
import { SmartSearchBar, type SortKey } from "@/components/ui/SmartSearchBar";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

function todayLabel() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function LandingPage() {
  const { data: allPosts = [] } = useQuery<Post[]>({
    queryKey: ["public-posts"],
    queryFn: async () => {
      const res = await apiFetch("/api/posts");
      if (!res.ok) throw new Error("Failed to fetch posts");
      const all: Post[] = await res.json();
      return all.filter((p) => p.status === "published");
    },
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["public-students"],
    queryFn: async () => {
      const res = await apiFetch("/api/students");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: masterGoals = [] } = useQuery<any[]>({
    queryKey: ["public-master-goals"],
    queryFn: async () => {
      const res = await apiFetch("/api/masterGoals");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Categories
  const categoryCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    allPosts.forEach((p) => {
      const cat = (p.category || "Umum").trim();
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allPosts]);

  // Filter / sort / search state
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [activeCat, setActiveCat] = React.useState<string | null>(null);

  const filteredPosts = React.useMemo(() => {
    let list = [...allPosts];
    if (activeCat)
      list = list.filter((p) => (p.category || "Umum") === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (a.published_at || "").localeCompare(b.published_at || "");
        case "popular":
          return ((b as any).views || 0) - ((a as any).views || 0);
        case "az":
          return a.title.localeCompare(b.title);
        case "newest":
        default:
          return (b.published_at || "").localeCompare(a.published_at || "");
      }
    });
    return list;
  }, [allPosts, activeCat, search, sort]);

  const featuredPosts = filteredPosts.slice(0, 8);

  const sortedStudents = React.useMemo(() => {
    return [...students]
      .map((student) => {
        if (!student.assignedGoals || !Array.isArray(student.assignedGoals)) {
          return {
            ...student,
            calculatedPoints: student.totalPoints || 0,
            lastCompletion: 0,
          };
        }

        const completedGoals = student.assignedGoals.filter((g) => g.completed);

        const calculatedPoints = completedGoals.reduce((total, assigned) => {
          const goalData = masterGoals.find(
            (mg) => String(mg.id) === String(assigned.goalId),
          );
          if (goalData) {
            const pts =
              goalData.points !== undefined
                ? goalData.points
                : goalData.pointValue || goalData.pts || 0;
            const numPts =
              typeof pts === "number" ? pts : parseInt(String(pts), 10);
            return total + (isNaN(numPts) ? 0 : numPts);
          }
          return total;
        }, 0);

        const lastCompletion = completedGoals.reduce((max, g) => {
          if (!g.completedAt) return max;
          const compTime = new Date(g.completedAt).getTime();
          return isNaN(compTime) ? max : compTime > max ? compTime : max;
        }, 0);

        return {
          ...student,
          totalPoints: calculatedPoints,
          lastCompletion,
        };
      })
      .sort((a, b) => {
        const ptsA = a.totalPoints || 0;
        const ptsB = b.totalPoints || 0;
        if (ptsB !== ptsA) return ptsB - ptsA;
        return (b.lastCompletion || 0) - (a.lastCompletion || 0);
      });
  }, [students, masterGoals]);

  const topStudents = sortedStudents.slice(0, 8);

  // Stats Hook
  const [statsRange, setStatsRange] = React.useState("today");
  const { data: analytics } = useQuery({
    queryKey: ["public-analytics", statsRange],
    queryFn: async () => {
      const res = await apiFetch(`/api/stats?range=${statsRange}`);
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
  });

  // Stats
  const totalViews = allPosts.reduce(
    (s, p) =>
      s +
      (((p as any).organic_views as number) || 0) +
      (((p as any).offset_views as number) || 0),
    0,
  );
  const totalPoints = sortedStudents.reduce(
    (s, st) => s + (st.totalPoints || 0),
    0,
  );
  const stats = [
    {
      label: "Pengunjung Web",
      value: analytics?.uniqueVisitors || 0,
      icon: Users,
      hint: "Pengunjung Unik",
    },
    {
      label: "Artikel Dibaca",
      value: analytics?.articleReads || totalViews || 0,
      icon: Eye,
      hint: "Global Article Readers",
    },
    {
      label: "Santri",
      value: students.length,
      icon: Users,
      hint: "Santri terdaftar",
    },
    {
      label: "Artikel",
      value: allPosts.length,
      icon: Newspaper,
      hint: "Telah diterbitkan",
    },
    {
      label: "Total Poin",
      value: totalPoints,
      icon: Target,
      hint: "Capaian santri",
    },
    {
      label: "Kategori",
      value: categoryCounts.length,
      icon: BookOpen,
      hint: "Rubrik aktif",
    },
  ];

  // Real 7-day activity trend derived from students' completed goals
  const trendData = React.useMemo(() => {
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const buckets: { key: string; name: string; aktif: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.push({
        key: d.toISOString().split("T")[0],
        name: dayNames[d.getDay()],
        aktif: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    students.forEach((s: any) => {
      (s.assignedGoals || s.assigned_goals || []).forEach((g: any) => {
        if (!g.completed || !g.completedAt) return;
        const key = String(g.completedAt).split("T")[0];
        const i = idx.get(key);
        if (i !== undefined) buckets[i].aktif += 1;
      });
    });
    return buckets.map(({ name, aktif }) => ({ name, aktif }));
  }, [students]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero / Masthead — static grid on PC/tablet for visual emphasis */}
      <section className="border-b-4 border-double border-foreground">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-14 pb-12 md:pt-20 md:pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground mb-4 inline-flex items-center gap-2">
              <Activity className="w-3 h-3" /> {todayLabel()}
            </p>
            <h1 className="font-display text-5xl md:text-8xl lg:text-9xl font-black text-foreground tracking-tight leading-[0.9]">
              PPMH{" "}
              <span className="italic font-normal text-primary">Insight</span>
            </h1>
            <div className="mt-6 max-w-2xl mx-auto">
              <p className="font-serif-body italic text-lg md:text-xl text-foreground/70 leading-relaxed">
                Pusat data, pencapaian santri, dan berita terkini Pondok
                Pesantren Manbaul Huda — Ngambon, Girimoyo, Karangploso, Malang.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link
                href="/leaderboard"
                className="px-7 py-3 bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors w-full sm:w-auto inline-flex justify-center items-center"
              >
                <Trophy className="w-4 h-4 mr-2" /> Papan Peringkat
              </Link>
              <Link
                href="/blog"
                className="px-7 py-3 border-2 border-foreground text-foreground font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors w-full sm:w-auto inline-flex justify-center items-center"
              >
                <BookOpen className="w-4 h-4 mr-2" /> Baca Berita
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Peringkat — horizontal rail */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-14">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Peringkat
            </h2>
          </div>
          <Link
            href="/leaderboard"
            className="text-primary text-xs font-bold uppercase tracking-widest hover:underline inline-flex items-center"
          >
            Semua <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
        <div className="editorial-rule mb-6" />

        {topStudents.length === 0 ? (
          <p className="text-muted-foreground italic font-serif-body">
            Belum ada data santri.
          </p>
        ) : (
          <HScroller ariaLabel="Peringkat">
            {topStudents.map((s, i) => (
              <div
                key={s.id}
                className="snap-start shrink-0 w-[70%] sm:w-[40%] md:w-[28%] lg:w-[22%]"
              >
                <Link
                  href={`/student/${s.id}`}
                  className="group block h-full p-5 rounded-2xl border border-border bg-card hover:border-foreground transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white shrink-0 ${
                        i === 0
                          ? "bg-yellow-500"
                          : i === 1
                            ? "bg-gray-400"
                            : i === 2
                              ? "bg-amber-600"
                              : "bg-foreground/40"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                        {s.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate font-serif-body italic">
                        {s.bio || "Santri PPMH"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      Total Poin
                    </span>
                    <span className="font-display text-2xl font-black text-primary">
                      {s.totalPoints || 0}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </HScroller>
        )}
      </section>

      {/* Statistik PPMH — horizontal rail */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-10">
        <div className="flex justify-between mb-6">
          <span className="text-foreground inline-flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Statistik
            </h2>
          </span>
          <PopoverSelect
            value={statsRange}
            onValueChange={setStatsRange}
            options={[
              { value: "today", label: "Hari Ini" },
              { value: "1w", label: "Minggu Ini" },
              { value: "1m", label: "Bulan Ini" },
              { value: "1y", label: "Tahun Ini" },
              { value: "all", label: "All-Time" },
            ]}
            className="w-32 h-8 text-[10px] bg-transparent border-border rounded-lg"
          />
        </div>
        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.25em] font-bold text-muted-foreground mb-6">
          <span className="flex-1 editorial-rule" />
        </div>

        <HScroller ariaLabel="Statistik PPMH">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="snap-start shrink-0 w-[60%] sm:w-[34%] md:w-[24%] lg:w-[20%]"
              >
                <div className="h-full p-5 rounded-2xl border border-border bg-card hover:border-foreground transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="font-display text-3xl font-black text-foreground mt-1">
                    {s.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate font-serif-body italic">
                    {s.hint}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Trend mini chart card inside the same rail */}
          <div className="snap-start shrink-0 w-[80%] sm:w-[60%] md:w-[40%] lg:w-[34%]">
            <div className="h-full p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">
                  Tren Aktivitas
                </p>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  7 Hari
                </span>
              </div>
              <div className="h-28 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="landingAktif"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#888" }}
                    />
                    <YAxis hide />
                    <CartesianGrid
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--background))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="aktif"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#landingAktif)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </HScroller>
      </section>

      {/* Berita Section */}
      <section className="max-w-6xl mx-auto px-2 md:px-8 pt-8 text-left">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-primary" />
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Berita
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-primary text-xs font-bold uppercase tracking-widest hover:underline inline-flex items-center"
          >
            Lihat Semua <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
        <div className="editorial-rule mb-6" />

        {/* Horizontal Scroll List (Popular/Featured) */}
        {allPosts.length > 0 && (
          <div className="mb-4 ml-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-5 uppercase tracking-widest">
              <Star className="w-4 h-4 text-primary" /> Populer Saat Ini
            </div>
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-5 pb-4 -mx-4 px-4 md:mx-0 md:px-0">
              {[...allPosts]
                .sort(
                  (a, b) =>
                    ((b as any).organic_views || 0) +
                    ((b as any).offset_views || 0) -
                    (((a as any).organic_views || 0) +
                      ((a as any).offset_views || 0)),
                )
                .slice(0, 5)
                .map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug || post.id}`}
                    className="snap-start shrink-0 w-[240px] sm:w-[320px] flex flex-col group"
                  >
                    <ImageWithFallback
                      src={post.featured_image || null}
                      alt={post.title}
                      fallbackType="gradient"
                      fill
                      sizes="320px"
                      containerClassName="w-full aspect-[16/10] sm:aspect-video rounded-2xl overflow-hidden mb-4 shadow-sm"
                      className="transition-transform duration-500 md:group-hover:scale-105"
                    />
                    <div className="flex items-center gap-2 mb-2">
                      {post.category && (
                        <span className="text-[10px] uppercase tracking-widest font-bold text-primary">
                          {post.category}
                        </span>
                      )}
                      <span className="text-muted-foreground/30 text-[10px]">
                        •
                      </span>
                      <div className="flex items-center text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                        <span>
                          {((post as any).organic_views || 0) +
                            ((post as any).offset_views || 0)}{" "}
                          views
                        </span>
                      </div>
                    </div>
                    <h3 className="font-display text-sm md:text-lg font-bold text-foreground leading-snug line-clamp-2 md:line-clamp-3 group-hover:text-primary transition-colors text-pretty">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed sm:block">
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Vertical List View (Artikel Terbaru) */}
        {allPosts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-widest border-b border-border/50 pb-3">
              <Activity className="w-4 h-4 text-primary" /> Artikel Terbaru
            </div>
            <div className="flex flex-col">
              {[...allPosts]
                .sort((a, b) =>
                  (b.published_at || "").localeCompare(a.published_at || ""),
                )
                .slice(0, 5)
                .map((post, i, arr) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug || post.id}`}
                    className={`flex items-center sm:items-start gap-4 sm:gap-6 group py-4 sm:py-8 ${
                      i !== arr.length - 1 ? "border-b border-border/40" : ""
                    }`}
                  >
                    <ImageWithFallback
                      src={post.featured_image || null}
                      alt={post.title}
                      fallbackType="gradient"
                      fill
                      sizes="160px"
                      containerClassName="w-24 h-24 md:w-40 md:h-32 shrink-0 rounded-xl overflow-hidden shadow-sm self-center sm:self-start"
                      className="transition-transform duration-500 md:group-hover:scale-105"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-center self-stretch py-1">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        {post.category && (
                          <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-primary">
                            {post.category}
                          </span>
                        )}
                        <span className="text-muted-foreground/30 text-[10px] sm:text-xs">
                          •
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground font-medium">
                          <time>
                            {post.published_at
                              ? new Date(post.published_at).toLocaleDateString(
                                  "id-ID",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )
                              : "-"}
                          </time>
                        </div>
                      </div>
                      <h3 className="font-display text-sm md:text-xl font-bold text-foreground leading-snug line-clamp-2 sm:line-clamp-3 group-hover:text-primary transition-colors text-pretty">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="mt-2 text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed sm:block">
                          {post.excerpt}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
