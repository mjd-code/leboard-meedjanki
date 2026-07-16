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

const FALLBACK_DUMMY_POSTS: Post[] = [
  {
    id: "dummy-1",
    slug: "digitalisasi-manuskrip-kitab-kuning",
    title:
      "Preservasi Digital: Migrasi Kitab Klasik Turats ke Arsitektur Cloud",
    excerpt:
      "Bagaimana santri mengombinasikan pemahaman teks kitab kuning dengan teknologi OCR modern untuk pengarsipan lokal-first.",
    category: "Kajian",
    status: "published",
    featured_image: "",
    published_at: "2026-06-20T04:00:00Z",
    content: "",
    author_id: "",
    tags: [],
    updated_at: "",
    created_at: "",
  },
  {
    id: "dummy-2",
    slug: "optimasi-pwa-offline-first-pesantren",
    title:
      "Membangun Ekosistem Aplikasi PWA dengan Strategi Caching Service Worker Agresif",
    excerpt:
      "Panduan mengatasi kendala jaringan lokal tidak stabil melalui arsitektur local-first menggunakan manifest.json standar industri.",
    category: "Sains",
    status: "published",
    featured_image: "",
    published_at: "2026-06-18T07:30:00Z",
    content: "",
    author_id: "",
    tags: [],
    updated_at: "",
    created_at: "",
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
    created_at: "",
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
        return "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2.5";
      case "normal":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5";
      case "list":
      default:
        return "flex flex-col gap-3.5";
    }
  }, [viewMode]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
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
      <div className="bg-gradient-to-tr from-neutral-950 via-neutral-900/40 to-emerald-950/10 border border-neutral-900/60 rounded-2xl md:rounded-[2rem] p-4 sm:p-6 space-y-4 overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-xl font-bold tracking-tight text-neutral-100">
                Eksplorasi Wawasan & Artikel
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Pilih kategori di bawah untuk menyaring klaster pustaka digital
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-lg text-muted-foreground w-max self-start sm:self-center">
            {categoryCounts.length - 1} Topik Utama
          </span>
        </div>

        <div ref={blogRef}>
          <Carousel
            opts={{ align: "start", loop: true, dragFree: true }}
            plugins={isAutoplayEnabled ? [pluginBlogCategories.current] : []}
            className="w-full"
          >
            <CarouselContent className="-ml-2.5 sm:-ml-3 pb-1">
              {categoryCounts.map((item) => {
                const isActive =
                  activeCat === item.name ||
                  (item.name === "Semua Wawasan" &&
                    (activeCat === null || activeCat === "Semua Wawasan"));

                return (
                  <CarouselItem
                    key={item.name}
                    className="pl-2.5 sm:pl-3 basis-[46%] sm:basis-[32%] md:basis-[24%] lg:basis-[18%] select-none"
                  >
                    <button
                      onClick={() => {
                        setActiveCat(
                          item.name === "Semua Wawasan" ? null : item.name,
                        );
                        setIsAutoplayEnabled(false);
                      }}
                      className={`w-full text-left group relative aspect-[16/11] sm:aspect-[4/3] rounded-xl overflow-hidden border transition-all ${
                        isActive
                          ? "border-amber-500 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500"
                          : "border-neutral-900 bg-neutral-950 hover:border-emerald-700/50"
                      }`}
                    >
                      <ImageWithFallback
                        src={null}
                        alt={item.name}
                        fallbackType="gradient"
                        fill
                        containerClassName="w-full h-full opacity-30 group-hover:opacity-50 transition-opacity"
                      />

                      {isActive && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-neutral-950 p-0.5 rounded shadow-md z-10">
                          <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-2.5 sm:p-3.5">
                        <h4
                          className={`font-bold text-[11px] sm:text-xs line-clamp-1 group-hover:text-amber-300 transition-colors ${
                            isActive ? "text-amber-400" : "text-white"
                          }`}
                        >
                          {item.name}
                        </h4>
                        <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                          {item.count} Pustaka
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

      {/* --- GRID DETAIL BAWAH & ALAT CONTROLLER LAYOUT (FULLY RESPONSIVE & SYMMETRICAL) --- */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 px-1 border-b border-neutral-900 pb-4">
          {/* Sisi Kiri: Smart Search Bar (Melebar penuh di Mobile, Terkontrol di Desktop) */}
          <div className="w-full lg:max-w-xl">
            <SmartSearchBar
              value={search}
              onChange={setSearch}
              sort={sort}
              onSortChange={setSort}
              className="w-full"
            />
          </div>

          {/* Sisi Kanan: Baris Status Data & Layout Switcher Terpadu */}
          <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto shrink-0">
            {/* Info Badge Count */}
            <div className="text-[10px] sm:text-xs font-mono text-muted-foreground bg-neutral-950/40 border border-neutral-900/80 px-3 py-1.5 rounded-xl">
              {isFiltering ? (
                <span>
                  Ditemukan{" "}
                  <strong className="text-amber-400">{filtered.length}</strong>{" "}
                  wawasan
                </span>
              ) : (
                <span>
                  Total{" "}
                  <strong className="text-emerald-400">{posts.length}</strong>{" "}
                  wawasan
                </span>
              )}
            </div>

            {/* Layout View Switcher */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0 shadow-inner">
              <button
                onClick={() => setViewMode("list")}
                title="List View"
                className={`h-8 px-2.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
                  viewMode === "list"
                    ? "bg-amber-500 text-neutral-950 shadow-md"
                    : "text-muted-foreground hover:text-emerald-400 hover:bg-neutral-900/40"
                }`}
              >
                <Rows className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>

              <button
                onClick={() => setViewMode("dense")}
                title="Dense Grid View"
                className={`h-8 px-2.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
                  viewMode === "dense"
                    ? "bg-amber-500 text-neutral-950 shadow-md"
                    : "text-muted-foreground hover:text-emerald-400 hover:bg-neutral-900/40"
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dense</span>
              </button>

              <button
                onClick={() => setViewMode("normal")}
                title="Normal Grid View"
                className={`h-8 px-2.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
                  viewMode === "normal"
                    ? "bg-amber-500 text-neutral-950 shadow-md"
                    : "text-muted-foreground hover:text-emerald-400 hover:bg-neutral-900/40"
                }`}
              >
                <Grid2X2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Normal</span>
              </button>
            </div>
          </div>
        </div>

        {/* Render Konten Utama */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, idx) => (
              <div
                key={idx}
                className="h-24 bg-neutral-900/30 border border-neutral-900/50 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/10 max-w-md mx-auto flex flex-col items-center justify-center p-6">
            <SearchCode className="w-6 h-6 text-emerald-600 mb-2" />
            <h4 className="text-xs font-bold text-neutral-300">
              Hasil tidak ditemukan
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 text-center leading-relaxed">
              Gunakan kata kunci pencarian lain atau pilih topik kategori
              pustaka wawasan yang berbeda.
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
                      className={cn(
                        "group transition-all duration-300 relative overflow-hidden flex",
                        isDense
                          ? "flex-col bg-neutral-950 p-0 border-transparent rounded-lg"
                          : isNormal
                            ? "flex-col p-4 bg-gradient-to-b from-neutral-900/30 to-neutral-950/60 border border-neutral-900 rounded-xl shadow-sm hover:border-emerald-800/40 hover:from-emerald-950/10"
                            : "flex-row gap-3.5 p-3.5 items-center bg-gradient-to-r from-neutral-900/30 to-neutral-950/10 border border-neutral-900 rounded-xl hover:border-emerald-800/40 hover:from-emerald-950/5",
                      )}
                    >
                      {!isDense && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/0 group-hover:bg-emerald-500/[0.01] blur-xl transition-all duration-300 pointer-events-none" />
                      )}

                      {/* Image Frame */}
                      <div
                        className={cn(
                          "relative shrink-0 rounded-lg overflow-hidden bg-neutral-950",
                          isDense
                            ? "w-full aspect-square rounded-lg"
                            : isNormal
                              ? "w-full aspect-[16/10] mb-3"
                              : "w-16 h-16 sm:w-24 sm:h-18",
                        )}
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
                          className="transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Dense Style Hover Text */}
                        {isDense && (
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2 text-left pointer-events-none">
                            <span className="text-[7px] font-black tracking-wider text-amber-500 uppercase block mb-0.5">
                              {post.category || "Umum"}
                            </span>
                            <p className="text-[10px] font-bold text-slate-100 line-clamp-2 leading-tight">
                              {post.title}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Meta Content Zone */}
                      {!isDense && (
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">
                              {post.category || "Umum"}
                            </span>
                            {isUsingDummies && (
                              <span className="text-[8px] px-1 rounded bg-neutral-800 text-neutral-400 font-mono scale-90">
                                MOCKUP
                              </span>
                            )}
                            <span className="text-neutral-800 text-xs hidden sm:inline">
                              •
                            </span>
                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-medium">
                              <Calendar className="w-2.5 h-2.5 text-emerald-600" />
                              {formatDate(post.published_at)}
                            </div>
                          </div>

                          <h3
                            className={cn(
                              "font-bold text-slate-100 leading-snug tracking-tight text-pretty group-hover:text-amber-400 transition-colors duration-200",
                              isNormal
                                ? "text-sm sm:text-base line-clamp-2"
                                : "text-xs sm:text-sm line-clamp-2",
                            )}
                          >
                            {post.title}
                          </h3>

                          {post.excerpt && (
                            <p
                              className={cn(
                                "text-[11px] text-muted-foreground font-normal leading-relaxed",
                                isNormal
                                  ? "line-clamp-2 pt-0.5"
                                  : "line-clamp-1 hidden sm:block",
                              )}
                            >
                              {post.excerpt}
                            </p>
                          )}
                        </div>
                      )}

                      {viewMode === "list" && (
                        <div className="shrink-0 p-1 text-neutral-700 group-hover:text-amber-400 transition-colors hidden sm:block">
                          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {/* Pagination Zone */}
            {totalPages > 1 && (
              <div className="pt-5 border-t border-neutral-900 flex justify-center">
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

/* --- PERBAIKAN UTAMA: SMART SEARCH BAR (STYLE MATCHING & FULLY RESPONSIVE) --- */
function SmartSearchBar({
  value,
  onChange,
  sort,
  onSortChange,
  placeholder = "Cari artikel wawasan...",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  placeholder?: string;
  className?: string;
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
    <div className={cn("w-full", className)} ref={wrapRef}>
      <div className="flex items-center gap-2 w-full">
        {/* Input Field Container */}
        <div className="relative flex-1 group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50 group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-11 pl-11 pr-10 rounded-xl bg-neutral-950 border border-neutral-800 text-xs sm:text-sm font-medium text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-600 transition-all shadow-inner"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Trigger Button Dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowSort((s) => !s)}
            className={cn(
              "h-11 px-3 sm:px-4 inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:border-emerald-800 hover:bg-neutral-900/30 transition-all shadow-sm min-w-[44px] justify-center",
              showSort &&
                "border-amber-500 ring-1 ring-amber-500 text-amber-400",
            )}
          >
            <SlidersHorizontal
              className={cn(
                "w-3.5 h-3.5 text-neutral-400",
                showSort && "text-amber-400",
              )}
            />
            <span className="hidden sm:inline">
              {SORT_OPTIONS.find((s) => s.key === sort)?.label}
            </span>
          </button>

          <AnimatePresence>
            {showSort && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-40 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-30 overflow-hidden p-1 space-y-0.5"
              >
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
                        "w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors text-neutral-400 hover:bg-neutral-900 hover:text-emerald-400",
                        active &&
                          "bg-emerald-950/40 text-amber-400 font-bold border border-emerald-900/40",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-3.5 h-3.5 text-neutral-500",
                          active && "text-amber-500",
                        )}
                      />
                      {s.label}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
