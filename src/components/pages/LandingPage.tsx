"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import type { Post, Student } from "../../lib/types";
import Link from "next/link";
import {
  ArrowRight,
  Trophy,
  BookOpen,
  Activity,
  Users,
  Eye,
  Newspaper,
  Target,
  ChevronDown,
  Compass,
  Image as ImageIcon,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// Impor Carousel Shadcn UI & Autoplay
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

import { PopoverSelect } from "@/components/ui/PopoverSelect";
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
  // --- API Fetching ---
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

  const [statsRange, setStatsRange] = useState("today");
  const { data: analytics } = useQuery({
    queryKey: ["public-analytics", statsRange],
    queryFn: async () => {
      const res = await apiFetch(`/api/stats?range=${statsRange}`);
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
  });

  // --- Data Munging ---
  const sortedStudents = useMemo(() => {
    return [...students]
      .map((student) => {
        if (!student.assignedGoals || !Array.isArray(student.assignedGoals)) {
          return {
            ...student,
            totalPoints: student.totalPoints || 0,
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

        return { ...student, totalPoints: calculatedPoints, lastCompletion };
      })
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints)
          return (b.totalPoints || 0) - (a.totalPoints || 0);
        return (b.lastCompletion || 0) - (a.lastCompletion || 0);
      });
  }, [students, masterGoals]);

  const topStudents = sortedStudents.slice(0, 8);

  const popularPosts = useMemo(() => {
    return [...allPosts]
      .sort((a, b) => {
        const viewsA =
          ((a as any).organic_views || 0) + ((a as any).offset_views || 0);
        const viewsB =
          ((b as any).organic_views || 0) + ((b as any).offset_views || 0);
        return viewsB - viewsA;
      })
      .slice(0, 8);
  }, [allPosts]);

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
      hint: "Pembaca Global",
    },
    {
      label: "Santri",
      value: students.length,
      icon: Users,
      hint: "Total Terdaftar",
    },
    {
      label: "Total Poin",
      value: totalPoints,
      icon: Target,
      hint: "Capaian Akumulatif",
    },
  ];

  const trendData = useMemo(() => {
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
    return buckets;
  }, [students]);

  // --- Local States & Static Data ---
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const programs = [
    {
      title: "Tahfidzul Qur'an",
      desc: "Akselerasi hafalan mutqin 30 juz dengan bimbingan bersanad.",
      icon: "📖",
    },
    {
      title: "Kajian Kitab Kuning",
      desc: "Pendalaman komprehensif literatur klasik/turats ushul fiqh, nahwu, dan akhlak.",
      icon: "🕌",
    },
    {
      title: "Digital Skill & Tech",
      desc: "Pengembangan bakat modern melalui coding, UI/UX design, dan literasi media.",
      icon: "💻",
    },
  ];

  const galleryItems = [
    { src: null, tag: "Kajian", title: "Khidmah Kitab Turats" },
    { src: null, tag: "Santri", title: "Sema'an Al-Qur'an Akbar" },
    { src: null, tag: "Kompleks", title: "Suasana Malam Manbaul Huda" },
    { src: null, tag: "Sains", title: "Inovasi Coding Santri" },
    { src: null, tag: "Kemandirian", title: "Agrobisnis & Lifeskill" },
  ];

  const faqs = [
    {
      q: "Bagaimana sistem pelacakan poin prestasi santri?",
      a: "Setiap target pencapaian (tahfidz, kedisiplinan, kitab) diinput oleh pengasuh melalui sistem backend, poin otomatis terakumulasi real-time di leaderboard publik.",
    },
    {
      q: "Apakah kurikulum teknologi mengganggu pembelajaran kitab?",
      a: "Tidak. Sesi literasi digital dijadwalkan secara khusus pasca-kajian utama sebagai bekal santri menghadapi era modern.",
    },
    {
      q: "Bagaimana cara mendaftar menjadi santri PPMH?",
      a: "Pendaftaran dapat diakses secara online via portal web resmi atau langsung menuju kesekretariatan PPMH di Karangploso, Malang.",
    },
  ];

  // --- Carousel Autoplay Refs (4 detik) ---
  // Ditambahkan stopOnInteraction: false & stopOnMouseEnter: true agar auto-scroll hidup kembali setelah interaksi manual selesai
  const pluginLeaderboard = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const pluginNews = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const pluginGallery = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  // --- Refs untuk Mouse Wheel Scrolling ---
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const newsRef = useRef<HTMLDivElement>(null);

  const createWheelHandler = (ref: React.RefObject<HTMLDivElement | null>) => {
    return (e: WheelEvent) => {
      const carouselContainer = ref.current;
      if (!carouselContainer) return;

      // Cari elemen internal viewport embla (biasanya div pertama di dalam komponen Carousel)
      const emblaViewport =
        carouselContainer.querySelector('[class*="overflow-hidden"]') ||
        carouselContainer;

      if (e.deltaY !== 0) {
        e.preventDefault(); // Matikan scroll halaman vertikal
        emblaViewport.scrollLeft += e.deltaY; // Geser horizontal
      }
    };
  };

  useEffect(() => {
    const lbContainer = leaderboardRef.current;
    const galContainer = galleryRef.current;
    const newsContainer = newsRef.current;

    const handleLbWheel = createWheelHandler(leaderboardRef);
    const handleGalWheel = createWheelHandler(galleryRef);
    const handleNewsWheel = createWheelHandler(newsRef);

    if (lbContainer)
      lbContainer.addEventListener("wheel", handleLbWheel, { passive: false });
    if (galContainer)
      galContainer.addEventListener("wheel", handleGalWheel, {
        passive: false,
      });
    if (newsContainer)
      newsContainer.addEventListener("wheel", handleNewsWheel, {
        passive: false,
      });

    return () => {
      if (lbContainer) lbContainer.removeEventListener("wheel", handleLbWheel);
      if (galContainer)
        galContainer.removeEventListener("wheel", handleGalWheel);
      if (newsContainer)
        newsContainer.removeEventListener("wheel", handleNewsWheel);
    };
  }, [topStudents, galleryItems, popularPosts]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-amber-500 selection:text-neutral-900 overflow-x-hidden">
      {/* 1. Hero / Masthead */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-background to-background pt-12 pb-10 md:pt-20 md:pb-16">
        <div className="max-w-6xl mx-auto px-5 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-amber-400 font-bold mb-4 inline-flex items-center gap-2 bg-emerald-900/50 px-3.5 py-1.5 rounded-full border border-emerald-800">
              <Activity className="w-3 h-3 animate-pulse text-emerald-400" />{" "}
              {todayLabel()}
            </p>
            <h1 className="font-display text-4xl sm:text-6xl md:text-8xl font-black tracking-tight leading-[1.1]">
              PPMH{" "}
              <span className="italic font-serif font-normal text-amber-500">
                Insight
              </span>
            </h1>
            <div className="mt-5 md:mt-6 max-w-xl mx-auto px-2">
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed font-medium">
                Pusat data transparansi, performa capaian santri, dan jurnalisme
                berkala Pondok Pesantren Manbaul Huda — Karangploso, Malang.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 md:mt-10 max-w-xs mx-auto sm:max-w-none">
              <Link
                href="/leaderboard"
                className="flex items-center justify-center w-full px-6 py-3.5 text-xs font-bold tracking-widest text-neutral-950 uppercase transition-all bg-amber-500 hover:bg-amber-400 sm:w-auto rounded-xl shadow-lg shadow-amber-500/10"
              >
                <Trophy className="w-4 h-4 mr-2" /> Papan Peringkat
              </Link>
              <Link
                href="/blog"
                className="flex items-center justify-center w-full px-6 py-3.5 text-xs font-bold tracking-widest text-amber-500 uppercase transition-all border-2 border-emerald-800 bg-emerald-950/20 hover:bg-emerald-950/50 sm:w-auto rounded-xl"
              >
                <BookOpen className="w-4 h-4 mr-2" /> Eksplorasi Berita
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-1 sm:px-1 lg:px-8 space-y-8 md:space-y-12">
        {/* 6. Galeri Pesantren Section */}
        <section className="bg-gradient-to-br from-neutral-950 via-emerald-950/10 to-neutral-950 border border-emerald-900/30 rounded-[2rem] p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              Galeri Pesantren
            </h2>
          </div>

          <div ref={galleryRef}>
            <Carousel
              opts={{
                align: "start",
                loop: true,
                dragFree: true,
              }}
              plugins={[pluginGallery.current]}
              className="w-full"
            >
              <CarouselContent className="-ml-4 md:-ml-5 pb-4">
                {galleryItems.map((item, index) => (
                  <CarouselItem
                    key={index}
                    className="pl-4 md:pl-5 basis-[75%] sm:basis-[40%] md:basis-[30%] lg:basis-[23%]"
                  >
                    <div className="group relative aspect-[4/5] bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 cursor-grab active:cursor-grabbing">
                      <ImageWithFallback
                        src={item.src}
                        alt={item.title}
                        fallbackType="gradient"
                        fill
                        containerClassName="w-full h-full"
                        className="transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded w-max mb-2 backdrop-blur-sm">
                          {item.tag}
                        </span>
                        <h4 className="font-bold text-sm text-white line-clamp-2 leading-snug">
                          {item.title}
                        </h4>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </section>

        {/* 5. Kabar Populer Section */}
        <section className="bg-gradient-to-tr from-neutral-950 via-neutral-900/60 to-amber-950/10 border border-amber-900/20 rounded-[2rem] p-5 sm:p-6 lg:p-8 space-y-6 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <Newspaper className="w-5 h-5" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                Kabar Populer
              </h2>
            </div>
            <Link
              href="/blog"
              className="text-amber-500 text-xs font-bold uppercase tracking-wider hover:text-amber-400 inline-flex items-center gap-1"
            >
              Jurnal Berita <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {popularPosts.length === 0 ? (
            <p className="text-muted-foreground text-sm italic py-2">
              Belum ada warta terbit.
            </p>
          ) : (
            <div ref={newsRef}>
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                  dragFree: true,
                }}
                plugins={[pluginNews.current]}
                className="w-full"
              >
                <CarouselContent className="-ml-4 md:-ml-5 pb-4">
                  {popularPosts.map((post) => (
                    <CarouselItem
                      key={post.id}
                      className="pl-4 md:pl-5 basis-[85%] sm:basis-[45%] md:basis-[32%] lg:basis-[24%]"
                    >
                      <div className="h-full bg-neutral-950/70 border border-neutral-800/60 p-3.5 rounded-2xl flex flex-col justify-between group hover:border-amber-500/30 transition-all cursor-grab active:cursor-grabbing">
                        <div>
                          <ImageWithFallback
                            src={post.featured_image || null}
                            alt={post.title}
                            fallbackType="gradient"
                            fill
                            sizes="280px"
                            containerClassName="w-full aspect-video rounded-xl overflow-hidden mb-4 shadow-inner relative"
                            className="transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider font-bold text-amber-500">
                            <span>{post.category || "Umum"}</span>
                            <span className="text-neutral-800">•</span>
                            <span className="text-muted-foreground lowercase">
                              {((post as any).organic_views || 0) +
                                ((post as any).offset_views || 0)}{" "}
                              views
                            </span>
                          </div>
                          <h3 className="font-display text-sm sm:text-base font-bold text-emerald-50 line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
                            {post.title}
                          </h3>
                        </div>
                        {post.excerpt && (
                          <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          )}
        </section>

        {/* 3. Program Unggulan Section */}
        <section className="bg-neutral-900/40 border border-neutral-800/60 rounded-[2rem] p-5 sm:p-6 lg:p-8 space-y-6 md:space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              Program Unggulan
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {programs.map((prog, idx) => (
              <div
                key={idx}
                className="p-5 md:p-6 rounded-2xl bg-neutral-950/60 border border-neutral-800 hover:border-emerald-900/60 transition-all flex gap-4 items-start group"
              >
                <span className="text-2xl bg-emerald-950/80 p-3 rounded-xl border border-emerald-900/40 group-hover:scale-105 transition-transform">
                  {prog.icon}
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-emerald-50">
                    {prog.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {prog.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 7. Q&A / FAQ Section */}
        <section className="bg-neutral-900/20 border border-neutral-900/60 rounded-[2rem] p-5 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 justify-center text-center">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              Tanya Jawab (Q&A)
            </h2>
          </div>
          <div className="space-y-3 md:space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-neutral-800/80 rounded-2xl bg-neutral-950/40 overflow-hidden transition-colors hover:border-emerald-900/40"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 md:p-5 text-left font-semibold text-sm sm:text-base text-emerald-50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-amber-500 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <p className="p-4 md:p-5 pt-0 md:pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-neutral-900/30 bg-neutral-950/20">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. Leaderboard Rail - SEKARANG MENGGUNAKAN SHADCN CAROUSEL & MOUSE SCROLL */}
        <section className="bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-neutral-950 border border-emerald-800/40 rounded-[2rem] p-5 sm:p-6 lg:p-8 shadow-xl backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <Trophy className="w-5 h-5" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                Top Santri Berprestasi
              </h2>
            </div>
            <Link
              href="/leaderboard"
              className="text-amber-500 text-xs font-bold uppercase tracking-wider hover:text-amber-400 inline-flex items-center gap-1 transition-colors"
            >
              Semua <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {topStudents.length === 0 ? (
            <p className="text-muted-foreground text-sm italic py-4">
              Menunggu sinkronisasi data capaian...
            </p>
          ) : (
            <div ref={leaderboardRef}>
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                  dragFree: true,
                }}
                plugins={[pluginLeaderboard.current]}
                className="w-full"
              >
                <CarouselContent className="-ml-4 md:-ml-5 pb-4">
                  {topStudents.map((s, i) => (
                    <CarouselItem
                      key={s.id}
                      className="pl-4 md:pl-5 basis-[85%] sm:basis-[45%] md:w-[30%] lg:basis-[24%]"
                    >
                      <Link
                        href={`/student/${s.id}`}
                        className="group block h-full p-4 md:p-5 rounded-2xl border border-emerald-900/40 bg-neutral-950/80 hover:border-amber-500/40 transition-all hover:bg-neutral-900/90 cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 text-neutral-950 ${
                              i === 0
                                ? "bg-amber-400"
                                : i === 1
                                  ? "bg-slate-300"
                                  : i === 2
                                    ? "bg-amber-700"
                                    : "bg-emerald-800 text-emerald-100"
                            }`}
                          >
                            #{i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate group-hover:text-amber-400 transition-colors">
                              {s.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate font-serif italic mt-0.5">
                              {s.bio || "Santri PPMH"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-5 pt-4 border-t border-emerald-900/30 flex items-end justify-between">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                            Total Poin
                          </span>
                          <span className="font-display text-2xl font-black text-amber-500 leading-none">
                            {s.totalPoints || 0}
                          </span>
                        </div>
                      </Link>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          )}
        </section>

        {/* 4. Analytics & Trends Section */}
        <section className="bg-black border border-emerald-950 rounded-[2rem] p-5 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 shadow-2xl">
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm sm:text-base font-bold text-muted-foreground uppercase tracking-widest">
                Metrik Data
              </h3>
              <PopoverSelect
                value={statsRange}
                onValueChange={setStatsRange}
                options={[
                  { value: "today", label: "Hari Ini" },
                  { value: "1w", label: "Minggu Ini" },
                  { value: "1m", label: "Bulan Ini" },
                  { value: "all", label: "All-Time" },
                ]}
                className="w-32 h-9 text-xs bg-neutral-900 border-neutral-800 text-muted-foreground rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="p-4 md:p-5 rounded-2xl border border-neutral-900 bg-neutral-950/40"
                  >
                    <div className="flex items-center justify-between text-muted-foreground mb-2">
                      <p className="text-[10px] sm:text-xs uppercase tracking-wider font-bold">
                        {s.label}
                      </p>
                      <Icon className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="font-display text-2xl sm:text-3xl font-black text-amber-500 mt-1">
                      {s.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-900 bg-neutral-950/40 flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                Grafik Keaktifan
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-serif italic">
                Rasio setoran target 7 hari terakhir
              </p>
            </div>
            <div className="h-32 mt-5 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="aktifGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#f59e0b"
                        stopOpacity={0.25}
                      />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#555" }}
                    dy={5}
                  />
                  <YAxis hide />
                  <CartesianGrid
                    vertical={false}
                    stroke="#166534"
                    strokeDasharray="3 3"
                    opacity={0.3}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #1e3a1e",
                      background: "#050505",
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="aktif"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#aktifGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
