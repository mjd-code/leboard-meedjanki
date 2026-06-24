"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import type { Post } from "../../lib/types";
import Link from "next/link";
import {
  Calendar,
  ArrowUpRight,
  SearchCode,
  Grid3X3,
  Grid2X2,
  Rows,
  Info,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowDownAZ,
  Flame,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { SimplePagination } from "@/components/ui/SimplePagination";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";

function formatDate(d?: string | null) {
  return d
    ? new Date(d).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";
}

type BlogLayoutView = "list" | "dense" | "normal";

// --- MOCKUP DUMMIES DATA ---
const FALLBACK_DUMMY_POSTS: Post[] = [
  {
    id: "dummy-1",
    slug: "digitalisasi-manuskrip-kitab-kuning",
    title: "Preservasi Digital: Migrasi Kitab Klasik Turats ke Arsitektur Cloud",
    excerpt: "Bagaimana santri mengombinasikan pemahaman teks kitab kuning dengan teknologi OCR modern untuk pengarsipan lokal-first.",
    category: "Kajian",
    status: "published",
    featured_image: "",
    published_at: "2026-06-20T04:00:00Z",
    content: "",
    author_id: "",
    tags: [],
    updated_at: "",
    created_at: ""
  },
  {
    id: "dummy-2",
    slug: "optimasi-pwa-offline-first-pesantren",
    title: "Membangun Ekosistem Aplikasi PWA dengan Strategi Caching Service Worker Agresif",
    excerpt: "Panduan mengatasi kendala jaringan lokal tidak stabil melalui arsitektur local-first menggunakan manifest.json standar industri.",
    category: "Sains",
    status: "published",
    featured_image: "",
    published_at: "2026-06-18T07:30:00Z",
    content: "",
    author_id: "",
    tags: [],
    updated_at: "",
    created_at: ""
  },
  {
    id: "dummy-3",
    slug: "rest-api-go-fiber-leaderboard",
    title:
      "Arsitektur High-Performance Rest API Menggunakan Go Fiber dan PostgreSQL",
    excerpt:
      "Mengamankan performa backend data leaderboard capaian santri agar tetap gegas di bawah beban ribuan request simultan.",
    category: "Sains",
    status: "published",
    featured_image: "",
    published_at: "2026-06-15T02:00:00Z",
    content: "",
    author_id: "",
    tags: [],
    updated_at: "",
    created_at: ""
  },
  {
    id: "dummy-4",
    slug: "agrobisnis-lifeskill-santri-malang",
    title:
      "Implementasi Manajemen Distribusi Hasil Agrobisnis Santri di Malang Raya",
    excerpt:
      "Mengembangkan kemandirian ekonomi pondok melalui rantai pasok sayuran hidroponik berbasis teknologi pencatatan presisi.",
    category: "Kemandirian",
    status: "published",
    featured_image: "",
    published_at: "2026-06-10T09:00:00Z",
    content: "",
    author_id: "",
    tags: [],
    updated_at: "",
    created_at: ""
  },
  {
    id: "dummy-5",
    slug: "manajemen-waktu-tahfidz-intensif",
    title:
      "Metode Sema'an Akbar: Optimalisasi Retensi Hafalan Al-Qur'an Long-Term",
    excerpt:
      "Analisis berkala ritme murajaah santri dalam menjaga akurasi setoran hafalan bil ghaib tanpa mengabaikan tugas akademik.",
    category: "Santri",
    status: "published",
    featured_image: "",
    published_at: "2026-06-05T01:15:00Z",
    content: "",
    author_id: "",
    tags: [],
    updated_at: "",
    created_at: ""
  },
  {
    id: "dummy-6",
    slug: "arsitektur-estetik-ruang-belajar",
    title:
      "Desain Pencahayaan Koridor Kompleks Barat untuk Produktivitas Belajar Malam",
    excerpt:
      "Eksperimen tata ruang maktabah mini di sudut-sudut asrama guna merangsang minat mudzakarah kontemporer mandiri.",
    category: "Kompleks",
    status: "published",
    featured_image: "",
    published_at: "2026-06-01T12:00:00Z",
    content: "",
    author_id: "",
    tags: [],
    updated_at: "",
    created_at: ""
  },
];

const PAGE_SIZE = 9;

export default function BlogListTab() {
  const { data: serverPosts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["public-posts"],
    queryFn: async () => {
      const res = await apiFetch("/api/posts");
      if (!res.ok) throw new Error("Failed to fetch posts");
      const all: Post[] = await res.json();
      return all.filter((p) => p.status === "published");
    },
  });

  const isUsingDummies = serverPosts.length === 0;
  const posts = useMemo(() => {
    return isUsingDummies ? FALLBACK_DUMMY_POSTS : serverPosts;
  }, [serverPosts, isUsingDummies]);

  const blogRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<BlogLayoutView>("list");

  // Autoplay handler untuk Carousel Kategori Blog
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const pluginBlogCategories = useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
    }),
  );

  useEffect(() => {
    setPage(1);
  }, [search, sort, activeCat]);

  // Kalkulasi Filter Kategori + Penambahan Opsi "Semua Wawasan" di awal array
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => {
      const cat = (p.category || "Umum").trim();
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });

    const parsedCats = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return [{ name: "Semua Wawasan", count: posts.length }, ...parsedCats];
  }, [posts]);

  // Logika Filter & Sortir Data
  const filtered = useMemo(() => {
    let list = [...posts];
    if (activeCat && activeCat !== "Semua Wawasan") {
      list = list.filter((p) => (p.category || "Umum") === activeCat);
    }
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
  }, [posts, activeCat, search, sort]);

  const isFiltering =
    !!search.trim() || (!!activeCat && activeCat !== "Semua Wawasan");
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    return filtered.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
    );
  }, [filtered, currentPage]);

  const containerClass = useMemo(() => {
    switch (viewMode) {
      case "dense":
        return "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 sm:gap-2.5";
      case "normal":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5";
      case "list":
      default:
        return "flex flex-col gap-3.5";
    }
  }, [viewMode]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* BANNER NOTIFIKASI MOCKUP DATA */}
      {isUsingDummies && !isLoading && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            <strong>Mode Sandbox:</strong> Menampilkan data dokumentasi mockup
            sementara karena database server kosong.
          </span>
        </div>
      )}

      {/* --- ETALASE ATAS: CAROUSEL KATEGORI BLOG --- */}
      <div className="bg-gradient-to-tr from-neutral-950 via-neutral-900/40 to-emerald-950/10 border border-emerald-900/20 rounded-[2rem] p-5 sm:p-6 space-y-5 overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight">
                Eksplorasi Wawasan & Artikel
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pilih kategori di bawah untuk menyaring klaster pustaka digital
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl text-muted-foreground w-max self-start sm:self-center">
            {categoryCounts.length - 1} Topik Utama
          </span>
        </div>

        <div ref={blogRef}>
          <Carousel
            opts={{ align: "start", loop: true, dragFree: true }}
            plugins={isAutoplayEnabled ? [pluginBlogCategories.current] : []}
            className="w-full"
          >
            <CarouselContent className="-ml-3 pb-1">
              {categoryCounts.map((item) => {
                // Penentuan status aktif: jika null/Semua Wawasan, item pertama yang menyala
                const isActive =
                  activeCat === item.name ||
                  (item.name === "Semua Wawasan" &&
                    (activeCat === null || activeCat === "Semua Wawasan"));

                return (
                  <CarouselItem
                    key={item.name}
                    className="pl-3 basis-[55%] sm:basis-[35%] md:basis-[25%] lg:basis-[20%] select-none"
                  >
                    <button
                      onClick={() => {
                        setActiveCat(
                          item.name === "Semua Wawasan" ? null : item.name,
                        );
                        setIsAutoplayEnabled(false); // Hentikan autoplay saat user memilih manual
                      }}
                      className={`w-full text-left group relative aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden border transition-all ${
                        isActive
                          ? "border-amber-500 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500"
                          : "border-neutral-900 bg-neutral-950 hover:border-emerald-700/50"
                      }`}
                    >
                      {/* Premium Gradient Background Fallback */}
                      <ImageWithFallback
                        src={null}
                        alt={item.name}
                        fallbackType="gradient"
                        fill
                        containerClassName="w-full h-full opacity-40 group-hover:opacity-60 transition-opacity"
                      />

                      {/* Active Indicator Badge */}
                      {isActive && (
                        <div className="absolute top-3 right-3 bg-amber-500 text-neutral-950 p-1 rounded-lg z-10 shadow-md">
                          <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-3.5">
                        <h4
                          className={`font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-amber-300 transition-colors ${
                            isActive ? "text-amber-400" : "text-white"
                          }`}
                        >
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          {item.count} Publikasi
                        </p>
                      </div>
                    </button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </div>
      </div>

      {/* --- GRID DETAIL BAWAH & ALAT CONTROLLER LAYOUT --- */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-emerald-950/20 pb-4">
          <div className="w-full max-w-xs sm:max-w-md">
            <SmartSearchBar
              value={search}
              onChange={setSearch}
              sort={sort}
              onSortChange={setSort}
              resultCount={isFiltering ? filtered.length : undefined}
              className="w-full"
            />
          </div>

          {/* Layout View Switcher */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-900/60 w-max self-end sm:self-auto shrink-0 shadow-inner">
            <button
              onClick={() => setViewMode("list")}
              title="List View"
              className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                viewMode === "list"
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "text-muted-foreground hover:text-slate-200"
              }`}
            >
              <Rows className="w-4 h-4" />
              <span className="hidden md:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode("dense")}
              title="Instagram Style Grid (Dense)"
              className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                viewMode === "dense"
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "text-muted-foreground hover:text-slate-200"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden md:inline">Dense</span>
            </button>
            <button
              onClick={() => setViewMode("normal")}
              title="Normal Grid"
              className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                viewMode === "normal"
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "text-muted-foreground hover:text-slate-200"
              }`}
            >
              <Grid2X2 className="w-4 h-4" />
              <span className="hidden md:inline">Normal</span>
            </button>
          </div>
        </div>

        {/* Render Konten Utama */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, idx) => (
              <div
                key={idx}
                className="h-24 bg-neutral-900/30 border border-emerald-950/10 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-emerald-900/20 rounded-2xl bg-neutral-950/10 max-w-md mx-auto flex flex-col items-center justify-center p-6">
            <SearchCode className="w-7 h-7 text-emerald-600 mb-2" />
            <h4 className="text-sm font-bold text-slate-300">
              Hasil tidak ditemukan
            </h4>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Gunakan kata kunci pencarian lain atau pilih cluster kategori yang
              berbeda.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${viewMode}-${activeCat}-${search}-${sort}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={containerClass}
              >
                {pageItems.map((post) => {
                  const isDense = viewMode === "dense";
                  const isNormal = viewMode === "normal";

                  return (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug || post.id}`}
                      className={`group transition-all duration-300 relative overflow-hidden flex ${
                        isDense
                          ? "flex-col bg-neutral-950 p-0 border-transparent rounded-md sm:rounded-xl"
                          : isNormal
                            ? "flex-col p-4 bg-gradient-to-b from-neutral-900/40 to-neutral-950/60 border border-emerald-950/20 rounded-2xl shadow-sm hover:border-emerald-800/40 hover:from-emerald-950/10"
                            : "flex-row gap-4 p-4 items-center bg-gradient-to-r from-neutral-900/40 to-neutral-950/10 border border-emerald-950/20 rounded-xl hover:border-emerald-800/40 hover:from-emerald-950/5"
                      }`}
                    >
                      {!isDense && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/0 group-hover:bg-emerald-500/[0.02] blur-xl transition-all duration-300 pointer-events-none" />
                      )}

                      {/* Image Frame */}
                      <div
                        className={`relative shrink-0 rounded-lg overflow-hidden bg-neutral-950 ${
                          isDense
                            ? "w-full aspect-square rounded-none sm:rounded-lg"
                            : isNormal
                              ? "w-full aspect-[16/10] mb-3.5 shadow-sm"
                              : "w-20 h-20 sm:w-28 sm:h-20 shadow-md"
                        }`}
                      >
                        <ImageWithFallback
                          src={post.featured_image || null}
                          alt={post.title}
                          fallbackType="gradient"
                          fill
                          sizes={
                            isDense ? "180px" : isNormal ? "400px" : "120px"
                          }
                          containerClassName="w-full h-full"
                          className="transition-transform duration-500 group-hover:scale-103"
                        />

                        {/* Instagram Style Hover (Dense) */}
                        {isDense && (
                          <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2 sm:p-3 text-left pointer-events-none">
                            <span className="text-[8px] font-black tracking-wider text-amber-500 uppercase block mb-0.5">
                              {post.category || "Umum"}
                            </span>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-100 line-clamp-2 leading-tight">
                              {post.title}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Meta Information Content (Hidden on Dense) */}
                      {!isDense && (
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                              {post.category || "Umum"}
                            </span>
                            {isUsingDummies && (
                              <span className="text-[8px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono scale-90 origin-left">
                                DUMMY
                              </span>
                            )}
                            <span className="text-neutral-800 text-xs">•</span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                              <Calendar className="w-2.5 h-2.5 text-emerald-600" />
                              {formatDate(post.published_at)}
                            </div>
                          </div>

                          <h3
                            className={`font-bold text-slate-100 leading-snug tracking-tight text-pretty group-hover:text-amber-400 transition-colors duration-200 ${
                              isNormal
                                ? "text-base line-clamp-2"
                                : "text-sm sm:text-base line-clamp-2"
                            }`}
                          >
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p
                              className={`text-xs text-muted-foreground font-normal leading-relaxed ${
                                isNormal
                                  ? "line-clamp-2 pt-0.5"
                                  : "line-clamp-1 hidden sm:block"
                              }`}
                            >
                              {post.excerpt}
                            </p>
                          )}
                        </div>
                      )}

                      {viewMode === "list" && (
                        <div className="shrink-0 p-1 text-neutral-600 group-hover:text-amber-400 transition-colors hidden sm:block">
                          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {/* 3. PAGINATION ZONE */}
            {totalPages > 1 && (
              <div className="pt-6 border-t border-emerald-950/10 flex justify-center">
                <SimplePagination
                  page={currentPage}
                  totalPages={totalPages}
                  onChange={(p) => {
                    setPage(p);
                    if (typeof window !== "undefined") {
                      const anchor = document.getElementById(
                        "scroll-anchor-trigger",
                      );
                      if (anchor) anchor.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export type SortKey = "newest" | "oldest" | "popular" | "az";

const SORT_OPTIONS: {
  key: SortKey;
  label: string;
  icon: React.ComponentType<any>;
}[] = [
  { key: "newest", label: "Terbaru", icon: Clock },
  { key: "oldest", label: "Terlama", icon: Clock },
  { key: "popular", label: "Terpopuler", icon: Flame },
  { key: "az", label: "A → Z", icon: ArrowDownAZ },
];

function SmartSearchBar({
  value,
  onChange,
  sort,
  onSortChange,
  placeholder = "Cari berita, topik, atau penulis…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  placeholder?: string;
  className?: string;
  resultCount?: number;
}) {
  const [showSort, setShowSort] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setShowSort(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-12 pl-11 pr-10 rounded-full bg-background border border-border text-sm font-serif-body placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div ref={wrapRef} className="relative">
          <button
            type="button"
            onClick={() => setShowSort((s) => !s)}
            aria-label="Sort"
            className={cn(
              "h-12 px-4 inline-flex items-center gap-2 rounded-full border border-border bg-background text-xs font-bold uppercase tracking-widest hover:border-foreground transition-colors",
              showSort && "border-foreground",
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">
              {SORT_OPTIONS.find((s) => s.key === sort)?.label}
            </span>
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-background border border-border rounded-xl shadow-soft z-30 overflow-hidden">
              {SORT_OPTIONS.map((s) => {
                const Icon = s.icon;
                const active = sort === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      onSortChange(s.key);
                      setShowSort(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-muted transition-colors",
                      active && "bg-muted font-bold",
                    )}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" /> {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
