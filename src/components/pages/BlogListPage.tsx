"use client";

import React from "react";
import { BlogPostsAPI } from "@/hooks/queries";
import type { Post } from "../../lib/types";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  LayoutGrid,
  Flame,
  Star,
  TrendingUp,
} from "lucide-react";
import { CategoryChips } from "@/components/ui/CategoryChips";
import { SmartSearchBar, type SortKey } from "@/components/ui/SmartSearchBar";
import { SimplePagination } from "@/components/ui/SimplePagination";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

function formatDate(d?: string | null) {
  return d
    ? new Date(d).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";
}

const PAGE_SIZE = 9;

export function BlogListPage() {
  const { data: rawPosts = [], isLoading } = BlogPostsAPI.useList();
  const posts: Post[] = React.useMemo(
    () => (rawPosts as Post[]).filter((p) => p.status === "published"),
    [rawPosts],
  );

  // Discovery state
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [activeCat, setActiveCat] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [search, sort, activeCat]);

  // Categories
  const categoryCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => {
      const cat = (p.category || "Umum").trim();
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  // Filter + sort
  const filtered = React.useMemo(() => {
    let list = [...posts];
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
  }, [posts, activeCat, search, sort]);

  const isFiltering = !!search.trim() || !!activeCat || sort !== "newest";

  // Front-page sections setup
  const popular = [...posts]
    .sort((a, b) => ((b as any).views || 0) - ((a as any).views || 0))
    .slice(0, 5);

  // Paginated grid
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const verticalList = filtered;
  const pageItems = verticalList.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="min-h-[100dvh] bg-background pb-20 flex flex-col">
      {/* 1. Header (Not Sticky) */}
      <header className="pt-4 pb-8 px-4 max-w-4xl mx-auto w-full flex flex-col items-center text-center">
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-black text-foreground tracking-tighter leading-[0.9]">
          PPMH <span className="italic font-normal text-primary">Insight</span>
        </h1>
        <div className="mt-10 max-w-2xl w-full">
          <SmartSearchBar
            value={search}
            onChange={setSearch}
            sort={sort}
            onSortChange={setSort}
            resultCount={isFiltering ? filtered.length : undefined}
            className="mb-6"
          />
          {categoryCounts.length > 0 && (
            <div className="overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              <CategoryChips
                categories={categoryCounts}
                activeName={activeCat}
                onSelect={setActiveCat}
                className="flex-nowrap justify-start sm:justify-center"
              />
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full pb-12 pt-2">
        {isLoading ? (
          <div className="px-4 space-y-6">
            <div className="h-[250px] bg-muted/40 animate-pulse rounded-2xl" />
            <div className="flex gap-4 overflow-hidden">
              <div className="min-w-[240px] h-32 bg-muted/40 animate-pulse rounded-xl" />
              <div className="min-w-[240px] h-32 bg-muted/40 animate-pulse rounded-xl" />
            </div>
            <div className="space-y-4 pt-6">
              <div className="h-24 bg-muted/40 animate-pulse rounded-xl" />
              <div className="h-24 bg-muted/40 animate-pulse rounded-xl" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-24 text-center text-muted-foreground">
            <p className="font-serif-body italic">
              Belum ada artikel yang cocok.
            </p>
          </div>
        ) : (
          <>
            {/* 3. Horizontal Scroll List (Popular/Featured) */}
            {!isFiltering && popular.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-5 uppercase tracking-widest ">
                  <Flame className="w-4 h-4 text-primary" /> Populer Saat Ini
                </div>
                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 gap-5 pb-4">
                  {popular.map((post) => (
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
                        containerClassName="w-full aspect-[16/10] sm:aspect-video rounded-xl overflow-hidden mb-4 shadow-sm"
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
                          <TrendingUp className="w-3 h-3 mr-1" />{" "}
                          {(post.organic_views || 0) + (post.offset_views || 0)}{" "}
                          views
                        </div>
                      </div>
                      <h3 className="font-display text-xs md:text-lg font-bold text-foreground leading-snug line-clamp-2 md:line-clamp-3 group-hover:text-primary transition-colors text-pretty">
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
              </section>
            )}

            {/* 4. Vertical List View (Daftar Artikel Bawah) */}
            <section className="px-1">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-2 uppercase tracking-widest border-b border-border/50 pb-3">
                <Star className="w-4 h-4 text-primary" />
                {isFiltering ? "Hasil Pencarian" : "Artikel Terbaru"}
              </div>

              <div className="flex flex-col">
                {pageItems.map((post, i) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug || post.id}`}
                    className={`flex items-center sm:items-start gap-4 sm:gap-6 group py-2 sm:py-4 ${i !== pageItems.length - 1 ? "border-b border-border/40" : ""}`}
                  >
                    <ImageWithFallback
                      src={post.featured_image || null}
                      alt={post.title}
                      fallbackType="gradient"
                      fill
                      sizes="160px"
                      containerClassName="w-24 h-24 sm:w-40 sm:h-32 shrink-0 rounded-xl overflow-hidden shadow-sm self-center sm:self-start"
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
                          <time>{formatDate(post.published_at)}</time>
                        </div>
                      </div>
                      <h3 className="font-display text-xs sm:text-xl font-bold text-foreground leading-snug line-clamp-2 sm:line-clamp-3 group-hover:text-primary transition-colors text-pretty">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="mt-2 text-xs sm:text-base text-muted-foreground line-clamp-2 leading-relaxed sm:block">
                          {post.excerpt}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-12">
                <SimplePagination
                  page={currentPage}
                  totalPages={totalPages}
                  onChange={(p) => {
                    setPage(p);
                    if (typeof window !== "undefined") {
                      window.scrollTo({ top: 320, behavior: "smooth" });
                    }
                  }}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
