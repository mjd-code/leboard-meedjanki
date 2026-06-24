"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import type { Post } from "../../lib/types";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  User,
  ArrowRight,
  Eye,
  Share2,
  Copy,
  Check,
  List,
  ChevronDown,
  AArrowUp,
  AArrowDown,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { BlogContent } from "@/components/blog/BlogContent";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

function formatDate(d?: string | null) {
  return d
    ? new Date(d).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";
}

function readingTime(html?: string) {
  if (!html) return "1 mnt";
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} mnt baca`;
}

const TEXT_SIZE_STEPS = ["xs", "sm", "base", "lg", "xl", "2xl"] as const;

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function BlogPostPage({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [textSizeIndex, setTextSizeIndex] = useState(2);

  // State Manajemen Utama ToC Multi-Level
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  const [isTocDropdownOpen, setIsTocDropdownOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  const anchorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTextSizeStep = TEXT_SIZE_STEPS[textSizeIndex];

  // Tanstack Queries
  const { data: allPosts = [] } = useQuery<Post[]>({
    queryKey: ["public-posts"],
    queryFn: async () => {
      const res = await apiFetch("/api/posts");
      if (!res.ok) throw new Error("Failed to fetch posts");
      const all: Post[] = await res.json();
      return all.filter((p) => p.status === "published");
    },
  });

  const { data: admins = [] } = useQuery<
    Array<{ id: string; full_name?: string; email?: string }>
  >({
    queryKey: ["public-admin-authors"],
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/admin_users");
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : data.users || data.admins || [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["public-post", slug],
    queryFn: async () => {
      const res = await apiFetch("/api/posts");
      if (!res.ok) throw new Error("Failed to fetch posts");
      const all: Post[] = await res.json();
      const match = all.find((p) => p.slug === slug || p.id === slug);
      if (!match || match.status !== "published")
        throw new Error("Post not found");
      return match;
    },
  });

  // Scanner DOM Komprehensif H1 sampai H5 dengan pengaman Re-render
  useEffect(() => {
    if (isLoading || !post?.content) return;

    const syncLiveHeadings = () => {
      const contentContainer = document.getElementById("blog-main-content");
      if (!contentContainer) return;

      const headings = contentContainer.querySelectorAll(
        "h1, h2, h3, h4, h5, H1, H2, H3, H4, H5",
      );
      const tocItems: TocItem[] = [];

      headings.forEach((heading, index) => {
        const text = heading.textContent?.trim() || "";
        if (!text) return;

        let id = heading.getAttribute("id");
        if (!id) {
          id = text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-");

          if (!id) id = `heading-point-${index}`;
          heading.setAttribute("id", id);
        }

        const level =
          parseInt(heading.tagName.toUpperCase().replace("H", ""), 10) || 1;
        tocItems.push({ id, text, level });
      });

      setToc((prev) => {
        const isIdentical =
          prev.length === tocItems.length &&
          prev.every(
            (item, i) =>
              item.id === tocItems[i].id && item.text === tocItems[i].text,
          );
        return isIdentical ? prev : tocItems;
      });
    };

    const timer1 = setTimeout(syncLiveHeadings, 80);
    const timer2 = setTimeout(syncLiveHeadings, 450);

    const contentContainer = document.getElementById("blog-main-content");
    let observer: MutationObserver | null = null;
    if (contentContainer) {
      observer = new MutationObserver(syncLiveHeadings);
      observer.observe(contentContainer, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (observer) observer.disconnect();
    };
  }, [post?.content, isLoading, textSizeIndex]);

  // Click Outside Handler Dropdown ToC
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsTocDropdownOpen(false);
      }
    }
    if (isTocDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTocDropdownOpen]);

  // Scroll Monitor & Detektor Heading Aktif Berdasarkan Titik Koordinat Viewport
  useEffect(() => {
    const handleScroll = () => {
      if (anchorRef.current) {
        const anchorTop = anchorRef.current.getBoundingClientRect().top;
        setIsSticky(anchorTop <= 16);
      }

      if (toc.length === 0) return;

      const scrollPosition = window.scrollY + 140;

      for (let i = toc.length - 1; i >= 0; i--) {
        const el = document.getElementById(toc[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveId(toc[i].id);
          return;
        }
      }
      setActiveId("");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [toc]);

  // Reading Progress Bar Line
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(
        max > 0 ? Math.min(100, Math.max(0, (scrolled / max) * 100)) : 0,
      );
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const related = useMemo(() => {
    if (!post) return [];
    return allPosts
      .filter(
        (p) => p.id !== post.id && (p.category || "") === (post.category || ""),
      )
      .sort((a, b) => {
        const viewsA = (a.organic_views || 0) + (a.offset_views || 0);
        const viewsB = (b.organic_views || 0) + (b.offset_views || 0);
        return viewsB - viewsA;
      })
      .slice(0, 6);
  }, [post, allPosts]);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNativeShare = async () => {
    if (typeof window === "undefined" || !post) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          url: window.location.href,
        });
      } catch (err) {
        console.log(err);
      }
    } else {
      handleCopyLink();
    }
  };

  // Fungsi Lompat Ke Target Heading Secara Presisi
  const scrollToHeading = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    setIsTocDropdownOpen(false);

    const offset = 95;
    const targetPosition =
      target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top: targetPosition,
      behavior: "smooth",
    });
  };

  const handleIncreaseText = () => {
    if (textSizeIndex < TEXT_SIZE_STEPS.length - 1) {
      setTextSizeIndex((prev) => prev + 1);
    }
  };

  const handleDecreaseText = () => {
    if (textSizeIndex > 0) {
      setTextSizeIndex((prev) => prev - 1); // <--- Diubah menjadi berkurang (prev - 1)
    }
  };

  // PERBAIKAN UTAMA: Perhitungan skala khusus heading 1 - 5 yang responsif
  const proseTextClass = useMemo(() => {
    switch (currentTextSizeStep) {
      case "xs":
        return "prose-xs text-[13px] leading-relaxed [&_h1]:text-lg sm:[&_h1]:text-xl [&_h2]:text-base sm:[&_h2]:text-chart-2 [&_h3]:text-sm sm:[&_h3]:text-base [&_h4]:text-xs sm:[&_h4]:text-sm [&_h5]:text-[11px] sm:[&_h5]:text-xs";
      case "sm":
        return "prose-sm text-[14px] leading-relaxed [&_h1]:text-xl sm:[&_h1]:text-2xl [&_h2]:text-lg sm:[&_h2]:text-xl [&_h3]:text-base sm:[&_h3]:text-sm-h3 [&_h4]:text-sm sm:[&_h4]:text-base [&_h5]:text-xs sm:[&_h5]:text-sm";
      case "lg":
        return "prose-lg text-[17px] sm:text-[18px] leading-relaxed [&_h1]:text-3xl sm:[&_h1]:text-4xl [&_h2]:text-2xl sm:[&_h2]:text-3xl [&_h3]:text-xl sm:[&_h3]:text-2xl [&_h4]:text-lg sm:[&_h4]:text-xl [&_h5]:text-base sm:[&_h5]:text-lg";
      case "xl":
        return "prose-xl text-[19px] sm:text-[21px] leading-relaxed [&_h1]:text-4xl sm:[&_h1]:text-5xl [&_h2]:text-3xl sm:[&_h2]:text-4xl [&_h3]:text-2xl sm:[&_h3]:text-3xl [&_h4]:text-xl sm:[&_h4]:text-2xl [&_h5]:text-lg sm:[&_h5]:text-xl";
      case "2xl":
        return "prose-2xl text-[22px] sm:text-[25px] leading-loose [&_h1]:text-5xl sm:[&_h1]:text-6xl [&_h2]:text-4xl sm:[&_h2]:text-5xl [&_h3]:text-3xl sm:[&_h3]:text-4xl [&_h4]:text-2xl sm:[&_h4]:text-3xl [&_h5]:text-xl sm:[&_h5]:text-2xl";
      case "base":
      default:
        return "prose-base text-[15px] sm:text-[16px] leading-relaxed [&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h3]:text-lg sm:[&_h3]:text-xl [&_h4]:text-base sm:[&_h4]:text-lg [&_h5]:text-sm sm:[&_h5]:text-base";
    }
  }, [currentTextSizeStep]);

  return (
    <div className="min-h-[100dvh] bg-background pb-24 flex flex-col antialiased selection:bg-amber-500/30">
      <div
        role="progressbar"
        aria-label="Progres baca"
        aria-valuenow={Math.round(progress)}
        className="fixed top-0 left-0 right-0 h-[3px] z-[60] bg-neutral-950 pointer-events-none"
      >
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <header className="w-full pt-6 sm:pt-8 px-4 max-w-4xl mx-auto flex-1">
        <div className="mb-6">
          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-amber-500 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />{" "}
            Kembali ke beranda
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
            <div className="h-12 bg-neutral-900 w-full rounded-xl" />
            <div className="h-[350px] bg-neutral-900 w-full rounded-[2rem] mt-4" />
          </div>
        ) : !post ? (
          <div className="text-center py-24 border border-dashed border-emerald-950/30 rounded-3xl max-w-md mx-auto">
            <h2 className="font-display text-xl font-bold text-slate-200">
              Artikel Tidak Ditemukan
            </h2>
          </div>
        ) : (
          <div className="space-y-2">
            {/* HERO PANEL */}
            <div className="relative rounded-[2rem] p-6 sm:p-8 md:p-10 border border-emerald-950/20 bg-gradient-to-b from-neutral-900/40 via-neutral-950/60 to-neutral-950/90 shadow-xl overflow-hidden">
              {post.featured_image && (
                <figure className="mb-6 overflow-hidden rounded-[2rem] border border-emerald-950/10 shadow-md">
                  <ImageWithFallback
                    src={post.featured_image}
                    alt={post.title}
                    fallbackType="gradient"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 960px"
                    containerClassName="w-full aspect-[16/10] sm:aspect-[16/8]"
                    className="object-cover"
                  />
                </figure>
              )}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/[0.02] to-transparent pointer-events-none" />

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs mb-6 border-b border-emerald-950/20">
                {post.category && (
                  <span className="px-3 py-1 bg-amber-500 text-neutral-950 rounded-xl text-[10px] font-black uppercase tracking-wider">
                    {post.category}
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                  <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                  <time dateTime={post.published_at || ""}>
                    {formatDate(post.published_at)}
                  </time>
                </div>
                <span className="text-neutral-800 hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{readingTime(post.content)}</span>
                </div>
                <span className="text-neutral-800 hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {(
                      (post.organic_views || 0) + (post.offset_views || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-4 max-w-4xl">
                <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-100 leading-tight tracking-tight">
                  {post.title}
                </h1>
                {post.excerpt && (
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed border-l-2 border-emerald-800/40 pl-3">
                    {post.excerpt}
                  </p>
                )}
              </div>

              {(post.author_id || (post as any).author) && (
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-emerald-950/20">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black block leading-none mb-1">
                      Kontributor Isu
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      {(() => {
                        const authorId =
                          (post as any).author || post.author_id || "";
                        const match = admins.find((a) => a.id === authorId);
                        return (
                          match?.full_name ||
                          match?.email ||
                          authorId ||
                          "Anonim"
                        );
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ANTI-JUMPING LAYOUT BARRIER */}
            <div
              ref={anchorRef}
              className={`w-full transition-all duration-75 ${
                isSticky ? "h-[56px] mb-6" : "h-px"
              }`}
            />

            {/* PERBAIKAN UTAMA: Kondisional dihilangkan agar toolbar terus terlihat meskipun toc kosong */}
            <div
              ref={dropdownRef}
              className={`w-full z-50 transition-all duration-300 ${
                isSticky
                  ? "fixed top-4 left-0 right-0 max-w-4xl mx-auto px-4 drop-shadow-2xl animate-in fade-in slide-in-from-top-1"
                  : "relative mb-6"
              }`}
            >
              <div className="w-full h-[56px] rounded-2xl border border-neutral-900 bg-neutral-950/85 backdrop-blur-md px-2.5 flex items-center justify-between gap-4 shadow-xl">
                {/* Blok Menu Navigasi Berjenjang (H1 - H5) */}
                <div className="relative flex-1 min-w-0">
                  <button
                    onClick={() => setIsTocDropdownOpen((prev) => !prev)}
                    disabled={toc.length === 0}
                    className="w-full flex items-center justify-between gap-2 px-3 h-9 rounded-xl bg-neutral-900 border border-neutral-800 text-slate-200 text-xs font-bold transition-all hover:border-neutral-700 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <List className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">
                        {toc.length > 0
                          ? toc.find((t) => t.id === activeId)?.text ||
                            "Daftar Bahasan Artikel"
                          : "Tidak Ada Struktur Pembahasan"}
                      </span>
                    </div>
                    {toc.length > 0 && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isTocDropdownOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {/* Dropdown Items List */}
                  {isTocDropdownOpen && toc.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 z-20 max-h-[340px] overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-xl p-2 shadow-2xl space-y-0.5 scrollbar-hide animate-in zoom-in-95 duration-150">
                      {toc.map((item) => {
                        const isActive = activeId === item.id;

                        // MASTER ENGINE HIERARKI: Indentasi & Simbol Berjenjang Sesuai Level Heading (1-5)
                        let indentClass =
                          "pl-2 font-bold text-slate-100 text-[12.5px]"; // Default H1
                        let arrowPrefix = "";

                        if (item.level === 2) {
                          indentClass =
                            "pl-6 text-slate-300 text-[12px] font-semibold";
                          arrowPrefix = "↳ ";
                        } else if (item.level === 3) {
                          indentClass =
                            "pl-10 text-slate-400 text-[11.5px] font-medium";
                          arrowPrefix = "↳ ↳ ";
                        } else if (item.level === 4) {
                          indentClass = "pl-14 text-neutral-400 text-[11px]";
                          arrowPrefix = "↳ ↳ ↳ ";
                        } else if (item.level >= 5) {
                          indentClass =
                            "pl-[72px] text-neutral-500 text-[10.5px] italic";
                          arrowPrefix = "↳ ↳ ↳ ↳ ";
                        }

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              scrollToHeading(item.id);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors truncate block ${indentClass} ${
                              isActive
                                ? "bg-amber-500/10 text-amber-400 font-black border-l-2 border-amber-500 rounded-l-none"
                                : "hover:bg-neutral-900 hover:text-slate-200"
                            }`}
                          >
                            {arrowPrefix}
                            {item.text}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Blok Utilitas Font & Aksi Share */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-neutral-900 h-9 rounded-xl border border-neutral-800 px-1">
                    <button
                      onClick={handleDecreaseText}
                      disabled={textSizeIndex === 0}
                      className="px-2 text-slate-400 disabled:opacity-20 hover:text-slate-200 transition-colors"
                      title="Perkecil Font"
                    >
                      <AArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] font-mono text-amber-400 font-black uppercase px-1 text-center min-w-[32px]">
                      {currentTextSizeStep}
                    </span>
                    <button
                      onClick={handleIncreaseText}
                      disabled={textSizeIndex === TEXT_SIZE_STEPS.length - 1}
                      className="px-2 text-slate-400 disabled:opacity-20 hover:text-slate-200 transition-colors"
                      title="Perbesar Font"
                    >
                      <AArrowUp className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-px h-5 bg-neutral-800 mx-0.5" />

                  <button
                    onClick={handleCopyLink}
                    className="h-9 px-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-slate-200 text-xs font-bold transition-all hover:border-neutral-700"
                  >
                    {copied ? (
                      <div className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 hidden sm:inline">
                          Tersalin!
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Salin</span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={handleNativeShare}
                    className="p-2 h-9 w-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-slate-200 transition-all hover:border-neutral-700"
                  >
                    <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {/* KONTEN ARTIKEL UTAMA DENGAN FILTER OVERRIDE HEADING */}
            <div
              id="blog-main-content"
              className="max-w-4xl mx-auto px-0 sm:px-4"
            >
              <BlogContent
                html={post.content}
                className={`dropcap font-serif-body text-slate-300 prose max-w-none transition-all duration-150
                           ${proseTextClass}
                           prose-headings:font-display prose-headings:font-bold prose-headings:text-slate-100
                           prose-p:text-slate-300
                           prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
                           prose-img:rounded-2xl prose-img:shadow-md
                           [&_p]:my-5
                           [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:font-black border-b border-emerald-950/10 pb-2
                           [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:font-bold border-b border-emerald-950/5 pb-1
                           [&_h3]:mt-6 [&_h3]:mb-3
                           [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:font-semibold
                           [&_h5]:mt-4 [&_h5]:mb-2 [&_h5]:font-medium text-slate-400
                           [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:bg-neutral-950 [&_blockquote]:py-3 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:rounded-r-xl
                           [&_pre]:my-6 [&_pre]:bg-neutral-950 [&_pre]:p-4 [&_pre]:rounded-xl
                           [&_code]:bg-neutral-900 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-amber-400 [&_code]:font-mono`}
              />
            </div>

            <div className="text-center pt-8 pb-4">
              <span className="inline-block w-1.5 h-1.5 bg-amber-500 rotate-45 rounded-sm shadow-sm" />
            </div>

            {/* REKOMENDASI ARTIKEL */}
            {related.length > 0 && (
              <aside
                className="pt-10 border-t border-emerald-950/20"
                aria-label="Saran postingan terkait"
              >
                <div className="flex items-center justify-between gap-4 mb-6 px-1">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-200 uppercase tracking-widest">
                    <ArrowRight className="w-4 h-4 text-amber-500" /> Eksplorasi
                    Terkait
                  </div>
                  <Link
                    href="/blog"
                    className="text-amber-500 text-[11px] font-bold uppercase tracking-widest hover:text-amber-400"
                  >
                    Semua Berita
                  </Link>
                </div>

                <Carousel
                  opts={{ align: "start", loop: false, dragFree: true }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4 pb-2">
                    {related.map((rp) => (
                      <CarouselItem
                        key={rp.id}
                        className="pl-4 basis-[70%] sm:basis-[45%] md:basis-[33.33%]"
                      >
                        <Link
                          href={`/blog/${rp.slug || rp.id}`}
                          className="group flex flex-col bg-neutral-950 border border-neutral-900/60 p-3 rounded-2xl h-full transition-all hover:border-emerald-800/40 shadow-sm"
                        >
                          {/* PERBAIKAN UTAMA: containerClassName dipasang langsung ke ImageWithFallback untuk mengunci aspek rasio fill layout */}
                          <ImageWithFallback
                            src={rp.featured_image || null}
                            alt={rp.title}
                            fallbackType="gradient"
                            fill
                            sizes="(max-width: 640px) 240px, 320px"
                            containerClassName="relative w-full aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-neutral-900"
                            className="transition-transform duration-500 group-hover:scale-103 object-cover"
                          />

                          <div className="flex items-center gap-2 mb-1.5">
                            {rp.category && (
                              <span className="text-[9px] uppercase tracking-wider font-black text-amber-500">
                                {rp.category}
                              </span>
                            )}
                            <span className="text-neutral-800 text-[9px]">
                              •
                            </span>
                            <div className="flex items-center text-[9px] font-semibold text-muted-foreground">
                              <Eye className="w-2.5 h-2.5 mr-1 text-emerald-600" />{" "}
                              {(
                                (rp.organic_views || 0) + (rp.offset_views || 0)
                              ).toLocaleString()}
                            </div>
                          </div>

                          <h3 className="font-display text-xs sm:text-sm font-bold text-slate-100 leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors">
                            {rp.title}
                          </h3>
                        </Link>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </aside>
            )}
          </div>
        )}
      </header>
    </div>
  );
}
